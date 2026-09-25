import * as THREE from 'three';
import type { TowerKind, EnemyKind } from '../../core/types';
import { ENEMY_DEFS } from '../../game/simConfig';

// ============================================================
//   TOWER COLORS
// ============================================================

export const TOWER_COLORS: Record<TowerKind, { base: number; accent: number; glow: number }> = {
  arrow:    { base: 0x4a7fb5, accent: 0xa5d6ff, glow: 0x58a6ff },
  cannon:   { base: 0xb55a2a, accent: 0xffa657, glow: 0xf0883e },
  frost:    { base: 0x4a9ad5, accent: 0xc9e8ff, glow: 0x79c0ff },
  sniper:   { base: 0x7a4ab5, accent: 0xd2a8ff, glow: 0xa371f7 },
  tesla:    { base: 0x4aa55a, accent: 0xb9f5c6, glow: 0x7ee787 },
  poison:   { base: 0x3a8a4a, accent: 0x7ee787, glow: 0x3fb950 },
  flame:    { base: 0xc75a2a, accent: 0xffb37a, glow: 0xff7a2a },
  ballista: { base: 0x8a6a3a, accent: 0xd4b88a, glow: 0xc79a5a },
  void:     { base: 0x4a2a6a, accent: 0xb58aff, glow: 0x9a5aff },
  beacon:   { base: 0xc7a84a, accent: 0xffe68a, glow: 0xffd866 },
  mortar:   { base: 0x6a6a7a, accent: 0xb5b5c5, glow: 0x9a9aaf },
  gravity:  { base: 0x3a4a8a, accent: 0x8aa8ff, glow: 0x5a7aff },
};

// ============================================================
//   ENEMY PALETTES
// ============================================================

export const ENEMY_COLORS: Record<EnemyKind, { body: number; accent: number; eye: number }> = {
  grunt:        { body: 0xc74a42, accent: 0x4a1512, eye: 0xff6655 },
  runner:       { body: 0x4ac75a, accent: 0x154a1a, eye: 0x88ff88 },
  tank:         { body: 0x9a6ac7, accent: 0x3a1555, eye: 0xcc88ff },
  sprinter:     { body: 0x8ac750, accent: 0x2a4a12, eye: 0xd0ff88 },
  scout:        { body: 0xc7a842, accent: 0x4a3a15, eye: 0xffdd66 },
  brute:        { body: 0xa0424a, accent: 0x4a1517, eye: 0xff5544 },
  flyer:        { body: 0x4ac7a8, accent: 0x154a3a, eye: 0x88ffdd },
  drone:        { body: 0x4a8ac7, accent: 0x152a4a, eye: 0x88bbff },
  bomber:       { body: 0xc74a2a, accent: 0x4a1a0a, eye: 0xff8866 },
  harpy:        { body: 0xc7c74a, accent: 0x4a4a15, eye: 0xffec66 },
  shielded:     { body: 0x4a7fc7, accent: 0x152a55, eye: 0x88bbff },
  plated:       { body: 0x7a8a9a, accent: 0x2a3540, eye: 0xccddee },
  ironclad:     { body: 0x4a555f, accent: 0x1a2028, eye: 0xaaccee },
  phantom:      { body: 0x9a8ac7, accent: 0x3a2a55, eye: 0xddccff },
  wraith:       { body: 0x6a4a8a, accent: 0x1a0a2a, eye: 0xcc88ff },
  splitter:     { body: 0x4a8a4a, accent: 0x154a15, eye: 0x88dd88 },
  spawner:      { body: 0x8a4a8a, accent: 0x3a153a, eye: 0xff88ff },
  healer:       { body: 0x4ac7c7, accent: 0x154a4a, eye: 0x88ffff },
  shielder:     { body: 0x4a5ac7, accent: 0x15205a, eye: 0x8899ff },
  juggernaut:   { body: 0x6a3a3a, accent: 0x2a1010, eye: 0xff5544 },
  colossus:     { body: 0x4a3a6a, accent: 0x1a103a, eye: 0xaa88ff },
  behemoth:     { body: 0x3a2a1a, accent: 0x1a1008, eye: 0xff8855 },
  berserker:    { body: 0xc73a3a, accent: 0x4a0a0a, eye: 0xff3333 },
  vampire:      { body: 0x6a1a3a, accent: 0x2a0518, eye: 0xff2277 },
  frost_giant:  { body: 0x6a9ac7, accent: 0x1a3a55, eye: 0xaaeeff },
  fire_elemental: { body: 0xc74a1a, accent: 0x4a1508, eye: 0xffaa66 },
  void_walker:  { body: 0x3a1a5a, accent: 0x15052a, eye: 0xaa44ff },
  necromancer:  { body: 0x2a3a2a, accent: 0x0a150a, eye: 0x66ff66 },
  warlord:      { body: 0x8a3a2a, accent: 0x3a1508, eye: 0xff6633 },
  titan:        { body: 0x5a2a2a, accent: 0x2a0a0a, eye: 0xff4444 },
};

// ============================================================
//   TOWER BUILDER
// ============================================================

export function buildTowerMesh(kind: TowerKind): THREE.Group {
  const col = TOWER_COLORS[kind];
  const g = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x1a2330, roughness: 0.75, metalness: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: col.base, roughness: 0.35, metalness: 0.55,
    emissive: col.base, emissiveIntensity: 0.15,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: col.glow });
  const emissiveMat = new THREE.MeshStandardMaterial({
    color: col.accent, emissive: col.accent, emissiveIntensity: 1.2,
  });

  const plinthGeo = kind === 'void' || kind === 'gravity'
    ? new THREE.CylinderGeometry(0.44, 0.5, 0.14, 6)
    : kind === 'ballista' || kind === 'mortar'
      ? new THREE.CylinderGeometry(0.46, 0.5, 0.16, 4)
      : new THREE.CylinderGeometry(0.42, 0.48, 0.14, 8);
  const plinth = new THREE.Mesh(plinthGeo, stoneMat);
  plinth.position.y = 0.07;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  const midRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.38, 0.12, 8),
    stoneMat,
  );
  midRing.position.y = 0.2;
  midRing.castShadow = true;
  g.add(midRing);

  const columnH = kind === 'sniper' || kind === 'mortar' ? 0.55 : 0.4;
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, columnH, 8),
    accentMat,
  );
  column.position.y = 0.26 + columnH / 2;
  column.castShadow = true;
  g.add(column);

  const topY = 0.26 + columnH;

  for (let i = 0; i < 2; i++) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.02, 6, 16),
      glowMat,
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = topY - 0.28 + i * 0.18;
    g.add(band);
  }

  const turretBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.3, 0.08, 12),
    stoneMat,
  );
  turretBase.position.y = topY;
  turretBase.castShadow = true;
  g.add(turretBase);

  const turret = new THREE.Group();
  turret.position.y = topY + 0.16;
  g.add(turret);

  const headMat = accentMat.clone();
  headMat.emissiveIntensity = 0.35;
  let head: THREE.Mesh;
  switch (kind) {
    case 'cannon':   head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), headMat); head.scale.set(1, 0.85, 1); break;
    case 'frost':    head = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), headMat); break;
    case 'tesla':    head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), headMat); break;
    case 'sniper':   head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.28), headMat); break;
    case 'poison':   head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), headMat); break;
    case 'flame':    head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.24, 10), headMat); break;
    case 'ballista': head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), headMat); break;
    case 'void':     head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), headMat); break;
    case 'beacon':   head = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), emissiveMat); break;
    case 'mortar':   head = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.2, 12), headMat); break;
    case 'gravity':  head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), headMat); break;
    default:         head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), headMat);
  }
  head.castShadow = true;
  turret.add(head);

  const barrelLen =
    kind === 'cannon'   ? 0.6 :
    kind === 'sniper'   ? 1.0 :
    kind === 'tesla'    ? 0.3 :
    kind === 'frost'    ? 0.35 :
    kind === 'poison'   ? 0.45 :
    kind === 'flame'    ? 0.35 :
    kind === 'ballista' ? 0.85 :
    kind === 'void'     ? 0.4 :
    kind === 'mortar'   ? 0.55 :
    kind === 'gravity'  ? 0.4 :
    kind === 'beacon'   ? 0.05 :
    0.48;

  if (kind !== 'beacon') {
    const barrelRadius =
      kind === 'cannon'   ? 0.11 :
      kind === 'sniper'   ? 0.05 :
      kind === 'mortar'   ? 0.14 :
      kind === 'ballista' ? 0.08 :
      0.07;

    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x0f1520, roughness: 0.4, metalness: 0.7,
      emissive: col.glow, emissiveIntensity: 0.15,
    });

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(barrelRadius, barrelRadius * 1.15, barrelLen, 12),
      barrelMat,
    );
    barrel.rotation.z = -Math.PI / 2;
    barrel.position.x = barrelLen / 2;
    barrel.castShadow = true;
    turret.add(barrel);

    const muzzle = new THREE.Mesh(
      new THREE.TorusGeometry(barrelRadius * 1.05, 0.025, 6, 14),
      glowMat,
    );
    muzzle.rotation.y = Math.PI / 2;
    muzzle.position.x = barrelLen;
    turret.add(muzzle);

    g.userData.barrel = barrel;
    g.userData.barrelBaseX = barrelLen / 2;
  }

  if (kind === 'frost') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), emissiveMat);
      shard.position.set(Math.cos(a) * 0.32, Math.sin(a) * 0.1, Math.sin(a) * 0.32);
      shard.rotation.z = a;
      turret.add(shard);
    }
  }
  if (kind === 'tesla') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), emissiveMat);
      prong.position.set(Math.cos(a) * 0.16, 0.2, Math.sin(a) * 0.16);
      turret.add(prong);
    }
  }
  if (kind === 'sniper') {
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4, metalness: 0.7 }),
    );
    scope.rotation.z = -Math.PI / 2;
    scope.position.set(0.08, 0.18, 0);
    turret.add(scope);
  }
  if (kind === 'beacon') {
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.35 + r * 0.1, 0.015, 6, 24),
        glowMat,
      );
      ring.rotation.x = Math.PI / 2 + r * 0.4;
      ring.position.y = r * 0.08;
      turret.add(ring);
    }
  }
  if (kind === 'gravity') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.03, 6, 24),
      emissiveMat,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    turret.add(ring);
  }
  if (kind === 'void') {
    for (let i = 0; i < 2; i++) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.1, 0),
        emissiveMat,
      );
      crystal.position.set(0, 0.28 + i * 0.15, 0);
      turret.add(crystal);
    }
  }

  g.userData.turret = turret;
  return g;
}

// ============================================================
//   ENEMY BUILDER
// ============================================================

type Archetype = 'humanoid' | 'beast' | 'floater' | 'giant' | 'caster';

function archetypeFor(kind: EnemyKind): Archetype {
  const floaters: EnemyKind[] = ['flyer', 'drone', 'bomber', 'harpy', 'phantom', 'wraith', 'void_walker'];
  const giants: EnemyKind[] = ['juggernaut', 'colossus', 'behemoth', 'frost_giant', 'fire_elemental', 'warlord', 'titan'];
  const casters: EnemyKind[] = ['healer', 'shielder', 'necromancer'];
  const beasts: EnemyKind[] = ['scout', 'sprinter'];
  if (floaters.includes(kind)) return 'floater';
  if (giants.includes(kind)) return 'giant';
  if (casters.includes(kind)) return 'caster';
  if (beasts.includes(kind)) return 'beast';
  return 'humanoid';
}

export function buildEnemyMesh(kind: EnemyKind): THREE.Group {
  const col = ENEMY_COLORS[kind];
  const def = ENEMY_DEFS[kind];
  const archetype = archetypeFor(kind);

  const g = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: col.body, roughness: 0.55, metalness: 0.25,
    emissive: col.body, emissiveIntensity: 0.12,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: col.accent, roughness: 0.7, metalness: 0.3 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: col.eye });

  const r = def.radius;
  const h = def.height;

  if (archetype === 'humanoid' || archetype === 'giant') {
    const legLen = h * 0.28;
    const bodyH = h * 0.42;
    const headR = r * 0.65;

    const legGeo = new THREE.CapsuleGeometry(0.06 * (r * 3), legLen * 0.8, 4, 8);
    const legL = new THREE.Mesh(legGeo, darkMat);
    const legR = new THREE.Mesh(legGeo, darkMat);
    legL.position.set(-0.1 * (r * 3), legLen / 2, 0);
    legR.position.set( 0.1 * (r * 3), legLen / 2, 0);
    legL.castShadow = true; legR.castShadow = true;
    g.add(legL, legR);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.7, bodyH, 6, 12), skinMat);
    torso.position.y = legLen + bodyH / 2;
    torso.castShadow = true;
    g.add(torso);

    if (archetype === 'giant') {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(r * 1.6, bodyH * 0.8, r * 0.4),
        new THREE.MeshStandardMaterial({
          color: 0x2a2a3a, roughness: 0.4, metalness: 0.7,
          emissive: col.body, emissiveIntensity: 0.1,
        }),
      );
      plate.position.copy(torso.position);
      plate.position.z = -r * 0.55;
      g.add(plate);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 14, 12), skinMat);
    head.position.y = legLen + bodyH + headR * 0.9;
    head.castShadow = true;
    g.add(head);

    const eyeGeo = new THREE.SphereGeometry(r * 0.12, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-r * 0.25, head.position.y + r * 0.05, -headR * 0.85);
    eyeR.position.set( r * 0.25, head.position.y + r * 0.05, -headR * 0.85);
    g.add(eyeL, eyeR);

    const armGeo = new THREE.CapsuleGeometry(0.05 * (r * 3), bodyH * 0.75, 4, 8);
    const armL = new THREE.Mesh(armGeo, darkMat);
    const armR = new THREE.Mesh(armGeo, darkMat);
    armL.position.set(-(r * 0.75), torso.position.y + bodyH * 0.1, 0);
    armR.position.set( r * 0.75, torso.position.y + bodyH * 0.1, 0);
    armL.castShadow = true; armR.castShadow = true;
    g.add(armL, armR);

    g.userData.body = torso;
    g.userData.head = head;
    g.userData.legL = legL;
    g.userData.legR = legR;
    g.userData.armL = armL;
    g.userData.armR = armR;
    g.userData.torsoY = torso.position.y;
    g.userData.legY = legLen / 2;
  } else if (archetype === 'beast') {
    const legLen = h * 0.35;
    const bodyLen = h * 0.5;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.7, bodyLen, 6, 12), skinMat);
    body.rotation.z = Math.PI / 2;
    body.position.y = legLen + r * 0.5;
    body.castShadow = true;
    g.add(body);

    const legs: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * (r * 3), legLen * 0.9, 4, 8), darkMat);
      const side = i < 2 ? -1 : 1;
      const front = i % 2 === 0 ? -1 : 1;
      leg.position.set(side * r * 0.65, legLen / 2, front * bodyLen * 0.35);
      leg.castShadow = true;
      g.add(leg);
      legs.push(leg);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 12, 10), skinMat);
    head.position.set(0, legLen + r * 0.5, -bodyLen * 0.75);
    head.castShadow = true;
    g.add(head);

    const eyeGeo = new THREE.SphereGeometry(r * 0.14, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-r * 0.3, head.position.y, head.position.z - r * 0.6);
    eyeR.position.set( r * 0.3, head.position.y, head.position.z - r * 0.6);
    g.add(eyeL, eyeR);

    g.userData.body = body;
    g.userData.head = head;
    g.userData.legL = legs[0];
    g.userData.legR = legs[2];
    g.userData.torsoY = body.position.y;
    g.userData.legY = legLen / 2;
  } else if (archetype === 'floater') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 16, 12), skinMat);
    body.position.y = h * 0.55;
    body.castShadow = true;
    g.add(body);

    const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.4, 12, 12), eyeMat);
    core.position.y = body.position.y;
    core.position.z = -r * 1.0;
    g.add(core);

    const wingMat = new THREE.MeshStandardMaterial({
      color: col.accent, roughness: 0.5, metalness: 0.3,
      transparent: true, opacity: 0.85, side: THREE.DoubleSide,
      emissive: col.body, emissiveIntensity: 0.25,
    });
    const wingGeo = new THREE.PlaneGeometry(r * 3.5, r * 1.6);
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-r * 1.8, body.position.y, 0);
    wingR.position.set( r * 1.8, body.position.y, 0);
    wingL.rotation.y = Math.PI / 6;
    wingR.rotation.y = -Math.PI / 6;
    g.add(wingL, wingR);

    g.userData.body = body;
    g.userData.head = core;
    g.userData.wingL = wingL;
    g.userData.wingR = wingR;
    g.userData.torsoY = body.position.y;
  } else {
    const legLen = h * 0.25;
    const bodyH = h * 0.5;

    const robe = new THREE.Mesh(
      new THREE.ConeGeometry(r * 1.2, bodyH * 1.4, 12, 1, true),
      skinMat,
    );
    robe.position.y = legLen + bodyH / 2;
    robe.castShadow = true;
    g.add(robe);

    const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 12, 10), skinMat);
    head.position.y = legLen + bodyH * 1.05;
    head.castShadow = true;
    g.add(head);

    const eyeGeo = new THREE.SphereGeometry(r * 0.14, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-r * 0.28, head.position.y, -r * 0.6);
    eyeR.position.set( r * 0.28, head.position.y, -r * 0.6);
    g.add(eyeL, eyeR);

    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02 * (r * 3), 0.02 * (r * 3), h * 0.9, 6),
      darkMat,
    );
    staff.position.set(r * 0.9, legLen + bodyH * 0.5, 0);
    staff.castShadow = true;
    g.add(staff);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.3, 10, 10),
      new THREE.MeshStandardMaterial({ color: col.eye, emissive: col.eye, emissiveIntensity: 1.2 }),
    );
    orb.position.set(r * 0.9, legLen + bodyH * 0.95, 0);
    g.add(orb);

    g.userData.body = robe;
    g.userData.head = head;
    g.userData.legY = legLen / 2;
    g.userData.torsoY = robe.position.y;
  }

  if (kind === 'warlord' || kind === 'titan') {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.7, r * 1.1, 6),
      new THREE.MeshStandardMaterial({ color: 0xffd866, emissive: 0xffd866, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.8 }),
    );
    const headY = (g.userData.head as THREE.Mesh)?.position.y ?? h;
    crown.position.y = headY + r * 1.2;
    g.add(crown);
  }

  if (kind === 'shielded' || kind === 'shielder') {
    const shield = new THREE.Mesh(
      new THREE.CircleGeometry(r * 1.6, 16),
      new THREE.MeshStandardMaterial({
        color: 0x88bbff, transparent: true, opacity: 0.5,
        emissive: 0x88bbff, emissiveIntensity: 0.6,
        side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    shield.position.set(0, h * 0.5, -r * 1.1);
    g.add(shield);
    g.userData.shield = shield;
  }

  return g;
}

// ============================================================
//   PROJECTILE BUILDER
// ============================================================

export function buildProjectileMesh(kind: TowerKind): THREE.Mesh {
  const col = TOWER_COLORS[kind];
  const r =
    kind === 'cannon'   ? 0.14 :
    kind === 'sniper'   ? 0.06 :
    kind === 'frost'    ? 0.11 :
    kind === 'tesla'    ? 0.08 :
    kind === 'poison'   ? 0.12 :
    kind === 'flame'    ? 0.1  :
    kind === 'ballista' ? 0.05 :
    kind === 'mortar'   ? 0.16 :
    kind === 'void'     ? 0.12 :
    kind === 'gravity'  ? 0.11 :
    0.09;

  const geo = new THREE.SphereGeometry(r, 10, 10);
  const mat = new THREE.MeshBasicMaterial({ color: col.accent });
  const mesh = new THREE.Mesh(geo, mat);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(r * 2.4, 10, 10),
    new THREE.MeshBasicMaterial({
      color: col.glow, transparent: true, opacity: 0.28, depthWrite: false,
    }),
  );
  mesh.add(glow);

  if (kind === 'flame' || kind === 'poison') {
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    mesh.add(inner);
  }

  return mesh;
}

export function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach(mm => mm.dispose());
      else m.dispose();
    }
  });
}