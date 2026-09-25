export type TowerKind =
  | 'arrow' | 'cannon' | 'frost' | 'sniper' | 'tesla' | 'poison'
  | 'flame' | 'ballista' | 'void' | 'beacon' | 'mortar' | 'gravity';

export type EnemyKind =
  | 'grunt' | 'runner' | 'tank' | 'sprinter' | 'scout' | 'brute'
  | 'flyer' | 'drone' | 'bomber' | 'harpy'
  | 'shielded' | 'plated' | 'ironclad'
  | 'phantom' | 'wraith'
  | 'splitter' | 'spawner'
  | 'healer' | 'shielder'
  | 'juggernaut' | 'colossus' | 'behemoth'
  | 'berserker' | 'vampire'
  | 'frost_giant' | 'fire_elemental'
  | 'void_walker' | 'necromancer'
  | 'warlord' | 'titan';

export type Screen = 'menu' | 'levelSelect' | 'game';

export interface LevelConfig {
  id: number;
  seed: number;
  cols: number;
  rows: number;
  pathTiles: [number, number][];
  startMoney: number;
  startLives: number;
  waveCount: number;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
  availableTowers: TowerKind[];
  availableEnemies: EnemyKind[];
  isBoss: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface Progress {
  highestUnlocked: number;
  completed: number[];
  seenTutorial: boolean;
}

export interface AppState {
  screen: Screen;
  progress: Progress;
  activeLevel: LevelConfig | null;
}