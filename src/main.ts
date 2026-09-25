import './style.css';
import * as THREE from 'three';
import type { AppState, LevelConfig } from './core/types';
import { loadProgress, resetProgress, completeLevel } from './core/storage';
import { getLevel } from './core/levels';
import { createMenuScene, type MenuScene } from './scenes/menuScene';
import { createGameScene, type GameScene } from './scenes/game/gameScene';
import { createSimState, startWave, updateSim, tryPlaceTower } from './game/sim';
import type { SimState } from './game/simTypes';
import { createMenu } from './ui/menu';
import { createLevelSelect } from './ui/levelSelect';
import { createGameHUD, type GameHUD } from './ui/gameHUD';

// ---- DOM roots ----
const root = document.getElementById('app')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement | null
  ?? (() => {
    const c = document.createElement('canvas');
    c.id = 'scene';
    root.appendChild(c);
    return c;
  })();

const uiRoot = document.createElement('div');
uiRoot.id = 'ui-root';
root.appendChild(uiRoot);

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const menuScene: MenuScene = createMenuScene();

// ---- App state ----
const appState: AppState = {
  screen: 'menu',
  progress: loadProgress(),
  activeLevel: null,
};

// ---- Active runtime ----
interface ActiveGame {
  levelId: number;
  scene: GameScene;
  sim: SimState;
  hud: GameHUD;
}
let activeGame: ActiveGame | null = null;
let activeCamera: THREE.PerspectiveCamera = menuScene.camera;
let activeScene: THREE.Scene = menuScene.scene;
let activeTick: (dt: number) => void = (dt) => menuScene.update(dt);

// ---- Resize ----
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  activeCamera.aspect = w / h;
  activeCamera.updateProjectionMatrix();
  if (activeGame) activeGame.scene.onResize(w, h);
}
window.addEventListener('resize', resize);

// ---- Screen routing ----
function disposeGame() {
  if (!activeGame) return;
  activeGame.scene.dispose();
  activeGame.hud.dispose();
  activeGame = null;
}

function setActive(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  tick: (dt: number) => void,
) {
  activeScene = scene;
  activeCamera = camera;
  activeTick = tick;
  resize();
}

function showMenu() {
  disposeGame();
  setActive(menuScene.scene, menuScene.camera, (dt) => menuScene.update(dt));
  uiRoot.innerHTML = '';
  uiRoot.appendChild(createMenu({
    onPlay: showLevelSelect,
    onReset: () => { appState.progress = resetProgress(); showMenu(); },
  }));
}

function showLevelSelect() {
  disposeGame();
  setActive(menuScene.scene, menuScene.camera, (dt) => menuScene.update(dt));
  uiRoot.innerHTML = '';
  uiRoot.appendChild(createLevelSelect(appState, {
    onBack: showMenu,
    onSelect: (id) => startLevel(id),
  }));
}

function startLevel(id: number) {
  disposeGame();
  uiRoot.innerHTML = '';

  const level = getLevel(id);
  appState.activeLevel = level;
  appState.screen = 'game';

  const scene = createGameScene(level, canvas);
  const sim = createSimState(level);

  scene.camera.aspect = window.innerWidth / window.innerHeight;
  scene.camera.updateProjectionMatrix();
  scene.onResize(window.innerWidth, window.innerHeight);

  const hud = createGameHUD(sim, {
    onStartWave: () => startWave(sim, level.availableEnemies),
    onBack: () => showLevelSelect(),
    onSelectTower: (kind) => { sim.selectedTower = kind; },
    onNextLevel: () => startLevel(Math.min(1000, id + 1)),
    onRetry: () => startLevel(id),
  });
  uiRoot.appendChild(hud.el);

  activeGame = { levelId: id, scene, sim, hud };
  setActive(scene.scene, scene.camera, (dt) => {
    updateSim(sim, scene.world, dt);
    scene.tick(dt, sim);
    hud.setSim(sim);

    if (sim.status !== 'playing' && !hud.isEndShown()) {
      if (sim.status === 'won') {
        appState.progress = completeLevel(appState.progress, id);
      }
      hud.showEnd(sim.status === 'won', id);
    }
  });

  wireGameInput(scene, sim, level, canvas);
}

// ---- Input ----
let inputCleanup: (() => void) | null = null;

function wireGameInput(
  scene: GameScene,
  sim: SimState,
  level: LevelConfig,
  canvasEl: HTMLElement,
) {
  inputCleanup?.();
  const listeners: Array<() => void> = [];

  let downX = 0, downY = 0, downTime = 0;

  function toNDC(e: MouseEvent) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  const onDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    downX = e.clientX;
    downY = e.clientY;
    downTime = performance.now();
  };

  const onUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    const elapsed = performance.now() - downTime;
    if (moved > 6 || elapsed > 400) return;

    const ndc = toNDC(e);
    const cell = scene.pickCell(ndc.x, ndc.y);
    if (!cell) return;
    tryPlaceTower(sim, scene.world, cell.col, cell.row);
  };

  const onMove = (e: MouseEvent) => {
    if (e.target !== canvasEl) {
      scene.setHover(null, sim.selectedTower, occupiedCells(sim));
      return;
    }
    const ndc = toNDC(e);
    const cell = scene.pickCell(ndc.x, ndc.y);
    scene.setHover(cell, sim.selectedTower, occupiedCells(sim));
  };

  const onKey = (e: KeyboardEvent) => {
    if (appState.screen !== 'game') return;
    if (e.key === 'Escape') { sim.selectedTower = null; return; }
    if (e.key === ' ') {
      e.preventDefault();
      startWave(sim, level.availableEnemies);
      return;
    }
    const idx = ['1','2','3','4','5','6','7','8','9'].indexOf(e.key);
    if (idx >= 0 && idx < sim.availableTowers.length) {
      sim.selectedTower = sim.availableTowers[idx];
    }
  };

  canvasEl.addEventListener('mousedown', onDown);
  canvasEl.addEventListener('mouseup', onUp);
  canvasEl.addEventListener('mousemove', onMove);
  window.addEventListener('keydown', onKey);
  listeners.push(() => {
    canvasEl.removeEventListener('mousedown', onDown);
    canvasEl.removeEventListener('mouseup', onUp);
    canvasEl.removeEventListener('mousemove', onMove);
    window.removeEventListener('keydown', onKey);
  });

  inputCleanup = () => listeners.forEach(fn => fn());
}

function occupiedCells(sim: SimState): Set<string> {
  const s = new Set<string>();
  for (const t of sim.towers) s.add(`${t.col},${t.row}`);
  return s;
}

// ---- Boot ----
showMenu();

// ---- Frame loop ----
let last = performance.now();

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  activeTick(dt);

  if (activeGame) {
    activeGame.scene.render(renderer, dt, activeGame.sim);
  } else {
    renderer.render(activeScene, activeCamera);
  }

  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);