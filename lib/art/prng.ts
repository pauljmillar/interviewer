export function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function rnd(rand: () => number, lo: number, hi: number): number {
  return lo + rand() * (hi - lo);
}

export function rndInt(rand: () => number, lo: number, hi: number): number {
  return Math.floor(lo + rand() * (hi - lo + 1));
}

export function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export function wrap(v: number, r: number): number {
  return ((v % r) + r) % r;
}
