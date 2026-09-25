import * as THREE from 'three';
import type { BiomeDef } from './biomes';
import type { GameWorld } from '../../game/world';

export interface Terrain {
  group: THREE.Group;
  dispose(): void;
}

export function buildTerrain(world: GameWorld, biome: BiomeDef, rng: () => number): Terrain {
  const g = new THREE.Group();

  // --- Foundation plate: raised slab ---
  const slabHeight = 0.5;
  const slabGeo = new THREE.BoxGeometry(world.cols + 0.4, slabHeight, world.rows + 0.4);
  const slabMat = new THREE.MeshStandardMaterial({
    color: biome.groundEdge, roughness: 0.85, metalness: 0.15,
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = -slabHeight / 2;
  slab.receiveShadow = true;
  slab.castShadow = true;
  g.add(slab);

  // --- Top surface: tiled ground ---
  const groundMat = new THREE.MeshStandardMaterial({
    color: biome.ground, roughness: 0.9, metalness: 0.05,
  });
  const groundGeo = new THREE.PlaneGeometry(world.cols, world.rows);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);

  // --- Path tiles: raised cobblestone road with curbs ---
  const pathMat = new THREE.MeshStandardMaterial({
    color: biome.path, roughness: 0.7, metalness: 0.2,
    emissive: biome.pathGlow, emissiveIntensity: 0.06,
  });
  const curbMat = new THREE.MeshStandardMaterial({
    color: biome.groundEdge, roughness: 0.8,
  });
  const pathTiles: { c: number; r: number }[] = [];
  for (const key of world.pathCells) {
    const [c, r] = key.split(',').map(Number);
    pathTiles.push({ c, r });
  }
  // Main path slab per tile
  for (const { c, r } of pathTiles) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.1, 1),
      pathMat,
    );
    tile.position.set(c + 0.5 - world.cols / 2, 0.05, r + 0.5 - world.rows / 2);
    tile.receiveShadow = true;
    g.add(tile);
  }
  // Curbs: add a small curb block on any edge facing a non-path tile
  const pathSet = world.pathCells;
  for (const { c, r } of pathTiles) {
    const wx = c + 0.5 - world.cols / 2;
    const wz = r + 0.5 - world.rows / 2;
    const neighbors = [
      { key: `${c},${r - 1}`, x: 0, z: -0.5 },
      { key: `${c},${r + 1}`, x: 0, z:  0.5 },
      { key: `${c - 1},${r}`, x: -0.5, z: 0 },
      { key: `${c + 1},${r}`, x:  0.5, z: 0 },
    ];
    for (const n of neighbors) {
      if (pathSet.has(n.key)) continue;
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(
          n.x === 0 ? 1 : 0.06,
          0.14,
          n.z === 0 ? 1 : 0.06,
        ),
        curbMat,
      );
      curb.position.set(wx + n.x, 0.07, wz + n.z);
      curb.castShadow = true;
      g.add(curb);
    }
  }

  // --- Entrance & exit gates ---
  const entrance = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.08, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0x7ee787, emissive: 0x7ee787, emissiveIntensity: 1.2,
      roughness: 0.3,
    }),
  );
  entrance.rotation.x = -Math.PI / 2;
  const start = world.pathWorld[0];
  entrance.position.set(start.x - world.cols / 2, 0.15, start.y - world.rows / 2);
  g.add(entrance);

  const exit = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.08, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0xf85149, emissive: 0xf85149, emissiveIntensity: 1.2,
      roughness: 0.3,
    }),
  );
  exit.rotation.x = -Math.PI / 2;
  const end = world.pathWorld[world.pathWorld.length - 1];
  exit.position.set(end.x - world.cols / 2, 0.15, end.y - world.rows / 2);
  g.add(exit);

  // --- Props along the edges (biome-specific) ---
  const propGroup = new THREE.Group();
  g.add(propGroup);

  const edgeCells: { c: number; r: number }[] = [];
  for (let r = 0; r < world.rows; r++) {
    for (let c = 0; c < world.cols; c++) {
      if (pathSet.has(`${c},${r}`)) continue;
      // Only on the outer ring or 1 tile inside
      const distToEdge = Math.min(c, world.cols - 1 - c, r, world.rows - 1 - r);
      if (distToEdge > 1) continue;
      if (rng() < 0.65) continue; // skip most
      edgeCells.push({ c, r });
    }
  }

  for (const { c, r } of edgeCells) {
    const wx = c + 0.5 - world.cols / 2;
    const wz = r + 0.5 - world.rows / 2;
    const prop = buildProp(biome, rng);
    prop.position.set(wx, 0, wz);
    prop.rotation.y = rng() * Math.PI * 2;
    const scale = 0.7 + rng() * 0.6;
    prop.scale.setScalar(scale);
    propGroup.add(prop);
  }

  // --- Rim wall: short rock border around the slab ---
  const wallMat = new THREE.MeshStandardMaterial({
    color: biome.groundEdge, roughness: 0.9, metalness: 0.1,
  });
  const wallH = 0.3;
  const wallT = 0.15;
  const walls = [
    { w: world.cols + 0.4, h: wallH, d: wallT, x: 0, z: -(world.rows / 2 + 0.2) },
    { w: world.cols + 0.4, h: wallH, d: wallT, x: 0, z:  (world.rows / 2 + 0.2) },
    { w: wallT, h: wallH, d: world.rows + 0.4, x: -(world.cols / 2 + 0.2), z: 0 },
    { w: wallT, h: wallH, d: world.rows + 0.4, x:  (world.cols / 2 + 0.2), z: 0 },
  ];
  for (const w of walls) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(w.w, w.h, w.d),
      wallMat,
    );
    wall.position.set(w.x, w.h / 2, w.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
  }

  return {
    group: g,
    dispose() {
      g.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach(mm => mm.dispose());
          else m.dispose();
        }
      });
    },
  };
}

function buildProp(biome: BiomeDef, rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: biome.propColor, roughness: 0.75, metalness: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: biome.propAccent, roughness: 0.5, metalness: 0.4,
    emissive: biome.propAccent, emissiveIntensity: 0.2,
  });

  if (biome.props === 'trees') {
    const h = 0.5 + rng() * 0.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 6), mat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 8), accentMat);
    foliage.position.y = h + 0.2;
    foliage.castShadow = true;
    g.add(foliage);
  } else if (biome.props === 'crystals') {
    const h = 0.6 + rng() * 0.6;
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.15, h, 5), accentMat);
    crystal.position.y = h / 2;
    crystal.rotation.z = (rng() - 0.5) * 0.3;
    crystal.castShadow = true;
    g.add(crystal);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), mat);
    base.position.y = 0.08;
    g.add(base);
  } else if (biome.props === 'lava') {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rng() * 0.2, 0), mat);
    rock.position.y = 0.2;
    rock.scale.set(1, 0.7, 1);
    rock.castShadow = true;
    g.add(rock);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), accentMat);
    glow.position.set((rng() - 0.5) * 0.2, 0.32, (rng() - 0.5) * 0.2);
    g.add(glow);
  } else if (biome.props === 'cacti') {
    const h = 0.6 + rng() * 0.4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, h, 8), mat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 2; i++) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), mat);
      arm.position.set((i === 0 ? -1 : 1) * 0.15, h * 0.55, 0);
      arm.rotation.z = (i === 0 ? 1 : -1) * Math.PI / 3;
      arm.castShadow = true;
      g.add(arm);
    }
  } else {
    // obelisks
    const h = 0.8 + rng() * 0.8;
    const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), mat);
    obelisk.position.y = h / 2;
    obelisk.castShadow = true;
    g.add(obelisk);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), accentMat);
    cap.position.y = h + 0.1;
    g.add(cap);
  }

  return g;
}