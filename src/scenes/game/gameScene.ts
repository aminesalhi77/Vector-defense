import * as THREE from 'three';
import type { LevelConfig, TowerKind } from '../../core/types';
import type { SimState, SimEvent } from '../../game/simTypes';
import { buildWorld, type GameWorld } from '../../game/world';
import { TOWER_DEFS } from '../../game/simConfig';
import { biomeFor, BIOMES } from './biomes';
import { buildTerrain } from './terrain';
import { createNightSky } from './sky';
import { createPostFX, type PostFX } from './postfx';
import { createParticleSystem, type ParticleSystem } from './particles';
import {
  buildTowerMesh, buildEnemyMesh, buildProjectileMesh,
  disposeObject3D, TOWER_COLORS, ENEMY_COLORS,
} from './builders';
import { createCameraControls, type CameraControls } from './cameraControls';

export interface GameScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: CameraControls;
  world: GameWorld;
  render(renderer: THREE.WebGLRenderer, dt: number, sim: SimState): void;
  onResize(w: number, h: number): void;
  tick(dt: number, sim: SimState): void;
  pickCell(ndcX: number, ndcY: number): { col: number; row: number } | null;
  setHover(cell: { col: number; row: number } | null, selected: TowerKind | null, occupied: Set<string>): void;
  dispose(): void;
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

export function createGameScene(level: LevelConfig, canvas: HTMLElement): GameScene {
  const world = buildWorld(level);
  const biome = BIOMES[biomeFor(level.id)];
  const rng = mulberry32(level.seed ^ 0xa5a5a5);

  const scene = new THREE.Scene();
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  const sky = createNightSky();
  scene.add(sky.group);

  // ---- Lighting ----
  const moonLight = new THREE.DirectionalLight(0xcfd8ff, 1.1);
  moonLight.position.copy(sky.moonDirection.clone().multiplyScalar(30));
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  const shadowSpan = Math.max(world.cols, world.rows) * 0.6 + 4;
  moonLight.shadow.camera.left = -shadowSpan;
  moonLight.shadow.camera.right = shadowSpan;
  moonLight.shadow.camera.top = shadowSpan;
  moonLight.shadow.camera.bottom = -shadowSpan;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 80;
  moonLight.shadow.bias = -0.0004;
  moonLight.shadow.normalBias = 0.02;
  scene.add(moonLight);

  scene.add(new THREE.AmbientLight(biome.ambient, 0.35));

  const fill = new THREE.DirectionalLight(biome.fill, 0.4);
  fill.position.set(-12, 6, -10);
  scene.add(fill);

  const hemi = new THREE.HemisphereLight(0x8fa0d0, biome.ground, 0.3);
  scene.add(hemi);

  // ---- Terrain ----
  const terrain = buildTerrain(world, biome, rng);
  scene.add(terrain.group);

  // ---- Hover & ghost ----
  const hoverTile = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.03, 1),
    new THREE.MeshBasicMaterial({
      color: 0x3fb950, transparent: true, opacity: 0.4, depthWrite: false,
    }),
  );
  hoverTile.position.y = 0.13;
  hoverTile.visible = false;
  scene.add(hoverTile);

  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(0.985, 1, 96),
    new THREE.MeshBasicMaterial({
      color: 0x58a6ff, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  rangeRing.rotation.x = -Math.PI / 2;
  rangeRing.position.y = 0.15;
  rangeRing.visible = false;
  scene.add(rangeRing);

  const rangeDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshBasicMaterial({
      color: 0x58a6ff, transparent: true, opacity: 0.1,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  rangeDisc.rotation.x = -Math.PI / 2;
  rangeDisc.position.y = 0.14;
  rangeDisc.visible = false;
  scene.add(rangeDisc);

  const ghost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.4, 0.7, 14),
    new THREE.MeshBasicMaterial({
      color: 0x58a6ff, transparent: true, opacity: 0.5, depthWrite: false,
    }),
  );
  ghost.position.y = 0.4;
  ghost.visible = false;
  scene.add(ghost);

  // ---- Particles ----
  const particles = createParticleSystem();
  particles.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  scene.add(particles.object);

  // ---- Entity maps ----
  const towerMeshes = new Map<number, THREE.Group>();
  const enemyMeshes = new Map<number, THREE.Group>();
  const projMeshes = new Map<number, THREE.Mesh>();

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const controls = createCameraControls(camera, canvas);
  controls.setTarget(new THREE.Vector3(0, 0, 0));

  const tmpVec = new THREE.Vector3();

  function pickCell(ndcX: number, ndcY: number) {
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
    const simX = hit.x + world.cols / 2;
    const simY = hit.z + world.rows / 2;
    const col = Math.floor(simX);
    const row = Math.floor(simY);
    if (col < 0 || col >= world.cols || row < 0 || row >= world.rows) return null;
    return { col, row };
  }

  function setHover(
    cell: { col: number; row: number } | null,
    selected: TowerKind | null,
    occupied: Set<string>,
  ) {
    if (!cell) {
      hoverTile.visible = false;
      rangeRing.visible = false;
      rangeDisc.visible = false;
      ghost.visible = false;
      return;
    }

    const key = `${cell.col},${cell.row}`;
    const isPath = world.pathCells.has(key);
    const isOccupied = occupied.has(key);
    const canPlace = !isPath && !isOccupied;

    const wx = cell.col + 0.5 - world.cols / 2;
    const wz = cell.row + 0.5 - world.rows / 2;

    hoverTile.visible = true;
    hoverTile.position.set(wx, 0.13, wz);
    (hoverTile.material as THREE.MeshBasicMaterial).color.setHex(
      !selected ? 0x58a6ff : (canPlace ? 0x3fb950 : 0xf85149),
    );
    (hoverTile.material as THREE.MeshBasicMaterial).opacity = selected ? 0.5 : 0.25;

    if (!selected) {
      rangeRing.visible = false;
      rangeDisc.visible = false;
      ghost.visible = false;
      return;
    }

    const def = TOWER_DEFS[selected];
    rangeRing.visible = true;
    rangeDisc.visible = true;
    rangeRing.position.set(wx, 0.15, wz);
    rangeDisc.position.set(wx, 0.14, wz);
    rangeRing.scale.setScalar(def.range);
    rangeDisc.scale.setScalar(def.range);

    const towerColor = TOWER_COLORS[selected].glow;
    const lineColor = canPlace ? towerColor : 0xf85149;
    (rangeRing.material as THREE.MeshBasicMaterial).color.setHex(lineColor);
    (rangeDisc.material as THREE.MeshBasicMaterial).color.setHex(lineColor);

    ghost.visible = canPlace;
    ghost.position.set(wx, 0.4, wz);
    (ghost.material as THREE.MeshBasicMaterial).color.setHex(towerColor);
  }

  // ---- Event → particle dispatch ----
  function emitForEvent(ev: SimEvent) {
    const wx = ev.pos.x - world.cols / 2;
    const wz = ev.pos.y - world.rows / 2;

    switch (ev.type) {
      case 'hit': {
        // Sparks — white flash + enemy-tinted debris
        const enemyColor = ev.enemyKind ? ENEMY_COLORS[ev.enemyKind].body : 0xffd88a;
        tmpVec.set(wx, 0.6, wz);
        particles.spawnBurst(tmpVec, 0xffffff, 3, {
          speed: 4, spread: 2, gravity: 12, drag: 0.9,
          life: 0.18, size: 0.09,
        });
        particles.spawnBurst(tmpVec, enemyColor, 4, {
          speed: 2.5, spread: 2, gravity: 8, drag: 0.9,
          life: 0.4, size: 0.13,
        });
        break;
      }

      case 'kill': {
        const enemyColor = ev.enemyKind ? ENEMY_COLORS[ev.enemyKind].body : 0xffbb44;
        tmpVec.set(wx, 0.5, wz);
        // Big color burst
        particles.spawnBurst(tmpVec, enemyColor, 16, {
          speed: 5, spread: 2, gravity: 10, drag: 0.9,
          life: 0.6, size: 0.18,
        });
        // Gold sparks
        particles.spawnBurst(tmpVec, 0xffd866, 10, {
          speed: 4, spread: 2, gravity: 14, drag: 0.9,
          life: 0.45, size: 0.12,
        });
        // Expanding white core
        particles.spawnBurst(tmpVec, 0xffffff, 6, {
          speed: 2, spread: 2, gravity: 0, drag: 0.88,
          life: 0.25, size: 0.2,
        });
        break;
      }

      case 'leak': {
        tmpVec.set(wx, 0.35, wz);
        particles.spawnBurst(tmpVec, 0xff4444, 24, {
          speed: 6, spread: 2, gravity: 4, drag: 0.9,
          life: 0.7, size: 0.22,
        });
        // Ring of red rising up
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          tmpVec.set(wx + Math.cos(a) * 0.3, 0.15, wz + Math.sin(a) * 0.3);
          particles.spawnBurst(tmpVec, 0xff2222, 1, {
            speed: 0.4, dirY: 1, dirX: 0, dirZ: 0, spread: 0.4,
            gravity: -1, drag: 0.94, life: 1.1, size: 0.16,
          });
        }
        break;
      }

      case 'shoot': {
        const towerColor = ev.towerKind ? TOWER_COLORS[ev.towerKind].glow : 0xffeebb;
        tmpVec.set(wx, 0.9, wz);
        particles.spawnBurst(tmpVec, towerColor, 2, {
          speed: 2, spread: 2, gravity: 6, drag: 0.9,
          life: 0.18, size: 0.1,
        });
        break;
      }

      case 'place': {
        const towerColor = ev.towerKind ? TOWER_COLORS[ev.towerKind].glow : 0x7ee787;
        // Dust ring expanding out
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2 + Math.random() * 0.2;
          tmpVec.set(wx, 0.1, wz);
          particles.spawnBurst(tmpVec, towerColor, 1, {
            speed: 2.6, dirX: Math.cos(a), dirY: 1.4, dirZ: Math.sin(a),
            spread: 0.25, gravity: 6, drag: 0.9,
            life: 0.5, size: 0.16,
          });
        }
        // Central flash
        tmpVec.set(wx, 0.2, wz);
        particles.spawnBurst(tmpVec, 0xffffff, 6, {
          speed: 1.5, spread: 2, gravity: -1, drag: 0.9,
          life: 0.35, size: 0.2,
        });
        break;
      }

      case 'sell': {
        tmpVec.set(wx, 0.5, wz);
        particles.spawnBurst(tmpVec, 0xffd866, 18, {
          speed: 3.5, spread: 2, gravity: 8, drag: 0.92,
          life: 0.7, size: 0.15,
        });
        break;
      }

      case 'split': {
        const enemyColor = ev.enemyKind ? ENEMY_COLORS[ev.enemyKind].body : 0x4ac75a;
        tmpVec.set(wx, 0.5, wz);
        particles.spawnBurst(tmpVec, enemyColor, 20, {
          speed: 3.5, spread: 2, gravity: 6, drag: 0.9,
          life: 0.55, size: 0.18,
        });
        break;
      }

      case 'spawn': {
        tmpVec.set(wx, 0.35, wz);
        particles.spawnBurst(tmpVec, 0xaa44ff, 12, {
          speed: 2, spread: 2, gravity: -1, drag: 0.9,
          life: 0.6, size: 0.18,
        });
        break;
      }

      case 'heal': {
        tmpVec.set(wx + (Math.random() - 0.5) * 0.4, 0.3, wz + (Math.random() - 0.5) * 0.4);
        particles.spawnBurst(tmpVec, 0x88ffaa, 8, {
          speed: 0.8, dirY: 1, spread: 0.4, gravity: -2, drag: 0.97,
          life: 0.9, size: 0.16,
        });
        break;
      }

      case 'teleport': {
        tmpVec.set(wx, 0.5, wz);
        // Inward spiraling purple particles
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          const r = 0.9;
          tmpVec.set(wx + Math.cos(a) * r, 0.5, wz + Math.sin(a) * r);
          particles.spawnBurst(tmpVec, 0xaa44ff, 1, {
            speed: 4, dirX: -Math.cos(a), dirY: 1, dirZ: -Math.sin(a),
            spread: 0.15, gravity: 0, drag: 0.9,
            life: 0.4, size: 0.2,
          });
        }
        break;
      }

      case 'explode': {
        tmpVec.set(wx, 0.5, wz);
        // Fire
        particles.spawnBurst(tmpVec, 0xff7a2a, 32, {
          speed: 6, spread: 2, gravity: 12, drag: 0.88,
          life: 0.75, size: 0.28,
        });
        particles.spawnBurst(tmpVec, 0xffcc44, 16, {
          speed: 4, spread: 2, gravity: 10, drag: 0.9,
          life: 0.5, size: 0.22,
        });
        particles.spawnBurst(tmpVec, 0xffffff, 8, {
          speed: 3, spread: 2, gravity: 4, drag: 0.9,
          life: 0.3, size: 0.32,
        });
        // Smoke rising
        particles.spawnBurst(tmpVec, 0x333340, 12, {
          speed: 1.5, dirY: 1, spread: 1.2, gravity: -1.5, drag: 0.95,
          life: 1.1, size: 0.3,
        });
        break;
      }

      case 'chain': {
        tmpVec.set(wx, 0.7, wz);
        particles.spawnBurst(tmpVec, 0xffffff, 10, {
          speed: 5, spread: 2, gravity: 0, drag: 0.85,
          life: 0.2, size: 0.22,
        });
        particles.spawnBurst(tmpVec, 0x7ee787, 6, {
          speed: 3, spread: 2, gravity: 2, drag: 0.9,
          life: 0.35, size: 0.14,
        });
        break;
      }

      case 'phase': {
        tmpVec.set(wx, 0.6, wz);
        particles.spawnBurst(tmpVec, 0xddccff, 8, {
          speed: 1.5, spread: 2, gravity: -1, drag: 0.9,
          life: 0.6, size: 0.18,
        });
        break;
      }
    }
  }

  function tick(dt: number, sim: SimState) {
    controls.update(dt);

    // ----- Towers -----
    const seenT = new Set<number>();
    for (const t of sim.towers) {
      seenT.add(t.id);
      let g = towerMeshes.get(t.id);
      if (!g) {
        g = buildTowerMesh(t.kind);
        g.position.set(t.pos.x - world.cols / 2, 0, t.pos.y - world.rows / 2);
        scene.add(g);
        towerMeshes.set(t.id, g);
      }
      const turret = g.userData.turret as THREE.Group | undefined;
      const barrel = g.userData.barrel as THREE.Mesh | undefined;
      const baseX = (g.userData.barrelBaseX as number) ?? 0;
      if (turret) turret.rotation.y = -t.angle;
      if (barrel) barrel.position.x = baseX - t.recoil * 0.14;
    }
    for (const [id, g] of towerMeshes) {
      if (!seenT.has(id)) {
        scene.remove(g);
        disposeObject3D(g);
        towerMeshes.delete(id);
      }
    }

    // ----- Enemies -----
    const seenE = new Set<number>();
    for (const e of sim.enemies) {
      seenE.add(e.id);
      let g = enemyMeshes.get(e.id);
      if (!g) {
        g = buildEnemyMesh(e.kind);
        scene.add(g);
        enemyMeshes.set(e.id, g);
      }
      const walkPhase = sim.time * (e.kind === 'runner' ? 16 : e.kind === 'tank' ? 6 : 11) + e.id * 0.9;
      const bob = Math.sin(walkPhase) * 0.045;

      const legL = g.userData.legL as THREE.Mesh | undefined;
      const legR = g.userData.legR as THREE.Mesh | undefined;
      const armL = g.userData.armL as THREE.Mesh | undefined;
      const armR = g.userData.armR as THREE.Mesh | undefined;
      const torso = g.userData.body as THREE.Mesh | undefined;
      const torsoY = (g.userData.torsoY as number) ?? 0.6;
      const legY = (g.userData.legY as number) ?? 0;

      const path = world.pathWorld;
      let facing = 0;
      if (e.waypoint < path.length) {
        const n = path[e.waypoint];
        facing = Math.atan2(n.y - e.pos.y, n.x - e.pos.x);
      }

      const baseY = e.radius * 0.9 + 0.08;
      g.position.set(
        e.pos.x - world.cols / 2,
        baseY + (e.kind === 'flyer' ? 0.7 + Math.sin(walkPhase * 0.5) * 0.15 : 0) + bob,
        e.pos.y - world.rows / 2,
      );
      g.rotation.y = -facing;

      if (legL && legR) {
        const swing = Math.sin(walkPhase) * 0.4;
        legL.rotation.x = swing;
        legR.rotation.x = -swing;
        legL.position.y = legY;
        legR.position.y = legY;
      }
      if (armL && armR) {
        const swing = Math.sin(walkPhase) * 0.35;
        armL.rotation.x = -swing;
        armR.rotation.x = swing;
      }
      if (torso) {
        torso.position.y = torsoY + Math.abs(Math.sin(walkPhase)) * 0.03;
      }

      const wingL = g.userData.wingL as THREE.Mesh | undefined;
      const wingR = g.userData.wingR as THREE.Mesh | undefined;
      if (wingL && wingR) {
        const flap = Math.sin(sim.time * 18 + e.id) * 0.6;
        wingL.rotation.z = flap;
        wingR.rotation.z = -flap;
      }
      const shield = g.userData.shield as THREE.Mesh | undefined;
      if (shield) {
        const pulse = 0.55 + Math.sin(sim.time * 4 + e.id) * 0.15;
        (shield.material as THREE.MeshStandardMaterial).opacity = pulse;
        shield.lookAt(camera.position);
      }

      if (torso) {
        const m = torso.material as THREE.MeshStandardMaterial;
        const baseColor = ENEMY_COLORS[e.kind].body;
        if (e.hitFlash > 0) {
          m.emissiveIntensity = 1.6;
          m.emissive.setHex(0xffffff);
        } else {
          m.emissiveIntensity = 0.12;
          m.emissive.setHex(baseColor);
          m.color.setHex(sim.time < e.slowUntil ? 0x9ec8ff : baseColor);
        }
      }

      // ----- Ambient status particles -----
      const ex = e.pos.x - world.cols / 2;
      const ez = e.pos.y - world.rows / 2;
      const ey = e.radius + 0.5;

      if (sim.time < e.burnUntil && Math.random() < 0.6) {
        tmpVec.set(ex + (Math.random() - 0.5) * 0.3, ey, ez + (Math.random() - 0.5) * 0.3);
        particles.spawnBurst(tmpVec, 0xff7a2a, 1, {
          speed: 0.7, dirY: 1, spread: 0.3, gravity: -2, drag: 0.95,
          life: 0.5, size: 0.13,
        });
      }
      if (sim.time < e.poisonUntil && Math.random() < 0.4) {
        tmpVec.set(ex + (Math.random() - 0.5) * 0.4, ey - 0.1, ez + (Math.random() - 0.5) * 0.4);
        particles.spawnBurst(tmpVec, 0x7ee787, 1, {
          speed: 0.5, dirY: 1, spread: 0.4, gravity: -1, drag: 0.97,
          life: 0.8, size: 0.12,
        });
      }
      if (sim.time < e.slowUntil && Math.random() < 0.25) {
        tmpVec.set(ex + (Math.random() - 0.5) * 0.5, ey - 0.2, ez + (Math.random() - 0.5) * 0.5);
        particles.spawnBurst(tmpVec, 0x79c0ff, 1, {
          speed: 0.4, dirY: 1, spread: 0.3, gravity: -0.5, drag: 0.95,
          life: 0.6, size: 0.1,
        });
      }
    }
    for (const [id, g] of enemyMeshes) {
      if (!seenE.has(id)) {
        scene.remove(g);
        disposeObject3D(g);
        enemyMeshes.delete(id);
      }
    }

    // ----- Projectiles -----
    const seenP = new Set<number>();
    for (const p of sim.projectiles) {
      seenP.add(p.id);
      let m = projMeshes.get(p.id);
      if (!m) {
        m = buildProjectileMesh(p.kind);
        scene.add(m);
        projMeshes.set(p.id, m);
      }
      const wx = p.pos.x - world.cols / 2;
      const wz = p.pos.y - world.rows / 2;
      m.position.set(wx, 0.7, wz);
      m.rotation.y += dt * 6;

      // Trail
      if (Math.random() < 0.85) {
        tmpVec.set(wx, 0.7, wz);
        const col = TOWER_COLORS[p.kind].glow;
        particles.spawnBurst(tmpVec, col, 1, {
          speed: 0.4, spread: 2, gravity: 0, drag: 0.9,
          life: 0.3, size: 0.09,
        });
      }
    }
    for (const [id, m] of projMeshes) {
      if (!seenP.has(id)) {
        scene.remove(m);
        disposeObject3D(m);
        projMeshes.delete(id);
      }
    }

    // ----- Sim events → particles -----
    for (const ev of sim.events) emitForEvent(ev);

    // ----- Particle update -----
    particles.update(dt);

    // Drain events
    sim.events.length = 0;
  }

  let postfx: PostFX | null = null;

  return {
    scene, camera, controls, world,
    render(renderer, _dt, _sim) {
      if (!postfx) {
        postfx = createPostFX(renderer, scene, camera);
      }
      postfx.render(scene, camera);
    },
    onResize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      postfx?.resize(w, h);
    },
    tick,
    pickCell,
    setHover,
    dispose() {
      controls.dispose();
      postfx?.dispose();
      sky.dispose();
      particles.dispose();
      towerMeshes.forEach(g => { scene.remove(g); disposeObject3D(g); });
      enemyMeshes.forEach(g => { scene.remove(g); disposeObject3D(g); });
      projMeshes.forEach(m => { scene.remove(m); disposeObject3D(m); });
      terrain.dispose();
      scene.traverse(o => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach(mm => mm.dispose());
          else m.dispose();
        }
      });
    },
  };
}