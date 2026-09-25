import type { SimState } from '../game/simTypes';
import { TOWER_DEFS } from '../game/simConfig';
import type { TowerKind } from '../core/types';

export interface HUDHandlers {
  onStartWave: () => void;
  onBack: () => void;
  onSelectTower: (kind: TowerKind) => void;
  onNextLevel: () => void;
  onRetry: () => void;
}

export interface GameHUD {
  el: HTMLElement;
  setSim(sim: SimState): void;
  showEnd(won: boolean, levelId: number): void;
  isEndShown(): boolean;
  dispose(): void;
}

export function createGameHUD(sim: SimState, handlers: HUDHandlers): GameHUD {
  const el = document.createElement('div');
  el.className = 'hud';
  let endShown = false;

  el.innerHTML = `
    <div class="hud-top">
      <div class="hud-stat hud-lives">
        <span class="hud-icon">♥</span>
        <span data-lives>${sim.lives}</span>
      </div>
      <div class="hud-stat hud-money">
        <span class="hud-icon">●</span>
        <span data-money>${sim.money}</span>
      </div>
      <div class="hud-wave">
        <span class="hud-wave-label">WAVE</span>
        <span class="hud-wave-num"><span data-wave>0</span> / <span data-waves>${sim.waveCount}</span></span>
      </div>
      <div class="hud-status" data-status></div>
    </div>
    <div class="hud-bottom">
      <button class="hud-back" data-back title="Back to levels">← LEVELS</button>
      <div class="hud-cards" data-cards></div>
      <button class="hud-start" data-start>START WAVE</button>
    </div>
    <div class="hud-hint">
      <span>WASD/Arrows pan · Q/E rotate · R/F tilt · drag-rotate · right-drag-pan · wheel zoom</span>
    </div>
  `;

  const livesEl = el.querySelector<HTMLElement>('[data-lives]')!;
  const moneyEl = el.querySelector<HTMLElement>('[data-money]')!;
  const waveEl = el.querySelector<HTMLElement>('[data-wave]')!;
  const statusEl = el.querySelector<HTMLElement>('[data-status]')!;
  const cardsEl = el.querySelector<HTMLElement>('[data-cards]')!;
  const startBtn = el.querySelector<HTMLButtonElement>('[data-start]')!;

  const cardEls = new Map<TowerKind, HTMLButtonElement>();
  for (const kind of sim.availableTowers) {
    const def = TOWER_DEFS[kind];
    const card = document.createElement('button');
    card.className = 'tower-card';
    card.dataset.kind = kind;
    card.title = def.desc;
    card.innerHTML = `
      <div class="tower-card-icon tower-${kind}"></div>
      <div class="tower-card-info">
        <div class="tower-card-name">${def.name}</div>
        <div class="tower-card-cost">${def.cost}g</div>
      </div>
    `;
    card.addEventListener('click', () => handlers.onSelectTower(kind));
    cardsEl.appendChild(card);
    cardEls.set(kind, card);
  }

  startBtn.addEventListener('click', handlers.onStartWave);
  el.querySelector<HTMLButtonElement>('[data-back]')!.addEventListener('click', handlers.onBack);

  function setSim(s: SimState) {
    livesEl.textContent = `${s.lives}`;
    moneyEl.textContent = `${s.money}`;
    waveEl.textContent = `${s.wave}`;

    if (s.waveActive) {
      statusEl.textContent = 'WAVE ACTIVE';
      statusEl.className = 'hud-status hud-status-active';
      startBtn.disabled = true;
      startBtn.textContent = 'IN PROGRESS';
    } else if (s.status === 'playing') {
      statusEl.textContent = 'PLACE TOWERS · THEN START';
      statusEl.className = 'hud-status hud-status-next';
      startBtn.disabled = false;
      startBtn.textContent = s.wave === 0 ? 'START WAVE' : 'NEXT WAVE';
    } else {
      statusEl.textContent = '';
      startBtn.disabled = true;
    }

    for (const [kind, card] of cardEls) {
      const def = TOWER_DEFS[kind];
      card.classList.toggle('selected', s.selectedTower === kind);
      const disabled = s.waveActive || s.money < def.cost;
      card.classList.toggle('disabled', disabled);
      card.disabled = s.waveActive;
    }
  }

  function showEnd(won: boolean, levelId: number) {
    if (endShown) return;
    endShown = true;
    const panel = document.createElement('div');
    panel.className = 'end-panel';
    panel.innerHTML = `
      <div class="end-card">
        <h2 class="${won ? 'win' : 'lose'}">${won ? 'VICTORY' : 'DEFEAT'}</h2>
        <p class="end-sub">Level ${levelId} · ${won ? 'cleared' : 'try again'}</p>
        <div class="end-buttons">
          ${won && levelId < 1000 ? '<button class="btn btn-primary" data-action="next">NEXT LEVEL</button>' : ''}
          ${!won ? '<button class="btn btn-primary" data-action="retry">RETRY</button>' : ''}
          <button class="btn btn-ghost" data-action="back">BACK TO LEVELS</button>
        </div>
      </div>
    `;
    panel.querySelector('[data-action="next"]')?.addEventListener('click', handlers.onNextLevel);
    panel.querySelector('[data-action="retry"]')?.addEventListener('click', handlers.onRetry);
    panel.querySelector('[data-action="back"]')?.addEventListener('click', handlers.onBack);
    el.appendChild(panel);
  }

  return {
    el,
    setSim,
    showEnd,
    isEndShown: () => endShown,
    dispose() { el.remove(); },
  };
}