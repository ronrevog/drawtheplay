/**
 * Downs and distance.
 *
 * Pure functions: given the situation before the snap and where the ball ended
 * up, say what the next situation is. Scoring (what a touchdown or safety is
 * worth, and what happens next) lives in rules/scoring.ts.
 */

import {
  advanceBall,
  firstDownDistance,
  otherSide,
  spotResult,
  toOffenseYards,
  yardsToGoal,
} from '../field';
import type { Side } from '../field';
import type { Down, EngineState } from '../types';

/** The part of the state that downs logic reads and writes */
export type Situation = Pick<EngineState, 'possession' | 'yardLine' | 'down' | 'distance'>;

export type DownsResult =
  /** Ball crossed the opponent's goal line */
  | { kind: 'Touchdown'; yards: number }
  /** Ball carrier down in (or ball dead in) the offense's own end zone */
  | { kind: 'Safety'; yards: number }
  | { kind: 'FirstDown'; yards: number; next: Situation }
  | { kind: 'NextDown'; yards: number; next: Situation }
  | { kind: 'TurnoverOnDowns'; yards: number; next: Situation };

/** 1st & 10 (or & goal) for `possession` at `yardLine` */
export function newSeries(possession: Side, yardLine: number): Situation {
  return {
    possession,
    yardLine,
    down: 1,
    distance: firstDownDistance(yardLine, possession),
  };
}

/**
 * Resolve a scrimmage play that ended with the offense still in possession,
 * `yardsGained` from the previous spot (negative for a loss, 0 for an
 * incompletion). Turnovers and kicks do not go through here; they start a
 * new series directly with newSeries().
 */
export function resolveDowns(before: Situation, yardsGained: number): DownsResult {
  const { possession, yardLine, down, distance } = before;
  const spot = advanceBall(yardLine, possession, yardsGained);

  switch (spotResult(spot, possession)) {
    case 'Touchdown':
      // Credit only the yards that were available
      return { kind: 'Touchdown', yards: yardsToGoal(yardLine, possession) };
    case 'OwnEndZone':
      return { kind: 'Safety', yards: -toOffenseYards(yardLine, possession) };
    case 'InPlay':
      break;
  }

  if (yardsGained >= distance) {
    return { kind: 'FirstDown', yards: yardsGained, next: newSeries(possession, spot) };
  }

  if (down === 4) {
    // Defense takes over at the dead-ball spot
    return { kind: 'TurnoverOnDowns', yards: yardsGained, next: newSeries(otherSide(possession), spot) };
  }

  return {
    kind: 'NextDown',
    yards: yardsGained,
    next: {
      possession,
      yardLine: spot,
      down: (down + 1) as Down,
      distance: distance - yardsGained,
    },
  };
}
