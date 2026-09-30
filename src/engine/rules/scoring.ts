/**
 * Scoring: touchdowns, tries (extra point / two-point), field goals, safeties,
 * and the kickoff each of them leads to.
 *
 * Clock and overtime rules are applied on top of these in rules/clock.ts.
 */

import {
  END_ZONE_DEPTH,
  FIELD_LENGTH,
  fieldGoalDistance,
  fromOffenseYards,
  otherSide,
  toFieldPoint,
  toOffenseYards,
} from '../field';
import type { Side } from '../field';
import type { Rng } from '../rng';
import { KICKOFF_SPOT_OFFENSE_YARDS } from '../state';
import type { EngineRatings, EngineState, PlayEvent } from '../types';
import { newSeries } from './downs';

export const POINTS = {
  Touchdown: 6,
  ExtraPoint: 1,
  TwoPoint: 2,
  FieldGoal: 3,
  Safety: 2,
} as const;

/** Two-point tries snap from the 2 */
export const TWO_POINT_SPOT_YARDS_TO_GOAL = 2;
/** Extra points snap from the 15 -> a 33-yard kick */
export const EXTRA_POINT_DISTANCE = 33;
/** Free kick after a safety comes from the kicking team's own 20 */
export const SAFETY_KICK_SPOT_OFFENSE_YARDS = 20;
/** Holder sets up this far behind the line of scrimmage */
export const KICK_SPOT_DEPTH = 8;
/** A missed field goal from inside the 20 comes out to the 20 */
const MISSED_FG_MIN_OFFENSE_YARDS = 20;

export interface RuleResult {
  state: EngineState;
  events: PlayEvent[];
}

export type Kicker = Pick<EngineRatings, 'kickPower' | 'kickAccuracy'> & { id?: string };

/** Used when a roster has no kicker */
export const DEFAULT_KICKER: Kicker = { kickPower: 60, kickAccuracy: 60 };

export function addPoints(state: EngineState, side: Side, points: number): EngineState {
  return { ...state, score: { ...state.score, [side]: state.score[side] + points } };
}

/** Put the ball on the tee for `kickingSide` */
export function toKickoff(
  state: EngineState,
  kickingSide: Side,
  spotOffenseYards: number = KICKOFF_SPOT_OFFENSE_YARDS,
): EngineState {
  return {
    ...state,
    phase: 'Kickoff',
    possession: kickingSide,
    yardLine: fromOffenseYards(spotOffenseYards, kickingSide),
    down: 1,
    distance: 10,
    clockRunning: false,
  };
}

// ====================
// TOUCHDOWN + TRY
// ====================

/** Six points, then the scoring team lines up for the try */
export function scoreTouchdown(state: EngineState, side: Side, t: number, scorerId?: string): RuleResult {
  const scored = addPoints(state, side, POINTS.Touchdown);
  return {
    state: {
      ...scored,
      phase: 'PAT',
      possession: side,
      yardLine: fromOffenseYards(FIELD_LENGTH - TWO_POINT_SPOT_YARDS_TO_GOAL, side),
      down: 1,
      distance: TWO_POINT_SPOT_YARDS_TO_GOAL,
      clockRunning: false,
    },
    events: [{ type: 'Touchdown', t, side, scorerId }],
  };
}

export function resolveExtraPoint(state: EngineState, kicker: Kicker, rng: Rng): RuleResult & { good: boolean } {
  const side = state.possession;
  const good = rng.chance(fieldGoalProbability(EXTRA_POINT_DISTANCE, kicker));
  const after = good ? addPoints(state, side, POINTS.ExtraPoint) : state;
  return {
    good,
    state: toKickoff(after, side),
    events: kickEvents(side, 'ExtraPoint', EXTRA_POINT_DISTANCE, good, kicker.id),
  };
}

/** `good` comes from resolving the two-point play like any other snap */
export function resolveTwoPoint(state: EngineState, good: boolean, t: number): RuleResult {
  const side = state.possession;
  const after = good ? addPoints(state, side, POINTS.TwoPoint) : state;
  return {
    state: toKickoff(after, side),
    events: [{ type: 'TwoPointResult', t, side, good }],
  };
}

// ====================
// FIELD GOALS
// ====================

// Make rate by kick distance for a league-average (75/75) kicker
const FG_CURVE: readonly (readonly [number, number])[] = [
  [18, 0.99],
  [30, 0.97],
  [40, 0.9],
  [45, 0.82],
  [50, 0.72],
  [55, 0.55],
  [60, 0.32],
  [65, 0.12],
  [70, 0.02],
  [75, 0],
];

function interpolate(curve: readonly (readonly [number, number])[], x: number): number {
  if (x <= curve[0][0]) {
    return curve[0][1];
  }
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i];
    if (x <= x1) {
      const [x0, y0] = curve[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return curve[curve.length - 1][1];
}

/**
 * Chance a kick of `distance` yards is good.
 * Leg strength makes long kicks play shorter (4 rating points = 1 yard);
 * accuracy scales the miss rate (99 acc misses ~30% less, 50 acc ~30% more).
 */
export function fieldGoalProbability(distance: number, kicker: Kicker): number {
  const effectiveDistance = distance - (kicker.kickPower - 75) * 0.25;
  const base = interpolate(FG_CURVE, effectiveDistance);
  if (base <= 0) {
    return 0;
  }
  const missRate = (1 - base) * (1 - ((kicker.kickAccuracy - 75) / 100) * 1.2);
  return Math.min(0.995, Math.max(0, 1 - missRate));
}

/**
 * Field goal attempt from the current line of scrimmage.
 * Good: 3 points and the scoring team kicks off.
 * Missed: defense takes over at the spot of the kick, or its own 20 if the
 * kick came from closer than that.
 */
export function attemptFieldGoal(
  state: EngineState,
  kicker: Kicker,
  rng: Rng,
): RuleResult & { good: boolean; distance: number } {
  const side = state.possession;
  const distance = fieldGoalDistance(state.yardLine, side);
  const good = rng.chance(fieldGoalProbability(distance, kicker));
  const events = kickEvents(side, 'FieldGoal', distance, good, kicker.id);

  if (good) {
    return { good, distance, events, state: toKickoff(addPoints(state, side, POINTS.FieldGoal), side) };
  }

  const defense = otherSide(side);
  const kickSpot = fromOffenseYards(toOffenseYards(state.yardLine, side) - KICK_SPOT_DEPTH, side);
  const takeoverOffenseYards = Math.max(MISSED_FG_MIN_OFFENSE_YARDS, toOffenseYards(kickSpot, defense));
  return {
    good,
    distance,
    events,
    state: {
      ...state,
      ...newSeries(defense, fromOffenseYards(takeoverOffenseYards, defense)),
      phase: 'Scrimmage',
      drive: state.drive + 1,
      clockRunning: false,
    },
  };
}

function kickEvents(
  side: Side,
  kick: 'FieldGoal' | 'ExtraPoint',
  distance: number,
  good: boolean,
  kickerId?: string,
): PlayEvent[] {
  // The uprights sit on the back line of the end zone, 110 yards from the
  // kicking team's own goal line, so the holder is `distance` short of that.
  const holderYardLine = fromOffenseYards(FIELD_LENGTH + END_ZONE_DEPTH - distance, side);
  const from = toFieldPoint({ x: 0, y: 0 }, holderYardLine, side);
  // A miss drifts wide; which side is cosmetic, so it is derived rather than rolled
  const wide = good ? 0 : distance % 2 === 0 ? 6 : -6;
  const to = toFieldPoint({ x: wide, y: distance }, holderYardLine, side);
  return [
    { type: 'Kick', t: 0, from, to, kickerId, kick },
    { type: 'KickResult', t: 2, kick, good, distance },
  ];
}

// ====================
// SAFETY
// ====================

/**
 * `concedingSide` was downed in its own end zone: two points to the other
 * team, then the conceding team free-kicks from its own 20.
 */
export function scoreSafety(state: EngineState, concedingSide: Side, t: number): RuleResult {
  const scoringSide = otherSide(concedingSide);
  return {
    state: toKickoff(addPoints(state, scoringSide, POINTS.Safety), concedingSide, SAFETY_KICK_SPOT_OFFENSE_YARDS),
    events: [{ type: 'Safety', t, side: scoringSide }],
  };
}
