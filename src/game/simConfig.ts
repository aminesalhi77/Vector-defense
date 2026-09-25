import type { TowerKind, EnemyKind } from '../core/types';

// ============================================================
//   TOWERS  (12 types)
// ============================================================

export interface TowerDef {
  name: string;
  cost: number;
  sellValue: number;
  range: number;
  fireRate: number;
  damage: number;
  projectileSpeed: number;
  // abilities
  splash?: number;
  slow?: { factor: number; duration: number };
  dot?: { dps: number; duration: number; kind: 'burn' | 'poison' };
  chain?: { count: number; range: number; falloff: number };
  pierce?: number;
  armorPierce?: boolean;
  buff?: { range: number; fireRateMul: number };
  push?: number;
  // visual
  desc: string;
}

export const TOWER_DEFS: Record<TowerKind, TowerDef> = {
  arrow: {
    name: 'Archer', cost: 40, sellValue: 20,
    range: 3.2, fireRate: 2.6, damage: 11, projectileSpeed: 14,
    desc: 'Fast, cheap, single-target.',
  },
  cannon: {
    name: 'Cannon', cost: 90, sellValue: 45,
    range: 4.0, fireRate: 0.75, damage: 44, projectileSpeed: 9,
    splash: 1.6,
    desc: 'Heavy splash damage.',
  },
  frost: {
    name: 'Frost', cost: 70, sellValue: 35,
    range: 3.0, fireRate: 1.6, damage: 4, projectileSpeed: 12,
    slow: { factor: 0.45, duration: 1.8 },
    desc: 'Slows enemies 55%.',
  },
  sniper: {
    name: 'Sniper', cost: 130, sellValue: 65,
    range: 8.5, fireRate: 0.5, damage: 90, projectileSpeed: 40,
    pierce: 1, armorPierce: true,
    desc: 'Long range, ignores armor, pierces one.',
  },
  tesla: {
    name: 'Tesla', cost: 160, sellValue: 80,
    range: 2.8, fireRate: 1.2, damage: 22, projectileSpeed: 26,
    chain: { count: 3, range: 2.0, falloff: 0.65 },
    desc: 'Chains to 3 nearby enemies.',
  },
  poison: {
    name: 'Poison', cost: 110, sellValue: 55,
    range: 3.4, fireRate: 1.0, damage: 4, projectileSpeed: 10,
    splash: 1.4, dot: { dps: 12, duration: 4, kind: 'poison' },
    desc: 'Splash + poison damage over time.',
  },
  flame: {
    name: 'Flame', cost: 100, sellValue: 50,
    range: 2.6, fireRate: 3.2, damage: 6, projectileSpeed: 9,
    dot: { dps: 8, duration: 2.5, kind: 'burn' },
    desc: 'Short range, rapid burn.',
  },
  ballista: {
    name: 'Ballista', cost: 180, sellValue: 90,
    range: 6.0, fireRate: 0.9, damage: 55, projectileSpeed: 32,
    pierce: 3,
    desc: 'Pierces up to 3 enemies in a line.',
  },
  void: {
    name: 'Void', cost: 220, sellValue: 110,
    range: 4.5, fireRate: 1.1, damage: 40, projectileSpeed: 22,
    armorPierce: true, splash: 0.9,
    desc: 'Ignores armor. Void splash.',
  },
  beacon: {
    name: 'Beacon', cost: 150, sellValue: 75,
    range: 0.1, fireRate: 0, damage: 0, projectileSpeed: 0,
    buff: { range: 3.5, fireRateMul: 1.4 },
    desc: 'Buffs nearby towers: +40% fire rate.',
  },
  mortar: {
    name: 'Mortar', cost: 200, sellValue: 100,
    range: 8.0, fireRate: 0.35, damage: 70, projectileSpeed: 7,
    splash: 2.4,
    desc: 'Extreme range, huge splash, slow fire.',
  },
  gravity: {
    name: 'Gravity', cost: 240, sellValue: 120,
    range: 3.8, fireRate: 1.4, damage: 15, projectileSpeed: 18,
    slow: { factor: 0.55, duration: 0.8 }, push: 0.8,
    desc: 'Knocks enemies back along the path.',
  },
};

// ============================================================
//   ENEMIES  (30 types)
// ============================================================

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  reward: number;
  radius: number;
  height: number;
  armor: number;
  flying?: boolean;
  // abilities
  splitInto?: { kind: EnemyKind; count: number };
  spawns?: { kind: EnemyKind; count: number; interval: number };
  heals?: { range: number; rate: number };
  shields?: { range: number; reduce: number };
  phases?: { activeTime: number; idleTime: number };  // untargetable cycle
  teleports?: { interval: number; distance: number };
  explodes?: { spawnKind: EnemyKind; count: number };
  berserk?: number;                                    // max speed multiplier at 0 hp
  tanky?: boolean;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  // ---- Base tier ----
  grunt:     { name: 'Grunt',     hp: 55,   speed: 1.8, reward: 8,   radius: 0.28, height: 0.72, armor: 0 },
  runner:    { name: 'Runner',    hp: 32,   speed: 3.6, reward: 6,   radius: 0.22, height: 0.58, armor: 0 },
  tank:      { name: 'Tank',      hp: 240,  speed: 1.0, reward: 22,  radius: 0.40, height: 1.02, armor: 0.35 },
  sprinter:  { name: 'Sprinter',  hp: 40,   speed: 5.0, reward: 10,  radius: 0.20, height: 0.55, armor: 0 },
  scout:     { name: 'Scout',     hp: 90,   speed: 2.4, reward: 12,  radius: 0.26, height: 0.68, armor: 0.1 },
  brute:     { name: 'Brute',     hp: 380,  speed: 1.3, reward: 28,  radius: 0.42, height: 1.05, armor: 0.25 },

  // ---- Flying ----
  flyer:     { name: 'Flyer',     hp: 70,   speed: 2.6, reward: 12,  radius: 0.28, height: 0.66, armor: 0, flying: true },
  drone:     { name: 'Drone',     hp: 50,   speed: 4.0, reward: 10,  radius: 0.22, height: 0.5,  armor: 0, flying: true },
  bomber:    { name: 'Bomber',    hp: 140,  speed: 1.6, reward: 20,  radius: 0.34, height: 0.7,  armor: 0, flying: true, explodes: { spawnKind: 'runner', count: 3 } },
  harpy:     { name: 'Harpy',     hp: 95,   speed: 3.2, reward: 14,  radius: 0.26, height: 0.62, armor: 0, flying: true },

  // ---- Armored ----
  shielded:  { name: 'Shielded',  hp: 180,  speed: 1.5, reward: 18,  radius: 0.34, height: 0.86, armor: 0.55 },
  plated:    { name: 'Plated',    hp: 300,  speed: 1.6, reward: 24,  radius: 0.38, height: 0.95, armor: 0.45 },
  ironclad:  { name: 'Ironclad',  hp: 500,  speed: 1.1, reward: 38,  radius: 0.46, height: 1.12, armor: 0.6 },

  // ---- Phasing ----
  phantom:   { name: 'Phantom',   hp: 120,  speed: 2.8, reward: 20,  radius: 0.28, height: 0.7,  armor: 0, phases: { activeTime: 1.4, idleTime: 1.6 } },
  wraith:    { name: 'Wraith',    hp: 180,  speed: 2.2, reward: 26,  radius: 0.32, height: 0.85, armor: 0.15, phases: { activeTime: 2.0, idleTime: 1.2 } },

  // ---- Utility ----
  splitter:  { name: 'Splitter',  hp: 200,  speed: 1.7, reward: 20,  radius: 0.36, height: 0.85, armor: 0.1, splitInto: { kind: 'runner', count: 2 } },
  spawner:   { name: 'Spawner',   hp: 260,  speed: 1.2, reward: 30,  radius: 0.4,  height: 0.95, armor: 0.2, spawns: { kind: 'grunt', count: 4, interval: 2.5 } },
  healer:    { name: 'Healer',    hp: 150,  speed: 1.4, reward: 26,  radius: 0.3,  height: 0.8,  armor: 0.15, heals: { range: 2.5, rate: 10 } },
  shielder:  { name: 'Shielder',  hp: 220,  speed: 1.4, reward: 30,  radius: 0.34, height: 0.88, armor: 0.2, shields: { range: 2.6, reduce: 0.4 } },

  // ---- Heavy ----
  juggernaut:{ name: 'Juggernaut',hp: 900,  speed: 0.9, reward: 60,  radius: 0.52, height: 1.3,  armor: 0.4, tanky: true },
  colossus:  { name: 'Colossus',  hp: 1600, speed: 0.8, reward: 90,  radius: 0.6,  height: 1.55, armor: 0.45, tanky: true },
  behemoth:  { name: 'Behemoth',  hp: 3000, speed: 0.7, reward: 150, radius: 0.7,  height: 1.8,  armor: 0.5, tanky: true },

  // ---- Special ----
  berserker: { name: 'Berserker', hp: 220,  speed: 1.6, reward: 26,  radius: 0.32, height: 0.85, armor: 0.15, berserk: 2.2 },
  vampire:   { name: 'Vampire',   hp: 260,  speed: 2.0, reward: 30,  radius: 0.32, height: 0.88, armor: 0.1 },
  frost_giant:{ name: 'Frost Giant', hp: 800, speed: 0.9, reward: 70, radius: 0.55, height: 1.4, armor: 0.35, tanky: true },
  fire_elemental: { name: 'Fire Elemental', hp: 400, speed: 1.6, reward: 45, radius: 0.42, height: 1.0, armor: 0.2, splitInto: { kind: 'grunt', count: 3 } },
  void_walker: { name: 'Void Walker', hp: 320, speed: 2.0, reward: 42, radius: 0.34, height: 0.88, armor: 0.25, teleports: { interval: 4, distance: 3 } },
  necromancer: { name: 'Necromancer', hp: 480, speed: 1.3, reward: 60, radius: 0.4, height: 1.0, armor: 0.2, spawns: { kind: 'grunt', count: 6, interval: 2 } },

  // ---- Bosses ----
  warlord:   { name: 'Warlord',   hp: 2500, speed: 1.0, reward: 200, radius: 0.6, height: 1.5, armor: 0.4, tanky: true, spawns: { kind: 'grunt', count: 3, interval: 5 } },
  titan:     { name: 'Titan',     hp: 6000, speed: 0.8, reward: 500, radius: 0.75, height: 1.9, armor: 0.5, tanky: true, splitInto: { kind: 'brute', count: 3 } },
};

// ============================================================
//   WAVES
// ============================================================

export interface WaveEntry { kind: EnemyKind; at: number; }

const WAVE_POOLS: { from: number; pool: EnemyKind[] }[] = [
  { from: 1,  pool: ['grunt', 'runner'] },
  { from: 3,  pool: ['grunt', 'runner', 'scout', 'sprinter'] },
  { from: 5,  pool: ['grunt', 'runner', 'scout', 'sprinter', 'tank', 'flyer'] },
  { from: 8,  pool: ['grunt', 'runner', 'scout', 'tank', 'flyer', 'drone', 'harpy', 'shielded', 'splitter'] },
  { from: 12, pool: ['grunt', 'runner', 'tank', 'flyer', 'drone', 'harpy', 'shielded', 'plated', 'splitter', 'spawner', 'healer', 'phantom', 'brute'] },
  { from: 18, pool: ['runner', 'tank', 'flyer', 'harpy', 'shielded', 'plated', 'ironclad', 'splitter', 'spawner', 'healer', 'shielder', 'phantom', 'wraith', 'brute', 'berserker', 'bomber'] },
  { from: 26, pool: ['tank', 'shielded', 'plated', 'ironclad', 'splitter', 'spawner', 'healer', 'shielder', 'phantom', 'wraith', 'brute', 'berserker', 'vampire', 'frost_giant', 'fire_elemental', 'void_walker', 'bomber'] },
  { from: 34, pool: ['plated', 'ironclad', 'shielder', 'wraith', 'brute', 'berserker', 'vampire', 'frost_giant', 'fire_elemental', 'void_walker', 'necromancer', 'juggernaut'] },
  { from: 45, pool: ['ironclad', 'shielder', 'frost_giant', 'void_walker', 'necromancer', 'juggernaut', 'colossus', 'behemoth'] },
];

function poolFor(wave: number): EnemyKind[] {
  let pool = WAVE_POOLS[0].pool;
  for (const w of WAVE_POOLS) if (wave >= w.from) pool = w.pool;
  return pool;
}

export function buildWave(n: number, levelPool: EnemyKind[]): WaveEntry[] {
  const out: WaveEntry[] = [];
  const globalPool = poolFor(n).filter(k => levelPool.includes(k));
  const pool = globalPool.length > 0 ? globalPool : levelPool;

  const count = Math.min(40, 6 + Math.floor(n * 1.6));
  const gap = Math.max(0.28, 1.0 - n * 0.045);
  const rng = mulberry32(n * 7919 + 13);

  // Weighted picks — first tier is more common than last
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.pow(rng(), 1.6) * pool.length);
    const kind = pool[Math.min(pool.length - 1, idx)];
    out.push({ kind, at: i * gap });
  }
  return out;
}

export function hpScaleForWave(wave: number): number {
  return 1 + (wave - 1) * 0.18;
}

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