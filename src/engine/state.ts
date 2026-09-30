import { otherSide } from './field';
import type { Side } from './field';
import type { EngineState, GameConfig, GamePreset } from './types';

export const GAME_PRESETS: Record<GamePreset, GameConfig> = {
  // ~30 snaps: sized for async per-play games
  Quick: { quarterSeconds: 120, overtimeSeconds: 120, timeoutsPerHalf: 2, allowTies: true },
  // ~70 snaps
  Standard: { quarterSeconds: 300, overtimeSeconds: 300, timeoutsPerHalf: 3, allowTies: true },
  // Full NFL timing
  Full: { quarterSeconds: 900, overtimeSeconds: 600, timeoutsPerHalf: 3, allowTies: true },
};

/** Where the kicking team tees the ball up: its own 35 */
export const KICKOFF_SPOT_OFFENSE_YARDS = 35;

/**
 * State at the opening kickoff. `openingReceiver` comes from the coin toss,
 * which the caller decides (with the seeded Rng on the server).
 */
export function createInitialState(config: GameConfig, openingReceiver: Side): EngineState {
  const kicking = otherSide(openingReceiver);
  return {
    config,
    phase: 'Kickoff',
    quarter: 1,
    clock: config.quarterSeconds,
    clockRunning: false,
    possession: kicking,
    yardLine: kicking === 'home' ? KICKOFF_SPOT_OFFENSE_YARDS : 100 - KICKOFF_SPOT_OFFENSE_YARDS,
    down: 1,
    distance: 10,
    score: { home: 0, away: 0 },
    timeouts: { home: config.timeoutsPerHalf, away: config.timeoutsPerHalf },
    openingReceiver,
    turn: 0,
    drive: 0,
  };
}
