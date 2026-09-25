import type { LevelConfig, EnemyKind } from '../core/types';
import type {
  SimEnemy, SimState, SimTower, SimProjectile,
} from './simTypes';
import { ENEMY_DEFS, TOWER_DEFS, buildWave, hpScaleForWave } from './simConfig';
import type { GameWorld } from './world';
import { cellCenter } from './world';

export function createSimState(level: LevelConfig): SimState {
  return {
    time: 0,
    money: level.startMoney,
    lives: level.startLives,
    wave: 0,
    waveActive: false,
    waveStartTime: 0,
    waveCount: level.waveCount,
    spawnQueue: [],
    enemies: [],
    towers: [],
    projectiles: [],
    selectedTower: level.availableTowers[0] ?? null,
    status: 'playing',
    nextId: 1,
    shake: 0,
    enemyHpMul: level.enemyHpMultiplier,
    enemySpeedMul: level.enemySpeedMultiplier,
    availableTowers: level.availableTowers,
    events: [],
    canPlaceTowers: true,
  };
}

export function startWave(s: SimState, levelPool: EnemyKind[]) {
  if (s.waveActive || s.status !== 'playing') return;
  s.wave++;
  s.waveActive = true;
  s.waveStartTime = s.time;
  s.spawnQueue = buildWave(s.wave, levelPool);
  s.canPlaceTowers = false;
}

export function updateSim(s: SimState, world: GameWorld, dt: number) {
  if (s.status !== 'playing') return;
  s.time += dt;

  if (s.waveActive && s.spawnQueue.length) {
    const t = s.time - s.waveStartTime;
    while (s.spawnQueue.length && s.spawnQueue[0].at <= t) {
      spawnEnemy(s, world, s.spawnQueue.shift()!.kind);
    }
  }

  applyAuras(s);

  for (const e of s.enemies) {
    updateEnemy(s, world, e, dt);
    if (e.leaked) {
      s.lives--;
      s.events.push({ type: 'leak', pos: { ...e.pos } });
    }
  }

  updateBeaconBuffs(s);
  for (const t of s.towers) updateTower(s, world, t, dt);
  for (const p of s.projectiles) updateProjectile(s, p, dt);

  for (const e of s.enemies) {
    if (e.shieldUntil > 0 && s.time > e.shieldUntil) {
      e.shieldReduce = 0;
    }
  }

  s.enemies = s.enemies.filter(e => !e.dead);
  s.projectiles = s.projectiles.filter(p => !p.dead);

  if (s.lives <= 0) {
    s.lives = 0;
    s.status = 'lost';
    return;
  }
  if (s.waveActive && s.spawnQueue.length === 0 && s.enemies.length === 0) {
    s.waveActive = false;
    s.canPlaceTowers = true;
    s.money += 30 + s.wave * 6;
    if (s.wave >= s.waveCount) {
      s.status = 'won';
    }
  }
}

// -------------------- Auras --------------------

function applyAuras(s: SimState) {
  for (const e of s.enemies) {
    if (e.dead) continue;
    const def = ENEMY_DEFS[e.kind];
    if (def.shields) {
      for (const other of s.enemies) {
        if (other.dead || other.id === e.id) continue;
        const d = Math.hypot(other.pos.x - e.pos.x, other.pos.y - e.pos.y);
        if (d <= def.shields.range) {
          other.shieldUntil = s.time + 0.1;
          other.shieldReduce = def.shields.reduce;
        }
      }
    }
    if (def.heals) {
      for (const other of s.enemies) {
        if (other.dead || other.id === e.id) continue;
        const d = Math.hypot(other.pos.x - e.pos.x, other.pos.y - e.pos.y);
        if (d <= def.heals.range) {
          other.hp = Math.min(other.maxHp, other.hp + def.heals.rate * 0.016);
        }
      }
    }
  }
}

function updateBeaconBuffs(s: SimState) {
  for (const t of s.towers) t.fireRateBoost = 1;
  for (const b of s.towers) {
    if (b.kind !== 'beacon') continue;
    const def = TOWER_DEFS.beacon;
    if (!def.buff) continue;
    for (const t of s.towers) {
      if (t.id === b.id) continue;
      const d = Math.hypot(t.pos.x - b.pos.x, t.pos.y - b.pos.y);
      if (d <= def.buff.range) t.fireRateBoost = Math.max(t.fireRateBoost, def.buff.fireRateMul);
    }
  }
}

// -------------------- Spawning --------------------

function spawnEnemy(s: SimState, world: GameWorld, kind: EnemyKind) {
  const def = ENEMY_DEFS[kind];
  const hp = def.hp * hpScaleForWave(s.wave) * s.enemyHpMul;
  s.enemies.push({
    id: s.nextId++,
    kind,
    pos: { ...world.pathWorld[0] },
    hp, maxHp: hp,
    baseSpeed: def.speed * s.enemySpeedMul,
    slowUntil: 0,
    slowFactor: 1,
    waypoint: 1,
    reward: def.reward,
    radius: def.radius,
    dead: false,
    leaked: false,
    hitFlash: 0,
    burnUntil: 0,
    burnDps: 0,
    poisonUntil: 0,
    poisonDps: 0,
    phaseUntil: 0,
    nextTeleportAt: def.teleports ? s.time + def.teleports.interval : 0,
    nextSpawnAt: def.spawns ? s.time + def.spawns.interval : 0,
    spawnCount: def.spawns?.count ?? 0,
    hasSplit: !!def.splitInto,
    exploded: false,
    shieldUntil: 0,
    shieldReduce: 0,
  });
}

// -------------------- Enemies --------------------

function updateEnemy(s: SimState, world: GameWorld, e: SimEnemy, dt: number) {
  if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

  if (s.time < e.burnUntil && e.burnDps > 0) damageEnemy(s, e, e.burnDps * dt, true);
  if (s.time < e.poisonUntil && e.poisonDps > 0) damageEnemy(s, e, e.poisonDps * dt, true);
  if (e.dead) return;

  const def = ENEMY_DEFS[e.kind];

  if (def.phases) {
    const cycle = def.phases.activeTime + def.phases.idleTime;
    const t = s.time % cycle;
    const inPhase = t >= def.phases.activeTime;
    e.phaseUntil = inPhase ? s.time + 0.05 : 0;
  }

  if (def.teleports && s.time >= e.nextTeleportAt) {
    e.nextTeleportAt = s.time + def.teleports.interval;
    advanceEnemy(world, e, def.teleports.distance);
    s.events.push({ type: 'teleport', pos: { ...e.pos } });
    return;
  }

  if (def.spawns && e.spawnCount > 0 && s.time >= e.nextSpawnAt) {
    e.nextSpawnAt = s.time + def.spawns.interval;
    e.spawnCount--;
    const spawnKind = def.spawns.kind;
    const child = ENEMY_DEFS[spawnKind];
    const hp = child.hp * hpScaleForWave(s.wave) * s.enemyHpMul;
    s.enemies.push({
      id: s.nextId++,
      kind: spawnKind,
      pos: { x: e.pos.x, y: e.pos.y },
      hp, maxHp: hp,
      baseSpeed: child.speed * s.enemySpeedMul,
      slowUntil: 0, slowFactor: 1,
      waypoint: e.waypoint,
      reward: child.reward,
      radius: child.radius,
      dead: false, leaked: false, hitFlash: 0,
      burnUntil: 0, burnDps: 0, poisonUntil: 0, poisonDps: 0,
      phaseUntil: 0, nextTeleportAt: 0, nextSpawnAt: 0, spawnCount: 0,
      hasSplit: !!child.splitInto, exploded: false,
      shieldUntil: 0, shieldReduce: 0,
    });
    s.events.push({ type: 'spawn', pos: { ...e.pos } });
  }

  const speedMul = s.time < e.slowUntil ? e.slowFactor : 1;
  let speed = e.baseSpeed;
  if (def.berserk) {
    const hpFrac = e.hp / e.maxHp;
    speed *= 1 + (def.berserk - 1) * (1 - hpFrac);
  }
  let remaining = speed * speedMul * dt;
  if (remaining <= 0) return;

  const path = world.pathWorld;
  while (remaining > 0 && e.waypoint < path.length) {
    const target = path[e.waypoint];
    const dx = target.x - e.pos.x;
    const dy = target.y - e.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= remaining) {
      e.pos.x = target.x;
      e.pos.y = target.y;
      remaining -= dist;
      e.waypoint++;
    } else {
      e.pos.x += (dx / dist) * remaining;
      e.pos.y += (dy / dist) * remaining;
      remaining = 0;
    }
  }
  if (e.waypoint >= path.length) {
    e.leaked = true;
    e.dead = true;
  }
}

function advanceEnemy(world: GameWorld, e: SimEnemy, tiles: number) {
  let remaining = tiles;
  const path = world.pathWorld;
  while (remaining > 0 && e.waypoint < path.length) {
    const target = path[e.waypoint];
    const dx = target.x - e.pos.x;
    const dy = target.y - e.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= remaining) {
      e.pos.x = target.x;
      e.pos.y = target.y;
      remaining -= dist;
      e.waypoint++;
    } else {
      e.pos.x += (dx / dist) * remaining;
      e.pos.y += (dy / dist) * remaining;
      remaining = 0;
    }
  }
  if (e.waypoint >= path.length) {
    e.leaked = true;
    e.dead = true;
  }
}

function damageEnemy(s: SimState, e: SimEnemy, dmg: number, isDot = false) {
  if (e.dead) return;
  if (e.shieldUntil > 0 && !isDot) dmg *= (1 - e.shieldReduce);
  const armor = ENEMY_DEFS[e.kind].armor;
  e.hp -= dmg * (1 - armor);
  if (!isDot) e.hitFlash = 0.14;

  if (e.hp <= 0) {
    e.dead = true;
    s.money += e.reward;
    s.events.push({ type: 'kill', pos: { ...e.pos }, amount: e.reward, enemyKind: e.kind });

    const def = ENEMY_DEFS[e.kind];
    if (def.splitInto && e.hasSplit) {
      for (let i = 0; i < def.splitInto.count; i++) {
        const spawnKind = def.splitInto.kind;
        const child = ENEMY_DEFS[spawnKind];
        const hp = child.hp * hpScaleForWave(s.wave) * s.enemyHpMul;
        const ang = (i / def.splitInto.count) * Math.PI * 2;
        s.enemies.push({
          id: s.nextId++,
          kind: spawnKind,
          pos: { x: e.pos.x + Math.cos(ang) * 0.2, y: e.pos.y + Math.sin(ang) * 0.2 },
          hp, maxHp: hp,
          baseSpeed: child.speed * s.enemySpeedMul,
          slowUntil: 0, slowFactor: 1,
          waypoint: e.waypoint,
          reward: child.reward, radius: child.radius,
          dead: false, leaked: false, hitFlash: 0,
          burnUntil: 0, burnDps: 0, poisonUntil: 0, poisonDps: 0,
          phaseUntil: 0, nextTeleportAt: 0, nextSpawnAt: 0, spawnCount: 0,
          hasSplit: false, exploded: false,
          shieldUntil: 0, shieldReduce: 0,
        });
      }
      s.events.push({ type: 'split', pos: { ...e.pos } });
    }
    if (def.explodes && !e.exploded) {
      e.exploded = true;
      for (let i = 0; i < def.explodes.count; i++) {
        const spawnKind = def.explodes.spawnKind;
        const child = ENEMY_DEFS[spawnKind];
        const hp = child.hp * hpScaleForWave(s.wave) * s.enemyHpMul;
        s.enemies.push({
          id: s.nextId++,
          kind: spawnKind,
          pos: { x: e.pos.x, y: e.pos.y },
          hp, maxHp: hp,
          baseSpeed: child.speed * s.enemySpeedMul,
          slowUntil: 0, slowFactor: 1,
          waypoint: e.waypoint,
          reward: child.reward, radius: child.radius,
          dead: false, leaked: false, hitFlash: 0,
          burnUntil: 0, burnDps: 0, poisonUntil: 0, poisonDps: 0,
          phaseUntil: 0, nextTeleportAt: 0, nextSpawnAt: 0, spawnCount: 0,
          hasSplit: false, exploded: false,
          shieldUntil: 0, shieldReduce: 0,
        });
      }
      s.events.push({ type: 'explode', pos: { ...e.pos } });
    }
  }
}

// -------------------- Towers --------------------

function updateTower(s: SimState, world: GameWorld, t: SimTower, dt: number) {
  t.cooldown -= dt;
  if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 6);

  const def = TOWER_DEFS[t.kind];
  if (def.damage === 0) return;

  let best: SimEnemy | null = null;
  let bestScore = -Infinity;
  for (const e of s.enemies) {
    if (e.dead) continue;
    if (e.phaseUntil > s.time) continue;
    const d = Math.hypot(e.pos.x - t.pos.x, e.pos.y - t.pos.y);
    if (d > def.range) continue;
    const next = world.pathWorld[Math.min(e.waypoint, world.pathWorld.length - 1)];
    const distToNext = Math.hypot(next.x - e.pos.x, next.y - e.pos.y);
    const score = e.waypoint * 100000 - distToNext;
    if (score > bestScore) { bestScore = score; best = e; }
  }

  if (!best) { t.targetId = null; return; }

  t.targetId = best.id;
  t.angle = Math.atan2(best.pos.y - t.pos.y, best.pos.x - t.pos.x);

  if (t.cooldown <= 0) {
    t.cooldown = 1 / (def.fireRate * t.fireRateBoost);
    t.recoil = 1;

    const dx = best.pos.x - t.pos.x;
    const dy = best.pos.y - t.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    s.projectiles.push({
      id: s.nextId++,
      kind: t.kind,
      pos: { x: t.pos.x + (dx / d) * 0.35, y: t.pos.y + (dy / d) * 0.35 },
      vel: { x: (dx / d) * def.projectileSpeed, y: (dy / d) * def.projectileSpeed },
      targetId: best.id,
      target: { x: best.pos.x, y: best.pos.y },
      damage: def.damage,
      splash: def.splash,
      slow: def.slow,
      dot: def.dot,
      chain: def.chain ? { remaining: def.chain.count - 1, range: def.chain.range, falloff: def.chain.falloff } : undefined,
      pierce: def.pierce,
      piercedIds: def.pierce ? [] : undefined,
      armorPierce: def.armorPierce,
      push: def.push,
      ttl: 2,
      dead: false,
    });
    s.events.push({ type: 'shoot', pos: { ...t.pos } });
  }
}

// -------------------- Projectiles --------------------

function updateProjectile(s: SimState, p: SimProjectile, dt: number) {
  const target = p.targetId != null
    ? s.enemies.find(e => e.id === p.targetId && !e.dead)
    : undefined;

  if (target) { p.target.x = target.pos.x; p.target.y = target.pos.y; }

  const dx = p.target.x - p.pos.x;
  const dy = p.target.y - p.pos.y;
  const dist = Math.hypot(dx, dy);
  const speed = Math.hypot(p.vel.x, p.vel.y) || 1;

  if (dist > 0.001) {
    p.vel.x = (dx / dist) * speed;
    p.vel.y = (dy / dist) * speed;
  }

  const step = speed * dt;
  if (dist <= step + 0.1 || (p.pierce !== undefined && p.pierce > 0)) {
    if (p.pierce !== undefined && p.pierce > 0 && !target) {
      // pierce continues
    } else if (target) {
      impact(s, p, target);
      if (p.pierce !== undefined && p.pierce > 0) {
        p.pierce--;
        p.piercedIds?.push(target.id);
        p.ttl = Math.max(p.ttl, 0.8);
        p.targetId = null;
      } else {
        p.dead = true;
        return;
      }
    } else {
      p.dead = true;
      return;
    }
  }

  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.ttl -= dt;
  if (p.ttl <= 0) { p.dead = true; }
}

function impact(s: SimState, p: SimProjectile, target: SimEnemy | undefined) {
  if (p.splash) {
    for (const e of s.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
      if (d <= p.splash) {
        const falloff = 1 - 0.5 * (d / p.splash);
        damageEnemy(s, e, p.damage * falloff);
        if (p.slow) applySlow(s, e, p.slow);
        if (p.dot) applyDot(s, e, p.dot);
      }
    }
    s.events.push({ type: 'hit', pos: { ...p.pos }, enemyKind: target?.kind });
    return;
  }

  if (target && !target.dead) {
    damageEnemy(s, target, p.damage);
    if (p.slow) applySlow(s, target, p.slow);
    if (p.dot) applyDot(s, target, p.dot);
    if (p.push) pushEnemyBack(s, target, p.push);
    if (p.chain) chainLightning(s, p, target);
    s.events.push({ type: 'hit', pos: { ...p.pos }, enemyKind: target.kind });
  } else {
    s.events.push({ type: 'hit', pos: { ...p.pos } });
  }
}

function applySlow(s: SimState, e: SimEnemy, slow: { factor: number; duration: number }) {
  e.slowFactor = Math.min(e.slowFactor, slow.factor);
  e.slowUntil = s.time + slow.duration;
}

function applyDot(s: SimState, e: SimEnemy, dot: { dps: number; duration: number; kind: 'burn' | 'poison' }) {
  if (dot.kind === 'burn') {
    e.burnDps = Math.max(e.burnDps, dot.dps);
    e.burnUntil = s.time + dot.duration;
  } else {
    e.poisonDps = Math.max(e.poisonDps, dot.dps);
    e.poisonUntil = s.time + dot.duration;
  }
}

function pushEnemyBack(_s: SimState, _e: SimEnemy, _tiles: number) {
  // No-op stub. Gravity tower still applies slow + damage.
  // Real push-back needs world threaded into impact.
}

function chainLightning(s: SimState, p: SimProjectile, first: SimEnemy) {
  if (!p.chain) return;
  let source = first;
  let remaining = p.chain.remaining;
  let damage = p.damage * p.chain.falloff;
  const hit = new Set<number>([first.id]);

  while (remaining > 0) {
    let next: SimEnemy | null = null;
    let bestD = Infinity;
    for (const e of s.enemies) {
      if (e.dead || hit.has(e.id)) continue;
      if (e.phaseUntil > s.time) continue;
      const d = Math.hypot(e.pos.x - source.pos.x, e.pos.y - source.pos.y);
      if (d <= p.chain.range && d < bestD) { bestD = d; next = e; }
    }
    if (!next) break;
    hit.add(next.id);
    damageEnemy(s, next, damage);
    s.events.push({ type: 'chain', pos: { ...next.pos }, amount: damage });
    source = next;
    damage *= p.chain.falloff;
    remaining--;
  }
}

// -------------------- Player actions --------------------

export function tryPlaceTower(
  s: SimState, world: GameWorld, col: number, row: number,
): boolean {
  if (!s.selectedTower || s.status !== 'playing') return false;
  if (s.waveActive) return false;
  if (!world.buildable.has(`${col},${row}`)) return false;
  if (s.towers.some(t => t.col === col && t.row === row)) return false;
  if (!s.availableTowers.includes(s.selectedTower)) return false;

  const def = TOWER_DEFS[s.selectedTower];
  if (s.money < def.cost) return false;

  s.money -= def.cost;
  const pos = cellCenter(col, row);
  s.towers.push({
    id: s.nextId++,
    kind: s.selectedTower,
    col, row, pos,
    cooldown: 0,
    angle: -Math.PI / 2,
    targetId: null,
    recoil: 0,
    fireRateBoost: 1,
  });
  s.events.push({ type: 'place', pos: { ...pos } });
  return true;
}

export function sellTower(s: SimState, id: number): boolean {
  if (s.waveActive) return false;
  const idx = s.towers.findIndex(t => t.id === id);
  if (idx < 0) return false;
  const t = s.towers[idx];
  const def = TOWER_DEFS[t.kind];
  s.money += def.sellValue;
  s.towers.splice(idx, 1);
  s.events.push({ type: 'sell', pos: { ...t.pos }, amount: def.sellValue });
  return true;
}