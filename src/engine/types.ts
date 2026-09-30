/**
 * Engine data model. Everything here is plain JSON-serializable data so it can
 * be stored in Firestore, sent over the wire, and replayed.
 *
 * The engine does not import app types. Adapters (Phase 2) convert the app's
 * Player / PlayConcept / drawn PlayData into these shapes.
 */

import type { FieldPoint, RelPoint, Side } from './field';

// ====================
// GAME STATE
// ====================

export type Quarter = 1 | 2 | 3 | 4 | 'OT';
export type Down = 1 | 2 | 3 | 4;

/**
 * What kind of call the engine is waiting for.
 * - Kickoff:   `possession` is the KICKING team
 * - Scrimmage: `possession` is the offense
 * - PAT:       `possession` is the team that just scored
 */
export type Phase = 'Kickoff' | 'Scrimmage' | 'PAT' | 'GameOver';

export interface GameConfig {
  /** Seconds per regulation quarter (900 = full NFL) */
  quarterSeconds: number;
  /** Seconds in the overtime period */
  overtimeSeconds: number;
  timeoutsPerHalf: number;
  /** Regular-season style: a tie after one OT period stands */
  allowTies: boolean;
}

export type GamePreset = 'Quick' | 'Standard' | 'Full';

export interface EngineState {
  config: GameConfig;
  phase: Phase;
  quarter: Quarter;
  /** Seconds remaining in the current quarter */
  clock: number;
  /** Whether the game clock runs before the next snap */
  clockRunning: boolean;

  possession: Side;
  /** Yards from the HOME goal line, see field.ts */
  yardLine: number;
  down: Down;
  /** Yards to the line to gain */
  distance: number;

  score: Record<Side, number>;
  timeouts: Record<Side, number>;

  /** Team that received the opening kickoff (the other receives after halftime) */
  openingReceiver: Side;
  /** Number of resolved calls so far; also the turn index used to fork the RNG */
  turn: number;
  /** Increments on every change of possession */
  drive: number;
  /** Set when phase is GameOver; null for a tie */
  winner?: Side | null;
}

// ====================
// PLAYERS
// ====================

export type OffensePosition = 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'LT' | 'LG' | 'C' | 'RG' | 'RT';
export type DefensePosition = 'DT' | 'NT' | 'DE' | 'OLB' | 'ILB' | 'MLB' | 'CB' | 'FS' | 'SS' | 'S';
export type SpecialPosition = 'K' | 'P' | 'LS';
export type EnginePosition = OffensePosition | DefensePosition | SpecialPosition;

/** Flat 0-99 ratings. Adapters fill gaps from `overall` so every key is always present. */
export interface EngineRatings {
  overall: number;
  // physical
  speed: number;
  acceleration: number;
  strength: number;
  agility: number;
  awareness: number;
  stamina: number;
  // passing
  throwPower: number;
  shortAccuracy: number;
  mediumAccuracy: number;
  deepAccuracy: number;
  pocketPresence: number;
  // ball carrier
  carrying: number;
  elusiveness: number;
  trucking: number;
  vision: number;
  // receiving
  catching: number;
  routeRunning: number;
  release: number;
  // blocking
  passBlock: number;
  runBlock: number;
  // defense
  tackling: number;
  blockShedding: number;
  passRush: number;
  manCoverage: number;
  zoneCoverage: number;
  pursuit: number;
  playRecognition: number;
  // kicking
  kickPower: number;
  kickAccuracy: number;
}

export type RatingKey = keyof EngineRatings;

export interface EnginePlayer {
  id: string;
  name: string;
  number: number;
  position: EnginePosition;
  /** 1 = starter at this position */
  depth: number;
  ratings: EngineRatings;
}

export interface EngineRoster {
  side: Side;
  teamName: string;
  players: EnginePlayer[];
}

export type Rosters = Record<Side, EngineRoster>;

// ====================
// PLAY DEFINITIONS (what a call carries)
// ====================

export type RouteKind =
  | 'Go'
  | 'Fade'
  | 'Seam'
  | 'Post'
  | 'Corner'
  | 'Slant'
  | 'In'
  | 'Dig'
  | 'Out'
  | 'Curl'
  | 'Comeback'
  | 'Hitch'
  | 'Flat'
  | 'Drag'
  | 'Crossing'
  | 'Wheel'
  | 'Angle'
  | 'Screen'
  | 'Custom';

export type RunGap = 'LeftEnd' | 'LeftTackle' | 'LeftGuard' | 'Middle' | 'RightGuard' | 'RightTackle' | 'RightEnd';

export type OffenseAssignment =
  | { type: 'Pass' }
  | { type: 'Handoff' }
  | { type: 'Carry'; gap: RunGap }
  | { type: 'Route'; route: RouteKind; path: RelPoint[]; progression: number }
  | { type: 'PassBlock' }
  | { type: 'RunBlock'; style: 'Base' | 'Zone' | 'Pull' | 'Lead'; targetSlot?: string };

export interface OffenseSlot {
  /** Stable id within the play, e.g. "QB", "WR1", "LT" */
  slot: string;
  position: OffensePosition;
  /** Pin a specific player; otherwise the depth chart fills the slot */
  playerId?: string;
  /** Pre-snap alignment relative to the ball */
  align: RelPoint;
  assignment: OffenseAssignment;
}

export interface OffensePlayDef {
  id: string;
  name: string;
  kind: 'Run' | 'Pass';
  formation: string;
  playAction?: boolean;
  slots: OffenseSlot[];
}

export type CoverageShell = 'Cover0' | 'Cover1' | 'Cover2' | 'Cover3' | 'Cover4' | 'Cover6' | 'Custom';

/** Rectangle in offense-relative space owned by a zone defender */
export interface ZoneArea {
  name: string;
  min: RelPoint;
  max: RelPoint;
}

export type DefenseAssignment =
  | { type: 'Rush'; gap?: RunGap }
  | { type: 'Man'; targetSlot: string; press: boolean }
  | { type: 'Zone'; area: ZoneArea }
  | { type: 'Spy'; targetSlot: string }
  | { type: 'Contain'; side: 'Left' | 'Right' };

export interface DefenseSlot {
  slot: string;
  position: DefensePosition;
  playerId?: string;
  align: RelPoint;
  assignment: DefenseAssignment;
}

export interface DefensePlayDef {
  id: string;
  name: string;
  front: string;
  shell: CoverageShell;
  slots: DefenseSlot[];
}

// ====================
// CALLS (one per player per turn)
// ====================

interface CallBase {
  /** Burn a timeout after this play (ignored if none remain) */
  timeout?: boolean;
}

export type OffenseCall = CallBase &
  (
    | { kind: 'Play'; play: OffensePlayDef; hurryUp?: boolean }
    | { kind: 'Punt' }
    | { kind: 'FieldGoal' }
    | { kind: 'Kneel' }
    | { kind: 'Spike' }
    | { kind: 'Kickoff'; onside?: boolean }
    | { kind: 'ExtraPoint' }
    | { kind: 'TwoPoint'; play: OffensePlayDef }
  );

/**
 * Picks are blind, so the defense cannot know the offense is punting or
 * kicking. It always sends a play (used if the offense runs one); 'Auto' lets
 * the engine pick a sensible default, e.g. on kickoffs.
 */
export type DefenseCall = CallBase & ({ kind: 'Play'; play: DefensePlayDef } | { kind: 'Auto' });

export type OffenseCallKind = OffenseCall['kind'];

// ====================
// EVENTS + RESULT
// ====================

export type PlayEvent =
  | { type: 'Snap'; t: number; at: FieldPoint }
  | { type: 'Handoff'; t: number; at: FieldPoint; fromId: string; toId: string }
  | { type: 'Pressure'; t: number; at: FieldPoint; rusherId: string; blockerId?: string }
  | { type: 'Sack'; t: number; at: FieldPoint; qbId: string; tacklerId: string }
  | { type: 'Scramble'; t: number; at: FieldPoint; qbId: string }
  | { type: 'Throw'; t: number; from: FieldPoint; to: FieldPoint; qbId: string; targetId: string; airYards: number }
  | { type: 'Catch'; t: number; at: FieldPoint; receiverId: string; defenderId?: string }
  | { type: 'Incomplete'; t: number; at: FieldPoint; targetId: string; reason: 'Overthrown' | 'Dropped' | 'Defended' | 'ThrownAway'; defenderId?: string }
  | { type: 'Interception'; t: number; at: FieldPoint; defenderId: string; targetId: string }
  | { type: 'Run'; t: number; from: FieldPoint; to: FieldPoint; carrierId: string }
  | { type: 'BrokenTackle'; t: number; at: FieldPoint; carrierId: string; defenderId: string }
  | { type: 'Tackle'; t: number; at: FieldPoint; carrierId: string; tacklerId: string; assistId?: string }
  | { type: 'OutOfBounds'; t: number; at: FieldPoint; carrierId: string }
  | { type: 'Fumble'; t: number; at: FieldPoint; carrierId: string; forcedById?: string; recoveredBy: Side; recovererId?: string }
  | { type: 'Return'; t: number; from: FieldPoint; to: FieldPoint; returnerId: string }
  | { type: 'Kick'; t: number; from: FieldPoint; to: FieldPoint; kickerId?: string; kick: 'Kickoff' | 'Onside' | 'Punt' | 'FieldGoal' | 'ExtraPoint' }
  | { type: 'KickResult'; t: number; kick: 'FieldGoal' | 'ExtraPoint'; good: boolean; distance: number }
  | { type: 'Touchback'; t: number }
  | { type: 'Touchdown'; t: number; side: Side; scorerId?: string }
  | { type: 'TwoPointResult'; t: number; side: Side; good: boolean }
  | { type: 'Safety'; t: number; side: Side }
  | { type: 'FirstDown'; t: number }
  | { type: 'TurnoverOnDowns'; t: number }
  | { type: 'Timeout'; t: number; side: Side }
  | { type: 'QuarterEnd'; t: number; quarter: Quarter }
  | { type: 'GameEnd'; t: number; winner: Side | null };

export type PlayEventType = PlayEvent['type'];

export type PlayOutcome =
  | 'Run'
  | 'Complete'
  | 'Incomplete'
  | 'Sack'
  | 'Scramble'
  | 'Interception'
  | 'FumbleLost'
  | 'Kneel'
  | 'Spike'
  | 'Punt'
  | 'FieldGoalGood'
  | 'FieldGoalMissed'
  | 'Kickoff'
  | 'ExtraPointGood'
  | 'ExtraPointMissed'
  | 'TwoPointGood'
  | 'TwoPointFailed';

/** Flat, display-friendly digest of a resolved play */
export interface PlaySummary {
  turn: number;
  offense: Side;
  callKind: OffenseCallKind;
  outcome: PlayOutcome;
  /** Net yards for the offense from the previous spot (0 for kicks) */
  yards: number;
  /** Game-clock seconds consumed, including runoff before the snap */
  clockUsed: number;
  firstDown: boolean;
  touchdown: boolean;
  turnover: boolean;
  safety: boolean;
  /** Points scored on this play and by whom */
  points: number;
  scoringSide?: Side;
  /** Situation before the snap, for play-by-play text */
  before: { quarter: Quarter; clock: number; down: Down; distance: number; yardLine: number };
}

export interface PlayResolution {
  nextState: EngineState;
  events: PlayEvent[];
  summary: PlaySummary;
}
