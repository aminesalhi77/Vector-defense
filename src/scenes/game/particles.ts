import * as THREE from 'three';

const MAX_PARTICLES = 3000;

export interface BurstOptions {
  speed?: number;
  speedVar?: number;
  dirX?: number;
  dirY?: number;
  dirZ?: number;
  spread?: number;
  gravity?: number;
  drag?: number;
  life?: number;
  lifeVar?: number;
  size?: number;
  sizeVar?: number;
}

export interface ParticleSystem {
  object: THREE.Points;
  spawnBurst(pos: THREE.Vector3, color: number, count: number, opts?: BurstOptions): void;
  update(dt: number): void;
  setPixelRatio(r: number): void;
  dispose(): void;
}

export function createParticleSystem(): ParticleSystem {
  const px = new Float32Array(MAX_PARTICLES);
  const py = new Float32Array(MAX_PARTICLES);
  const pz = new Float32Array(MAX_PARTICLES);
  const vx = new Float32Array(MAX_PARTICLES);
  const vy = new Float32Array(MAX_PARTICLES);
  const vz = new Float32Array(MAX_PARTICLES);
  const cr = new Float32Array(MAX_PARTICLES);
  const cg = new Float32Array(MAX_PARTICLES);
  const cb = new Float32Array(MAX_PARTICLES);
  const psize = new Float32Array(MAX_PARTICLES);
  const plife = new Float32Array(MAX_PARTICLES);
  const pmaxlife = new Float32Array(MAX_PARTICLES);
  const pgrav = new Float32Array(MAX_PARTICLES);
  const pdrag = new Float32Array(MAX_PARTICLES);
  let active = 0;

  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  const sizes = new Float32Array(MAX_PARTICLES);
  const alphas = new Float32Array(MAX_PARTICLES);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  geo.setDrawRange(0, 0);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 200);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: `
      attribute vec3 color;
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * uPixelRatio * (300.0 / -mv.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  const tmpColor = new THREE.Color();

  function spawnBurst(
    pos: THREE.Vector3,
    color: number,
    count: number,
    opts: BurstOptions = {},
  ) {
    const {
      speed = 3,
      speedVar = 0.5,
      dirX = 0, dirY = 0, dirZ = 0,
      spread = 2,
      gravity = 6,
      drag = 0.9,
      life = 0.5,
      lifeVar = 0.4,
      size = 0.18,
      sizeVar = 0.5,
    } = opts;

    const dirLen = Math.hypot(dirX, dirY, dirZ);
    const hasDir = dirLen > 0.001;
    const ndx = hasDir ? dirX / dirLen : 0;
    const ndy = hasDir ? dirY / dirLen : 0;
    const ndz = hasDir ? dirZ / dirLen : 0;

    tmpColor.setHex(color);
    const baseR = tmpColor.r;
    const baseG = tmpColor.g;
    const baseB = tmpColor.b;

    for (let k = 0; k < count; k++) {
      if (active >= MAX_PARTICLES) return;

      let dx: number, dy: number, dz: number;

      if (spread >= 2 || !hasDir) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.sin(phi);
        dx = r * Math.cos(theta);
        dy = Math.cos(phi);
        dz = r * Math.sin(theta);
      } else if (spread <= 0.01) {
        dx = ndx; dy = ndy; dz = ndz;
      } else {
        const cosMax = 1 - spread / 2;
        const cosA = cosMax + (1 - cosMax) * Math.random();
        const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
        const theta = Math.random() * Math.PI * 2;

        let upX = 0, upY = 1, upZ = 0;
        if (Math.abs(ndy) > 0.99) { upX = 1; upY = 0; upZ = 0; }
        const dotU = ndx * upX + ndy * upY + ndz * upZ;
        let ux = upX - ndx * dotU;
        let uy = upY - ndy * dotU;
        let uz = upZ - ndz * dotU;
        const uLen = Math.hypot(ux, uy, uz) || 1;
        ux /= uLen; uy /= uLen; uz /= uLen;
        const wx = ndy * uz - ndz * uy;
        const wy = ndz * ux - ndx * uz;
        const wz = ndx * uy - ndy * ux;

        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        dx = ndx * cosA + (ux * cosT + wx * sinT) * sinA;
        dy = ndy * cosA + (uy * cosT + wy * sinT) * sinA;
        dz = ndz * cosA + (uz * cosT + wz * sinT) * sinA;
      }

      const sp = speed * (1 + (Math.random() - 0.5) * speedVar * 2);
      const lf = Math.max(0.05, life * (1 + (Math.random() - 0.5) * lifeVar * 2));
      const sz = Math.max(0.01, size * (1 + (Math.random() - 0.5) * sizeVar * 2));

      const i = active++;
      px[i] = pos.x; py[i] = pos.y; pz[i] = pos.z;
      vx[i] = dx * sp; vy[i] = dy * sp; vz[i] = dz * sp;
      cr[i] = baseR; cg[i] = baseG; cb[i] = baseB;
      psize[i] = sz;
      plife[i] = lf;
      pmaxlife[i] = lf;
      pgrav[i] = gravity;
      pdrag[i] = drag;
    }
  }

  function update(dt: number) {
    let i = 0;
    while (i < active) {
      plife[i] -= dt;
      if (plife[i] <= 0) {
        const j = --active;
        if (i !== j) {
          px[i] = px[j]; py[i] = py[j]; pz[i] = pz[j];
          vx[i] = vx[j]; vy[i] = vy[j]; vz[i] = vz[j];
          cr[i] = cr[j]; cg[i] = cg[j]; cb[i] = cb[j];
          psize[i] = psize[j];
          plife[i] = plife[j]; pmaxlife[i] = pmaxlife[j];
          pgrav[i] = pgrav[j]; pdrag[i] = pdrag[j];
        }
        continue;
      }
      vy[i] -= pgrav[i] * dt;
      const dmp = Math.pow(pdrag[i], dt * 60);
      vx[i] *= dmp; vy[i] *= dmp; vz[i] *= dmp;
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;
      pz[i] += vz[i] * dt;
      i++;
    }

    for (let k = 0; k < active; k++) {
      positions[k * 3] = px[k];
      positions[k * 3 + 1] = py[k];
      positions[k * 3 + 2] = pz[k];
      colors[k * 3] = cr[k];
      colors[k * 3 + 1] = cg[k];
      colors[k * 3 + 2] = cb[k];
      const t = Math.max(0, plife[k] / pmaxlife[k]);
      sizes[k] = psize[k] * (0.4 + 0.6 * t);
      alphas[k] = t;
    }

    geo.setDrawRange(0, active);
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('alpha') as THREE.BufferAttribute).needsUpdate = true;
  }

  function setPixelRatio(r: number) {
    mat.uniforms.uPixelRatio.value = r;
  }

  function dispose() {
    geo.dispose();
    mat.dispose();
  }

  return { object: points, spawnBurst, update, setPixelRatio, dispose };
}