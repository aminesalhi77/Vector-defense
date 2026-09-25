import type { AppState } from '../core/types';

export interface LevelSelectHandlers {
  onBack: () => void;
  onSelect: (id: number) => void;
}

export function createLevelSelect(
  state: AppState,
  handlers: LevelSelectHandlers,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen level-screen';

  const total = 1000;
  const highest = state.progress.highestUnlocked;
  const completed = new Set(state.progress.completed);

  el.innerHTML = `
    <div class="level-header">
      <button class="btn btn-ghost btn-small" data-action="back">← BACK</button>
      <h2>SELECT LEVEL</h2>
      <div class="level-stats">
        <span>${completed.size} / ${total} cleared</span>
      </div>
    </div>
    <div class="level-grid" data-grid></div>
  `;

  const grid = el.querySelector<HTMLDivElement>('[data-grid]')!;

  for (let i = 1; i <= total; i++) {
    const locked = i > highest;
    const done = completed.has(i);
    const isBoss = i % 25 === 0;

    const btn = document.createElement('button');
    btn.className = 'level-cell';
    if (locked) btn.classList.add('locked');
    if (done) btn.classList.add('done');
    if (isBoss) btn.classList.add('boss');
    btn.disabled = locked;
    btn.title = locked ? `Level ${i} — locked` : `Level ${i}`;
    btn.innerHTML = `
      <span class="level-num">${i}</span>
      ${done ? '<span class="level-check">✓</span>' : ''}
    `;

    if (!locked) {
      btn.addEventListener('click', () => handlers.onSelect(i));
    }
    grid.appendChild(btn);
  }

  el.querySelector<HTMLButtonElement>('[data-action="back"]')!
    .addEventListener('click', handlers.onBack);

  requestAnimationFrame(() => {
    const target = grid.children[Math.max(0, highest - 1)] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  });

  return el;
}