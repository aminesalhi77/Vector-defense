import type { Progress } from './types';

const KEY = 'td3d:progress:v1';

const DEFAULT: Progress = {
  highestUnlocked: 1,
  completed: [],
  seenTutorial: false,
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Progress;
    return { ...DEFAULT, ...parsed };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function resetProgress(): Progress {
  const fresh = { ...DEFAULT };
  saveProgress(fresh);
  return fresh;
}

export function completeLevel(p: Progress, id: number): Progress {
  const completed = p.completed.includes(id) ? p.completed : [...p.completed, id];
  const highestUnlocked = Math.max(p.highestUnlocked, Math.min(1000, id + 1));
  const next: Progress = { ...p, completed, highestUnlocked };
  saveProgress(next);
  return next;
}