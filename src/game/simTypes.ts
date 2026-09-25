import type { TowerKind, EnemyKind } from '../core/types';

export type Vec2 = { x: number; y: number };

export interface SimEnemy {
  id: number;
  kind: EnemyKind;
  pos: Vec2;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  slowUntil: number;
  slowFactor: number;
  waypoint: number;
  reward: number;
  radius: number;
  dead: boolean;
  leaked: boolean;
  hitFlash: number;
  burnUntil: number;
  burnDps: number;
  poisonUntil: number;
  poisonDps: number;
  phaseUntil: number;
  nextTeleportAt: number;
  nextSpawnAt: number;
  spawnCount: number;
  hasSplit: boolean;
  exploded: boolean;
  shieldUntil: number;
  shieldReduce: number;
}

export interface SimTower {
  id: number;
  kind: TowerKind;
  col: number;
  row: number;
  pos: Vec2;
  cooldown: number;
  angle: number;
  targetId: number | null;
  recoil: number;
  fireRateBoost: number;
}

export interface SimProjectile {
  id: number;
  kind: TowerKind;
  pos: Vec2;
  vel: Vec2;
  targetId: number | null;
  target: Vec2;
  damage: number;
  splash?: number;
  slow?: { factor: number; duration: number };
  dot?: { dps: number; duration: number; kind: 'burn' | 'poison' };
  chain?: { remaining: number; range: number; falloff: number };
  pierce?: number;
  piercedIds?: number[];
  armorPierce?: boolean;
  push?: number;
  ttl: number;
  dead: boolean;
}

export type SimEventType =
  | 'hit' | 'kill' | 'leak' | 'shoot' | 'place' | 'sell'
  | 'split' | 'spawn' | 'heal' | 'phase' | 'teleport' | 'explode' | 'chain';

export interface SimEvent {
  type: SimEventType;
  pos: Vec2;
  amount?: number;
  color?: string;
  radius?: number;
  enemyKind?: EnemyKind;
  towerKind?: TowerKind;
}

export interface SimState {
  time: number;
  money: number;
  lives: number;
  wave: number;
  waveActive: boolean;
  waveStartTime: number;
  waveCount: number;
  spawnQueue: { kind: EnemyKind; at: number }[];
  enemies: SimEnemy[];
  towers: SimTower[];
  projectiles: SimProjectile[];
  selectedTower: TowerKind | null;
  status: 'playing' | 'won' | 'lost';
  nextId: number;
  shake: number;
  enemyHpMul: number;
  enemySpeedMul: number;
  availableTowers: TowerKind[];
  events: SimEvent[];
  canPlaceTowers: boolean;
}