/**
 * Kickoffs, punts, and change-of-possession spots.
 *
 * All yardage here is whole yards. `seconds` on each result is the game-clock
 * time the play took; rules/clock.ts applies it.
 */

import { FIELD_LENGTH, END_ZONE_DEPTH, fromOffenseYards, otherSide, toFieldPoint, toOffenseYards } from '../field';
import type { FieldPoint, Side } from '../field';
import type { Rng } from '../rng';
import type { EngineRatings, EngineState, PlayEvent } from '../types';
import { newSeries } from './downs';
import { scoreTouchdown } from './scoring';
import type { Kicker, RuleResult } from './scoring';

export const KICKOFF_TOUCHBACK_OFFENSE_YARDS = 25;
export const TOUCHBACK_OFFENSE_YARDS = 20;

export type Returner = Pick<EngineRatings, 'speed' | 'elusiveness'> & { id?: string };

/** Used when a roster has nobody suitable to return kicks */
export const DEFAULT_RETURNER: Returner = { speed: 70, elusiveness: 70 };

export type KickOutcome =
  | 'Touchback'
  | 'Return'
  | 'ReturnTouchdown'
  | 'FairCatch'
  | 'Downed'
  | 'OnsideRecovered'
  | 'OnsideFailed';

export interface KickPlayResult extends RuleResult {
  outcome: KickOutcome;
  /** Yards the ball travelled in the air from the kick spot */
  kickYards: number;
  returnYards: number;
  seconds: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Give `side` the ball, 1st & 10 at `offenseYards` from its own goal line */
function takeOver(state: EngineState, side: Side, offenseYards: number): EngineState {
  return {
    ...state,
    ...newSeries(side, fromOffenseYards(clamp(offenseYards, 1, FIELD_LENGTH - 1), side)),
    phase: 'Scrimmage',
    drive: state.drive + 1,
    clockRunning: false,
  };
}

/** Field point on the kicking team's axis, `offenseYards` from its own goal line, at midfield width */
function spotFor(side: Side, offenseYards: number): FieldPoint {
  return toFieldPoint({ x: 0, y: 0 }, fromOffenseYards(offenseYards, side), side);
}

function returnYardage(returner: Returner, rng: Rng, mean: number, sd: number, breakawayChance: number): number {
  const skill = (returner.speed - 75) * 0.12 + (returner.elusiveness - 75) * 0.08;
  let yards = Math.round(rng.normal(mean + skill, sd));
  // Always roll so the draw count does not depend on ratings
  const brokeFree = rng.chance(breakawayChance + skill * 0.002);
  const extra = rng.int(20, 80);
  if (brokeFree) {
    yards += extra;
  }
  return yards;
}

// ====================
// KICKOFF
// ====================

/**
 * Kickoff (or free kick) from state.yardLine by state.possession.
 * Distances below are measured from the KICKING team's goal line.
 */
export function resolveKickoff(
  state: EngineState,
  kicker: Kicker,
  returner: Returner,
  rng: Rng,
  onside: boolean = false,
): KickPlayResult {
  const kicking = state.possession;
  const receiving = otherSide(kicking);
  const spot = toOffenseYards(state.yardLine, kicking);

  if (onside) {
    return resolveOnsideKick(state, kicker, rng);
  }

  const kickYards = clamp(Math.round(rng.normal(63 + (kicker.kickPower - 75) * 0.3, 5)), 40, 80);
  const landing = spot + kickYards;
  const depthInEndZone = landing - FIELD_LENGTH;
  const kickEvent: PlayEvent = {
    type: 'Kick',
    t: 0,
    from: spotFor(kicking, spot),
    to: spotFor(kicking, Math.min(landing, FIELD_LENGTH + END_ZONE_DEPTH)),
    kickerId: kicker.id,
    kick: 'Kickoff',
  };

  // Rolled unconditionally to keep the draw sequence fixed
  const kneelsInEndZone = rng.chance(depthInEndZone >= 5 ? 0.85 : 0.55);
  const returnYards = returnYardage(returner, rng, 24, 8, 0.025);

  if (depthInEndZone >= END_ZONE_DEPTH || (depthInEndZone >= 0 && kneelsInEndZone)) {
    return {
      outcome: 'Touchback',
      kickYards,
      returnYards: 0,
      seconds: 0,
      state: takeOver(state, receiving, KICKOFF_TOUCHBACK_OFFENSE_YARDS),
      events: [kickEvent, { type: 'Touchback', t: 4 }],
    };
  }

  // Receiving team's yards from its own goal line; negative = caught in its end zone
  const catchSpot = FIELD_LENGTH - landing;
  const finalSpot = catchSpot + Math.max(0, returnYards);
  const seconds = 5 + Math.round(Math.max(0, returnYards) / 8);
  const returnEvent: PlayEvent = {
    type: 'Return',
    t: 4,
    from: spotFor(receiving, catchSpot),
    to: spotFor(receiving, Math.min(finalSpot, FIELD_LENGTH)),
    returnerId: returner.id ?? 'returner',
  };

  if (finalSpot >= FIELD_LENGTH) {
    const touchdown = scoreTouchdown(state, receiving, 4 + seconds, returner.id);
    return {
      outcome: 'ReturnTouchdown',
      kickYards,
      returnYards: FIELD_LENGTH - catchSpot,
      seconds,
      state: { ...touchdown.state, drive: state.drive + 1 },
      events: [kickEvent, returnEvent, ...touchdown.events],
    };
  }

  if (finalSpot <= 0) {
    // Fielded in the end zone and never got out: downed for a touchback
    return {
      outcome: 'Touchback',
      kickYards,
      returnYards: 0,
      seconds: 0,
      state: takeOver(state, receiving, KICKOFF_TOUCHBACK_OFFENSE_YARDS),
      events: [kickEvent, { type: 'Touchback', t: 4 }],
    };
  }

  return {
    outcome: 'Return',
    kickYards,
    returnYards: finalSpot - catchSpot,
    seconds,
    state: takeOver(state, receiving, finalSpot),
    events: [kickEvent, returnEvent],
  };
}

function resolveOnsideKick(state: EngineState, kicker: Kicker, rng: Rng): KickPlayResult {
  const kicking = state.possession;
  const receiving = otherSide(kicking);
  const spot = toOffenseYards(state.yardLine, kicking);
  const kickYards = rng.int(10, 14);
  const recovered = rng.chance(0.1 + (kicker.kickAccuracy - 75) * 0.001);
  const deadBall = spot + kickYards;
  const kickEvent: PlayEvent = {
    type: 'Kick',
    t: 0,
    from: spotFor(kicking, spot),
    to: spotFor(kicking, deadBall),
    kickerId: kicker.id,
    kick: 'Onside',
  };
  return {
    outcome: recovered ? 'OnsideRecovered' : 'OnsideFailed',
    kickYards,
    returnYards: 0,
    seconds: 3,
    state: recovered ? takeOver(state, kicking, deadBall) : takeOver(state, receiving, FIELD_LENGTH - deadBall),
    events: [kickEvent],
  };
}

// ====================
// PUNT
// ====================

/** Punt from the line of scrimmage by state.possession */
export function resolvePunt(state: EngineState, punter: Kicker, returner: Returner, rng: Rng): KickPlayResult {
  const kicking = state.possession;
  const receiving = otherSide(kicking);
  const los = toOffenseYards(state.yardLine, kicking);

  const rawYards = clamp(Math.round(rng.normal(46 + (punter.kickPower - 75) * 0.25, 6)), 20, 72);
  // Fixed draw order regardless of branch
  const pinned = rng.chance(0.4 + (punter.kickAccuracy - 75) * 0.01);
  const pinSpot = rng.int(3, 12);
  const handling = rng.weighted([
    ['FairCatch', 45],
    ['Return', 40],
    ['Downed', 15],
  ] as const);
  const rolledReturn = returnYardage(returner, rng, 9, 6, 0.015);

  let landing = los + rawYards;
  let touchback = false;
  if (landing >= FIELD_LENGTH) {
    if (pinned) {
      // Punter takes something off it and drops it inside the 12
      landing = Math.min(FIELD_LENGTH - 1, Math.max(FIELD_LENGTH - pinSpot, los + 1));
    } else {
      touchback = true;
    }
  }
  const kickYards = Math.min(landing, FIELD_LENGTH) - los;
  const kickEvent: PlayEvent = {
    type: 'Kick',
    t: 0,
    from: spotFor(kicking, Math.max(los - 14, 1 - END_ZONE_DEPTH)),
    to: spotFor(kicking, Math.min(landing, FIELD_LENGTH + 5)),
    kickerId: punter.id,
    kick: 'Punt',
  };

  if (touchback) {
    return {
      outcome: 'Touchback',
      kickYards,
      returnYards: 0,
      seconds: 6,
      state: takeOver(state, receiving, TOUCHBACK_OFFENSE_YARDS),
      events: [kickEvent, { type: 'Touchback', t: 5 }],
    };
  }

  const catchSpot = FIELD_LENGTH - landing;
  // Nobody returns a punt fielded inside their own 8
  const outcome = handling === 'Return' && catchSpot < 8 ? 'FairCatch' : handling;

  if (outcome !== 'Return') {
    return {
      outcome,
      kickYards,
      returnYards: 0,
      seconds: 6,
      state: takeOver(state, receiving, catchSpot),
      events: [kickEvent],
    };
  }

  const returnYards = Math.max(-3, rolledReturn);
  const finalSpot = catchSpot + returnYards;
  const seconds = 7 + Math.round(Math.max(0, returnYards) / 8);
  const returnEvent: PlayEvent = {
    type: 'Return',
    t: 5,
    from: spotFor(receiving, catchSpot),
    to: spotFor(receiving, clamp(finalSpot, 1, FIELD_LENGTH)),
    returnerId: returner.id ?? 'returner',
  };

  if (finalSpot >= FIELD_LENGTH) {
    const touchdown = scoreTouchdown(state, receiving, 5 + seconds, returner.id);
    return {
      outcome: 'ReturnTouchdown',
      kickYards,
      returnYards: FIELD_LENGTH - catchSpot,
      seconds,
      state: { ...touchdown.state, drive: state.drive + 1 },
      events: [kickEvent, returnEvent, ...touchdown.events],
    };
  }

  return {
    outcome: 'Return',
    kickYards,
    returnYards: clamp(finalSpot, 1, FIELD_LENGTH - 1) - catchSpot,
    seconds,
    state: takeOver(state, receiving, finalSpot),
    events: [kickEvent, returnEvent],
  };
}

// ====================
// TURNOVERS
// ====================

export interface TurnoverResult extends RuleResult {
  outcome: 'Takeover' | 'Touchback' | 'ReturnTouchdown';
  returnYards: number;
}

/**
 * Interception or lost fumble: the defense gains possession at `recoveryYardLine`
 * (absolute yard line; may be beyond a goal line for a ball caught in the end
 * zone) and returns it `returnYards`.
 */
export function resolveTurnover(
  state: EngineState,
  recoveryYardLine: number,
  returnYards: number,
  t: number,
  returnerId?: string,
): TurnoverResult {
  const newOffense = otherSide(state.possession);
  const recoverySpot = toOffenseYards(recoveryYardLine, newOffense);
  const finalSpot = recoverySpot + returnYards;

  if (finalSpot >= FIELD_LENGTH) {
    const touchdown = scoreTouchdown(state, newOffense, t, returnerId);
    return {
      outcome: 'ReturnTouchdown',
      returnYards: FIELD_LENGTH - recoverySpot,
      state: { ...touchdown.state, drive: state.drive + 1 },
      events: touchdown.events,
    };
  }

  if (recoverySpot <= 0 && finalSpot <= 0) {
    // Taken in its own end zone and downed there
    return {
      outcome: 'Touchback',
      returnYards: 0,
      state: takeOver(state, newOffense, TOUCHBACK_OFFENSE_YARDS),
      events: [{ type: 'Touchback', t }],
    };
  }

  return {
    outcome: 'Takeover',
    returnYards: clamp(finalSpot, 1, FIELD_LENGTH - 1) - recoverySpot,
    state: takeOver(state, newOffense, finalSpot),
    events: [],
  };
}
