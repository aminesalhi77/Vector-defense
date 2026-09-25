export interface MenuHandlers {
    onPlay: () => void;
    onReset: () => void;
  }
  
  export function createMenu(handlers: MenuHandlers): HTMLElement {
    const el = document.createElement('div');
    el.className = 'screen menu-screen';
    el.innerHTML = `
      <div class="menu-panel">
        <h1 class="title">
          <span class="title-line">TOWER</span>
          <span class="title-line accent">DEFENSE</span>
          <span class="title-3d">3D</span>
        </h1>
        <p class="subtitle">1000 procedurally-generated levels</p>
        <div class="menu-buttons">
          <button class="btn btn-primary" data-action="play">PLAY</button>
          <button class="btn btn-ghost" data-action="reset">RESET PROGRESS</button>
        </div>
        <p class="hint">Progress saves locally in your browser</p>
      </div>
    `;
  
    el.querySelector<HTMLButtonElement>('[data-action="play"]')!
      .addEventListener('click', handlers.onPlay);
    el.querySelector<HTMLButtonElement>('[data-action="reset"]')!
      .addEventListener('click', () => {
        if (confirm('Reset all progress? This cannot be undone.')) handlers.onReset();
      });
  
    return el;
  }