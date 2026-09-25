export type Biome = 'grass' | 'ice' | 'volcano' | 'desert' | 'void';

export interface BiomeDef {
  name: string;
  ground: number;
  groundEdge: number;
  path: number;
  pathGlow: number;
  fog: number;
  sky: number;
  ambient: number;
  key: number;
  fill: number;
  props: 'trees' | 'crystals' | 'lava' | 'cacti' | 'obelisks';
  propColor: number;
  propAccent: number;
}

export const BIOMES: Record<Biome, BiomeDef> = {
  grass: {
    name: 'Verdant Plains',
    ground: 0x1a2f1f, groundEdge: 0x0f1a12,
    path: 0x3a2a1a, pathGlow: 0x8a6a3a,
    fog: 0x0a1a0f, sky: 0x0a1a0f,
    ambient: 0x8899aa, key: 0xffe0a0, fill: 0x88aa66,
    props: 'trees', propColor: 0x2a5a2a, propAccent: 0x4a8a3a,
  },
  ice: {
    name: 'Frozen Wastes',
    ground: 0x1a2a3a, groundEdge: 0x0f1a2a,
    path: 0x2a3a5a, pathGlow: 0x7ec8ff,
    fog: 0x081525, sky: 0x081525,
    ambient: 0x8899cc, key: 0xcceeff, fill: 0x6688cc,
    props: 'crystals', propColor: 0x4a7ab8, propAccent: 0x7ec8ff,
  },
  volcano: {
    name: 'Molten Core',
    ground: 0x2a1515, groundEdge: 0x150808,
    path: 0x1a0a0a, pathGlow: 0xff5522,
    fog: 0x1a0505, sky: 0x1a0505,
    ambient: 0xaa6644, key: 0xffaa66, fill: 0xff4422,
    props: 'lava', propColor: 0x4a1a1a, propAccent: 0xff6622,
  },
  desert: {
    name: 'Sunbaked Dunes',
    ground: 0x3a2f1a, groundEdge: 0x2a1f10,
    path: 0x5a4a2a, pathGlow: 0xffcc66,
    fog: 0x2a1f10, sky: 0x3a2a15,
    ambient: 0xcca888, key: 0xffddaa, fill: 0xddaa66,
    props: 'cacti', propColor: 0x4a5a2a, propAccent: 0x8a9a4a,
  },
  void: {
    name: 'Void Rift',
    ground: 0x0a0a1a, groundEdge: 0x050510,
    path: 0x1a1a3a, pathGlow: 0xa371f7,
    fog: 0x050510, sky: 0x050510,
    ambient: 0x6666cc, key: 0xcc99ff, fill: 0x8855ff,
    props: 'obelisks', propColor: 0x2a1a4a, propAccent: 0xa371f7,
  },
};

export function biomeFor(level: number): Biome {
  const cycle = Math.floor((level - 1) / 25) % 5;
  return (['grass', 'ice', 'volcano', 'desert', 'void'] as Biome[])[cycle];
}