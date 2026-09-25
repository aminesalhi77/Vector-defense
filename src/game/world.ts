import type { LevelConfig } from '../core/types';
import type { Vec2 } from './simTypes';

export interface GameWorld {
  cols: number;
  rows: number;
  pathWorld: Vec2[];       // waypoints in sim coords
  pathCells: Set<string>;  // "col,row"
  buildable: Set<string>;  // "col,row"
}

export function buildWorld(level: LevelConfig): GameWorld {
  const pathWorld: Vec2[] = level.pathTiles.map(([c, r]) => ({
    x: c + 0.5,
    y: r + 0.5,
  }));

  const pathCells = new Set<string>();
  for (let i = 0; i < level.pathTiles.length - 1; i++) {
    const [c0, r0] = level.pathTiles[i];
    const [c1, r1] = level.pathTiles[i + 1];
    let c = c0, r = r0;
    let guard = 0;
    pathCells.add(`${c},${r}`);
    while ((c !== c1 || r !== r1) && guard++ < 5000) {
      const ddc = c1 - c;
      const ddr = r1 - r;
      // Move one axis at a time — safety for diagonal segments
      if (Math.abs(ddc) >= Math.abs(ddr) && ddc !== 0) {
        c += Math.sign(ddc);
      } else if (ddr !== 0) {
        r += Math.sign(ddr);
      } else {
        break;
      }
      pathCells.add(`${c},${r}`);
    }
    pathCells.add(`${c1},${r1}`);
  }

  const buildable = new Set<string>();
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      if (!pathCells.has(`${c},${r}`)) buildable.add(`${c},${r}`);
    }
  }

  return { cols: level.cols, rows: level.rows, pathWorld, pathCells, buildable };
}

export function cellCenter(col: number, row: number): Vec2 {
  return { x: col + 0.5, y: row + 0.5 };
}

// sim (0..cols, 0..rows) → three.js (centered on origin)
export function simToThree(p: Vec2, world: GameWorld): { x: number; z: number } {
  return { x: p.x - world.cols / 2, z: p.y - world.rows / 2 };
}