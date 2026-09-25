import * as THREE from 'three';

export interface MenuScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update: (t: number) => void;
  dispose: () => void;
}

export function createMenuScene(): MenuScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050810');
  scene.fog = new THREE.Fog('#050810', 20, 60);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(12, 14, 16);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0x8899cc, 0.6);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xaaccff, 1.2);
  key.position.set(8, 14, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xff88aa, 0.5);
  rim.position.set(-8, 6, -8);
  scene.add(rim);

  const boardGroup = new THREE.Group();
  scene.add(boardGroup);

  const CELL = 1;
  const COLS = 12;
  const ROWS = 12;

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(COLS * CELL, 0.3, ROWS * CELL),
    new THREE.MeshStandardMaterial({ color: '#0d1420', roughness: 0.9, metalness: 0.1 }),
  );
  plate.position.y = -0.15;
  boardGroup.add(plate);

  const lineMat = new THREE.MeshBasicMaterial({ color: '#1a2740' });
  for (let c = 0; c <= COLS; c++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.02, ROWS * CELL),
      lineMat,
    );
    line.position.set((c - COLS / 2) * CELL, 0.01, 0);
    boardGroup.add(line);
  }
  for (let r = 0; r <= ROWS; r++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(COLS * CELL, 0.02, 0.03),
      lineMat,
    );
    line.position.set(0, 0.01, (r - ROWS / 2) * CELL);
    boardGroup.add(line);
  }

  const towerColors = ['#58a6ff', '#f0883e', '#79c0ff', '#a371f7', '#3fb950'];
  for (let i = 0; i < 8; i++) {
    const h = 1 + Math.random() * 1.4;
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, h, 8),
      new THREE.MeshStandardMaterial({
        color: towerColors[i % towerColors.length],
        roughness: 0.4,
        metalness: 0.3,
        emissive: towerColors[i % towerColors.length],
        emissiveIntensity: 0.15,
      }),
    );
    t.position.set(
      (Math.floor(Math.random() * COLS) - COLS / 2 + 0.5) * CELL,
      h / 2,
      (Math.floor(Math.random() * ROWS) - ROWS / 2 + 0.5) * CELL,
    );
    boardGroup.add(t);
  }

  const orbs: THREE.Mesh[] = [];
  for (let i = 0; i < 30; i++) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#79c0ff' : '#a371f7',
        transparent: true,
        opacity: 0.7,
      }),
    );
    orb.position.set(
      (Math.random() - 0.5) * 40,
      Math.random() * 12 + 2,
      (Math.random() - 0.5) * 40,
    );
    scene.add(orb);
    orbs.push(orb);
  }

  const baseRot = 0.15;
  function update(t: number) {
    boardGroup.rotation.y = baseRot + Math.sin(t * 0.15) * 0.3;
    boardGroup.rotation.x = Math.sin(t * 0.1) * 0.03;
    for (let i = 0; i < orbs.length; i++) {
      orbs[i].position.y += Math.sin(t + i) * 0.002;
    }
  }

  function dispose() {
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
    });
  }

  return { scene, camera, update, dispose };
}