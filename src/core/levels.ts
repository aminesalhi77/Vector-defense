import type { LevelConfig, TowerKind, EnemyKind } from './types';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(id: number): number {
  let h = (id * 2654435761) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// ============================================================
//   UNLOCKS
// ============================================================

export const TOWER_UNLOCKS: { level: number; kind: TowerKind }[] = [
  { level: 1,  kind: 'arrow' },
  { level: 1,  kind: 'cannon' },
  { level: 1,  kind: 'frost' },
  { level: 5,  kind: 'sniper' },
  { level: 10, kind: 'tesla' },
  { level: 15, kind: 'poison' },
  { level: 20, kind: 'flame' },
  { level: 25, kind: 'ballista' },
  { level: 30, kind: 'void' },
  { level: 35, kind: 'beacon' },
  { level: 42, kind: 'mortar' },
  { level: 50, kind: 'gravity' },
];

export const ENEMY_UNLOCKS: { level: number; kind: EnemyKind }[] = [
  { level: 1,  kind: 'grunt' },
  { level: 1,  kind: 'runner' },
  { level: 3,  kind: 'scout' },
  { level: 4,  kind: 'sprinter' },
  { level: 6,  kind: 'tank' },
  { level: 7,  kind: 'flyer' },
  { level: 9,  kind: 'drone' },
  { level: 10, kind: 'harpy' },
  { level: 11, kind: 'shielded' },
  { level: 13, kind: 'splitter' },
  { level: 15, kind: 'brute' },
  { level: 17, kind: 'plated' },
  { level: 19, kind: 'spawner' },
  { level: 21, kind: 'healer' },
  { level: 22, kind: 'phantom' },
  { level: 24, kind: 'bomber' },
  { level: 26, kind: 'shielder' },
  { level: 28, kind: 'ironclad' },
  { level: 30, kind: 'wraith' },
  { level: 32, kind: 'berserker' },
  { level: 34, kind: 'vampire' },
  { level: 37, kind: 'frost_giant' },
  { level: 39, kind: 'fire_elemental' },
  { level: 42, kind: 'void_walker' },
  { level: 45, kind: 'juggernaut' },
  { level: 48, kind: 'necromancer' },
  { level: 52, kind: 'colossus' },
  { level: 56, kind: 'warlord' },
  { level: 62, kind: 'behemoth' },
  { level: 70, kind: 'titan' },
];

export function towersFor(level: number): TowerKind[] {
  return TOWER_UNLOCKS.filter(u => u.level <= level).map(u => u.kind);
}

export function enemiesFor(level: number): EnemyKind[] {
  return ENEMY_UNLOCKS.filter(u => u.level <= level).map(u => u.kind);
}

// ============================================================
//   DIFFICULTY CURVE
// ============================================================

export function hpMultiplierFor(level: number): number {
  return 1 + level * 0.09 + Math.pow(level / 40, 1.6);
}

export function speedMultiplierFor(level: number): number {
  return Math.min(2.2, 1 + level * 0.006);
}

export function waveCountFor(level: number): number {
  return Math.min(30, 4 + Math.floor(level / 6));
}

export function difficultyStars(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level <= 3) return 1;
  if (level <= 10) return 2;
  if (level <= 30) return 3;
  if (level <= 80) return 4;
  return 5;
}

// ============================================================
//   PATH GENERATION
// ============================================================

type Rng = () => number;

function pathSerpentine(rng: Rng, cols: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  const lanes = 3 + Math.floor(rng() * 2);
  const laneGap = Math.max(2, Math.floor((rows - 2) / (lanes - 1)));
  const startR = 1 + Math.floor(rng() * 2);
  const laneRows: number[] = [];
  for (let i = 0; i < lanes; i++) {
    laneRows.push(Math.min(rows - 2, startR + i * laneGap));
  }
  const rightCol = cols - 1;
  const leftCol = Math.floor(cols * 0.15);
  let c = -1;
  pts.push([c, laneRows[0]]);
  for (let i = 0; i < lanes; i++) {
    const isRight = i % 2 === 0;
    c = isRight ? rightCol : leftCol;
    pts.push([c, laneRows[i]]);
    if (i < lanes - 1) pts.push([c, laneRows[i + 1]]);
  }
  pts.push([cols, laneRows[lanes - 1]]);
  return pts;
}

function pathZigzag(rng: Rng, cols: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  let r = Math.floor(rows / 2 + (rng() - 0.5) * 3);
  r = Math.max(1, Math.min(rows - 2, r));
  let c = -1;
  pts.push([c, r]);
  const turns = 5 + Math.floor(rng() * 4);
  const runBase = 2 + Math.floor(cols / 10);
  for (let i = 0; i < turns; i++) {
    const run = runBase + Math.floor(rng() * 2);
    c += run;
    pts.push([c, r]);
    const dir = rng() < 0.5 ? -1 : 1;
    const jog = 1 + Math.floor(rng() * Math.max(2, (rows - 4) * 0.7));
    let newR = r + dir * jog;
    newR = Math.max(1, Math.min(rows - 2, newR));
    if (newR === r) newR = Math.max(1, Math.min(rows - 2, r + dir));
    r = newR;
    pts.push([c, r]);
  }
  pts.push([cols, r]);
  return pts;
}

function pathSpiral(rng: Rng, cols: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  let top = 1, bottom = rows - 2, left = 1, right = cols - 2;
  let r = top, c = 1;
  pts.push([-1, top]);
  pts.push([1, top]);
  let phase = Math.floor(rng() * 4);
  let guard = 0;
  while (top <= bottom && left <= right && guard++ < 200) {
    if (phase === 0) {
      while (c < right) { c++; pts.push([c, r]); }
      top++;
    } else if (phase === 1) {
      while (r < bottom) { r++; pts.push([c, r]); }
      right--;
    } else if (phase === 2) {
      while (c > left) { c--; pts.push([c, r]); }
      bottom--;
    } else {
      while (r > top) { r--; pts.push([c, r]); }
      left++;
    }
    phase = (phase + 1) % 4;
  }
  pts.push([cols, r]);
  return pts;
}

function pathDiagonal(rng: Rng, cols: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  let r = rng() < 0.5 ? 1 : rows - 2;
  const step = r < rows / 2 ? 1 : -1;
  let c = -1;
  pts.push([c, r]);
  const legs = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < legs; i++) {
    const dx = 2 + Math.floor(rng() * 3);
    const dy = step * (1 + Math.floor(rng() * 3));
    const newC = c + dx;
    const newR = Math.max(1, Math.min(rows - 2, r + dy));
    // Insert orthogonal corner: horizontal first, then vertical
    pts.push([newC, r]);
    pts.push([newC, newR]);
    c = newC;
    r = newR;
  }
  pts.push([cols, r]);
  return pts;
}

function pathHairpin(rng: Rng, cols: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  let r = 1;
  let c = -1;
  pts.push([c, r]);
  const loops = 2 + Math.floor(rng() * 2);
  const backCol = Math.floor(cols * (0.6 + rng() * 0.2));
  for (let i = 0; i < loops; i++) {
    c = backCol;
    pts.push([c, r]);
    r = Math.min(rows - 2, r + 3 + Math.floor(rng() * 3));
    pts.push([c, r]);
    c = 1;
    pts.push([c, r]);
    r = Math.min(rows - 2, r + 2 + Math.floor(rng() * 2));
    pts.push([c, r]);
  }
  pts.push([cols, r]);
  return pts;
}

function pathCross(rng: Rng, cols: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  let r = 1 + Math.floor(rng() * (rows - 2));
  let c = -1;
  pts.push([c, r]);
  const legs = 6 + Math.floor(rng() * 3);
  for (let i = 0; i < legs; i++) {
    const dx = 2 + Math.floor(rng() * 2);
    const newC = c + dx;
    const goHigh = i % 2 === 0;
    const targetR = goHigh
      ? 1 + Math.floor(rng() * Math.max(1, Math.floor(rows * 0.3)))
      : rows - 2 - Math.floor(rng() * Math.max(1, Math.floor(rows * 0.3)));
    const newR = Math.max(1, Math.min(rows - 2, targetR));
    // Insert orthogonal corner
    pts.push([newC, r]);
    pts.push([newC, newR]);
    c = newC;
    r = newR;
  }
  pts.push([cols, r]);
  return pts;
}

function dedupe(pts: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out;
}

function generatePath(rng: Rng, cols: number, rows: number): [number, number][] {
  const roll = rng();
  let pts: [number, number][];
  if (roll < 0.20)      pts = pathSerpentine(rng, cols, rows);
  else if (roll < 0.40) pts = pathZigzag(rng, cols, rows);
  else if (roll < 0.60) pts = pathSpiral(rng, cols, rows);
  else if (roll < 0.75) pts = pathDiagonal(rng, cols, rows);
  else if (roll < 0.90) pts = pathHairpin(rng, cols, rows);
  else                  pts = pathCross(rng, cols, rows);
  return dedupe(pts);
}

// ============================================================
//   LEVEL BUILDER
// ============================================================

export function getLevel(id: number): LevelConfig {
  const seed = hashSeed(id);
  const rng = mulberry32(seed);

  const baseCols = 12 + Math.floor(id / 12);
  const jitterCols = Math.floor(rng() * 5);
  const baseRows = 9 + Math.floor(id / 25);
  const jitterRows = Math.floor(rng() * 4);

  const cols = Math.min(30, baseCols + jitterCols);
  const rows = Math.min(20, baseRows + jitterRows);

  const rng2 = mulberry32(seed ^ 0xdeadbeef);
  rng2();
  rng2();

  return {
    id,
    seed,
    cols,
    rows,
    pathTiles: generatePath(rng2, cols, rows),
    startMoney: 150 + Math.floor(id / 3),
    startLives: Math.max(5, 20 - Math.floor(id / 20)),
    waveCount: waveCountFor(id),
    enemyHpMultiplier: hpMultiplierFor(id),
    enemySpeedMultiplier: speedMultiplierFor(id),
    availableTowers: towersFor(id),
    availableEnemies: enemiesFor(id),
    isBoss: id > 0 && id % 25 === 0,
    difficulty: difficultyStars(id),
  };
}