/**
 * Field coordinates.
 *
 * ONE convention for ball position everywhere in the engine:
 *
 *   yardLine = yards from the HOME team's goal line, 0..100.
 *   0   = home goal line (home defends it)
 *   100 = away goal line (away defends it)
 *
 * Home offense drives toward 100, away offense drives toward 0. Anything
 * "from the offense's point of view" (own 25, yards to go, OPP 35) is derived
 * with the helpers below, never stored.
 */

export type Side = 'home' | 'away';

export const FIELD_LENGTH = 100;
/** 160 feet */
export const FIELD_WIDTH = 160 / 3;
export const END_ZONE_DEPTH = 10;
export const RED_ZONE_YARDS = 20;

/** Absolute spot on the field. y can run -10..110 to cover both end zones. */
export interface FieldPoint {
  /** Yards from the left sideline as seen by the HOME offense, 0..FIELD_WIDTH */
  x: number;
  /** Same axis as yardLine */
  y: number;
}

/**
 * Spot relative to the ball, from the OFFENSE's point of view. This is the
 * space plays are drawn in.
 */
export interface RelPoint {
  /** Lateral yards from the ball: negative = offense's left, positive = right */
  x: number;
  /** Yards downfield from the line of scrimmage: negative = backfield */
  y: number;
}

export type SpotResult = 'InPlay' | 'Touchdown' | 'OwnEndZone';

export function otherSide(side: Side): Side {
  return side === 'home' ? 'away' : 'home';
}

/** +1 when the offense drives toward yardLine 100, -1 toward 0 */
export function driveDirection(possession: Side): 1 | -1 {
  return possession === 'home' ? 1 : -1;
}

/** Yards from the offense's own goal line (own 25 -> 25, OPP 35 -> 65) */
export function toOffenseYards(yardLine: number, possession: Side): number {
  return possession === 'home' ? yardLine : FIELD_LENGTH - yardLine;
}

/** Inverse of toOffenseYards */
export function fromOffenseYards(offenseYards: number, possession: Side): number {
  return possession === 'home' ? offenseYards : FIELD_LENGTH - offenseYards;
}

/** Yards the offense needs for a touchdown */
export function yardsToGoal(yardLine: number, possession: Side): number {
  return FIELD_LENGTH - toOffenseYards(yardLine, possession);
}

/**
 * Move the ball `yards` in the offense's direction (negative = loss).
 * Not clamped: a result past a goal line is how touchdowns and safeties are
 * detected, see spotResult.
 */
export function advanceBall(yardLine: number, possession: Side, yards: number): number {
  return yardLine + driveDirection(possession) * yards;
}

/** What a dead-ball spot means for the team in possession */
export function spotResult(yardLine: number, possession: Side): SpotResult {
  const offenseYards = toOffenseYards(yardLine, possession);
  if (offenseYards >= FIELD_LENGTH) {
    return 'Touchdown';
  }
  if (offenseYards <= 0) {
    return 'OwnEndZone';
  }
  return 'InPlay';
}

/** Clamp a spot to the field of play (1..99) */
export function clampToField(yardLine: number): number {
  return Math.min(FIELD_LENGTH - 1, Math.max(1, yardLine));
}

/** Yard line the offense must reach for a first down (the goal line when goal-to-go) */
export function lineToGain(yardLine: number, possession: Side, distance: number): number {
  const target = toOffenseYards(yardLine, possession) + distance;
  return fromOffenseYards(Math.min(FIELD_LENGTH, target), possession);
}

/** Distance for a new first down at this spot: 10, or less when inside the 10 */
export function firstDownDistance(yardLine: number, possession: Side): number {
  return Math.min(10, yardsToGoal(yardLine, possession));
}

export function isGoalToGo(yardLine: number, possession: Side, distance: number): boolean {
  return distance >= yardsToGoal(yardLine, possession);
}

export function isRedZone(yardLine: number, possession: Side): boolean {
  return yardsToGoal(yardLine, possession) <= RED_ZONE_YARDS;
}

/** Kick distance for a field goal from this spot: line of scrimmage + 18 */
export function fieldGoalDistance(yardLine: number, possession: Side): number {
  return yardsToGoal(yardLine, possession) + 18;
}

/** "OWN 25", "OPP 35", "50" */
export function formatYardLine(yardLine: number, possession: Side): string {
  const offenseYards = toOffenseYards(yardLine, possession);
  if (offenseYards === 50) {
    return '50';
  }
  return offenseYards < 50 ? `OWN ${offenseYards}` : `OPP ${FIELD_LENGTH - offenseYards}`;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th'] as const;

/** "3rd & 7", "1st & Goal", "4th & Inches" */
export function formatDownAndDistance(
  down: 1 | 2 | 3 | 4,
  distance: number,
  yardLine: number,
  possession: Side,
): string {
  const ordinal = ORDINALS[down - 1];
  if (isGoalToGo(yardLine, possession, distance)) {
    return `${ordinal} & Goal`;
  }
  if (distance < 1) {
    return `${ordinal} & Inches`;
  }
  return `${ordinal} & ${distance}`;
}

/**
 * Convert a drawn, offense-relative point to an absolute field point.
 * `ballX` is where the ball is spotted laterally (defaults to midfield).
 * For the away offense both axes mirror, so "offense's right" stays correct.
 */
export function toFieldPoint(
  rel: RelPoint,
  yardLine: number,
  possession: Side,
  ballX: number = FIELD_WIDTH / 2,
): FieldPoint {
  const dir = driveDirection(possession);
  return {
    x: ballX + dir * rel.x,
    y: yardLine + dir * rel.y,
  };
}

/** Inverse of toFieldPoint */
export function toRelPoint(
  point: FieldPoint,
  yardLine: number,
  possession: Side,
  ballX: number = FIELD_WIDTH / 2,
): RelPoint {
  const dir = driveDirection(possession);
  return {
    x: (point.x - ballX) * dir,
    y: (point.y - yardLine) * dir,
  };
}
