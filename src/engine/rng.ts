/**
 * Seeded random number generator for the game engine.
 *
 * The engine must be deterministic: the same seed always produces the same
 * game, on the server (V8) and on the phone (Hermes). To guarantee that,
 * everything here uses only 32-bit integer ops and + - * / on doubles.
 * No Math.random, and no Math.sin/cos/log/exp (their last bits can differ
 * between JS engines).
 */

export interface Rng {
  /** Uniform float in [0, 1) */
  next(): number;
  /** Uniform float in [min, max) */
  range(min: number, max: number): number;
  /** Uniform integer in [min, max], both inclusive */
  int(min: number, max: number): number;
  /** True with probability p (p is clamped to [0, 1]) */
  chance(p: number): boolean;
  /** Uniformly pick one element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** Pick one element with probability proportional to its weight. */
  weighted<T>(items: readonly (readonly [T, number])[]): T;
  /** Approximately normal sample (bounded to about +/- 4.2 sd) */
  normal(mean?: number, sd?: number): number;
  /** Independent generator derived from this seed + label; does not advance this one */
  fork(label: string | number): Rng;
  /** The seed this generator was created with */
  readonly seed: string;
}

/** cyrb128 string hash -> four 32-bit words of state */
function hashSeed(seed: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

// 1 / sqrt(0.5): scales a sum of 6 uniforms (variance 6/12) to unit variance
const IRWIN_HALL_6_SCALE = 1.4142135623730951;

export function createRng(seed: string | number): Rng {
  const seedString = String(seed);
  let [a, b, c, d] = hashSeed(seedString);

  // sfc32
  const next = (): number => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };

  // Discard the first outputs so similar seeds decorrelate
  for (let i = 0; i < 12; i++) {
    next();
  }

  const range = (min: number, max: number): number => min + next() * (max - min);

  const int = (min: number, max: number): number => {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if (hi < lo) {
      throw new Error(`rng.int: empty range [${min}, ${max}]`);
    }
    return lo + Math.floor(next() * (hi - lo + 1));
  };

  const chance = (p: number): boolean => {
    // Always consume exactly one draw so call sequences stay aligned
    const roll = next();
    if (p <= 0) {
      return false;
    }
    if (p >= 1) {
      return true;
    }
    return roll < p;
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('rng.pick: empty array');
    }
    return items[Math.floor(next() * items.length)];
  };

  const weighted = <T>(items: readonly (readonly [T, number])[]): T => {
    let total = 0;
    for (const [, weight] of items) {
      if (weight > 0) {
        total += weight;
      }
    }
    if (items.length === 0 || total <= 0) {
      throw new Error('rng.weighted: no items with positive weight');
    }
    let roll = next() * total;
    let last: T | undefined;
    for (const [item, weight] of items) {
      if (weight <= 0) {
        continue;
      }
      last = item;
      roll -= weight;
      if (roll < 0) {
        return item;
      }
    }
    // Floating point edge: roll landed exactly on the total
    return last as T;
  };

  const normal = (mean = 0, sd = 1): number => {
    // Irwin-Hall: sum of 6 uniforms has mean 3, variance 0.5
    let sum = 0;
    for (let i = 0; i < 6; i++) {
      sum += next();
    }
    return mean + (sum - 3) * IRWIN_HALL_6_SCALE * sd;
  };

  const fork = (label: string | number): Rng => createRng(`${seedString}/${label}`);

  return { next, range, int, chance, pick, weighted, normal, fork, seed: seedString };
}
