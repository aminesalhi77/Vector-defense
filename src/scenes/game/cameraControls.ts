import * as THREE from 'three';

export interface CameraControls {
  target: THREE.Vector3;
  setTarget(v: THREE.Vector3): void;
  update(dt: number): void;
  dispose(): void;
}

export function createCameraControls(
  camera: THREE.PerspectiveCamera,
  dom: HTMLElement,
): CameraControls {
  let theta = Math.PI * 0.25;
  let phi = Math.PI * 0.32;
  let radius = 16;
  const target = new THREE.Vector3(0, 0, 0);

  const MIN_RADIUS = 6;
  const MAX_RADIUS = 40;
  const MIN_PHI = 0.2;
  const MAX_PHI = Math.PI / 2.1;

  let dragging = false;
  let panning = false;
  let lastX = 0, lastY = 0;

  function apply() {
    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    camera.position.set(x, y, z);
    camera.lookAt(target);
  }

  const onDown = (e: PointerEvent) => {
    if (e.button === 0) dragging = true;
    else if (e.button === 2 || e.button === 1) panning = true;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging && !panning) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (dragging) {
      theta -= dx * 0.006;
      phi = Math.max(MIN_PHI, Math.min(MAX_PHI, phi - dy * 0.005));
      apply();
    } else if (panning) {
      const scale = radius * 0.0016;
      const fwd = new THREE.Vector3().subVectors(target, camera.position).setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      target.addScaledVector(right, -dx * scale);
      target.addScaledVector(fwd, dy * scale);
      target.x = Math.max(-25, Math.min(25, target.x));
      target.z = Math.max(-25, Math.min(25, target.z));
      apply();
    }
  };
  const onUp = () => { dragging = false; panning = false; };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, radius + e.deltaY * 0.02));
    apply();
  };
  const onContext = (e: Event) => e.preventDefault();

  // ---- Keyboard ----
  const held = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    held.add(e.key.toLowerCase());
  };
  const onKeyUp = (e: KeyboardEvent) => {
    held.delete(e.key.toLowerCase());
  };

  dom.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  dom.addEventListener('wheel', onWheel, { passive: false });
  dom.addEventListener('contextmenu', onContext);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => held.clear());

  apply();

  return {
    target,
    setTarget(v) { target.copy(v); apply(); },
    update(dt) {
      let panned = false;
      let rotated = false;
      const boost = held.has('shift') ? 3 : 1;
      const moveSpeed = 9 * boost * dt;
      const rotSpeed = 1.6 * boost * dt;

      if (held.size > 0) {
        const fwd = new THREE.Vector3().subVectors(target, camera.position).setY(0).normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

        if (held.has('w') || held.has('arrowup'))    { target.addScaledVector(fwd, moveSpeed); panned = true; }
        if (held.has('s') || held.has('arrowdown'))  { target.addScaledVector(fwd, -moveSpeed); panned = true; }
        if (held.has('a') || held.has('arrowleft'))  { target.addScaledVector(right, -moveSpeed); panned = true; }
        if (held.has('d') || held.has('arrowright')) { target.addScaledVector(right, moveSpeed); panned = true; }
        if (held.has('q')) { theta -= rotSpeed; rotated = true; }
        if (held.has('e')) { theta += rotSpeed; rotated = true; }
        // R/F to pitch up/down (or +/-)
        if (held.has('r')) { phi = Math.max(MIN_PHI, phi - rotSpeed * 0.6); rotated = true; }
        if (held.has('f')) { phi = Math.min(MAX_PHI, phi + rotSpeed * 0.6); rotated = true; }

        if (panned) {
          target.x = Math.max(-30, Math.min(30, target.x));
          target.z = Math.max(-30, Math.min(30, target.z));
        }
        if (panned || rotated) apply();
      }
    },
    dispose() {
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContext);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}