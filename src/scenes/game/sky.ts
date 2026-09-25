import * as THREE from 'three';

export interface NightSky {
  group: THREE.Group;
  moonDirection: THREE.Vector3;
  dispose(): void;
}

export function createNightSky(): NightSky {
  const group = new THREE.Group();

  // ---- Gradient dome ----
  const skyGeo = new THREE.SphereGeometry(120, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor:    { value: new THREE.Color(0x02020a) },
      midColor:    { value: new THREE.Color(0x0a1030) },
      bottomColor: { value: new THREE.Color(0x151a35) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 c = h > 0.0
          ? mix(midColor, topColor, smoothstep(0.0, 0.8, h))
          : mix(bottomColor, midColor, smoothstep(-0.4, 0.0, h));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  group.add(new THREE.Mesh(skyGeo, skyMat));

  // ---- Stars ----
  const starCount = 2000;
  const pos = new Float32Array(starCount * 3);
  const col = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  const tmpC = new THREE.Color();
  for (let i = 0; i < starCount; i++) {
    const radius = 90 + Math.random() * 20;
    // Uniform distribution on full sphere — no top-only bias
    const u = Math.random() * 2 - 1;
    const y = radius * u;
    const ringR = radius * Math.sqrt(Math.max(0, 1 - u * u));
    const theta = Math.random() * Math.PI * 2;
    pos[i * 3]     = ringR * Math.cos(theta);
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = ringR * Math.sin(theta);

    const t = Math.random();
    if (t < 0.65)      tmpC.setHSL(0.60, 0.10, 0.92); // white-ish
    else if (t < 0.85) tmpC.setHSL(0.58, 0.55, 0.85); // blue
    else               tmpC.setHSL(0.10, 0.55, 0.85); // warm
    col[i * 3]     = tmpC.r;
    col[i * 3 + 1] = tmpC.g;
    col[i * 3 + 2] = tmpC.b;

    // Bright "hero" stars are bigger
    sizes[i] = Math.random() < 0.03 ? 1.6 : (0.35 + Math.random() * 0.7);
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Custom point shader so per-star size works
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * uPixelRatio * (300.0 / -mv.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a);
      }
    `,
    vertexColors: true,
  });
  const stars = new THREE.Points(starGeo, starMat);
  group.add(stars);

  // ---- Moon ----
  const moonDir = new THREE.Vector3(-0.55, 0.6, -0.58).normalize();
  const moonPos = moonDir.clone().multiplyScalar(100);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 40, 32),
    new THREE.MeshBasicMaterial({ color: 0xf0f2ff }),
  );
  moon.position.copy(moonPos);
  group.add(moon);

  // Subtle moon detail — few darker patches
  const craterMat = new THREE.MeshBasicMaterial({ color: 0xd5d8ee });
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.7, 12, 12), craterMat);
    // Place on moon surface facing camera-ish direction
    const a = Math.random() * Math.PI * 2;
    const b = Math.random() * Math.PI;
    c.position.set(
      moonPos.x + Math.cos(a) * Math.sin(b) * 4.3,
      moonPos.y + Math.cos(b) * 4.3,
      moonPos.z + Math.sin(a) * Math.sin(b) * 4.3,
    );
    group.add(c);
  }

  // Moon glow sprite (canvas radial gradient)
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const cx = cv.getContext('2d')!;
  const grad = cx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0.00, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.15, 'rgba(220,230,255,0.75)');
  grad.addColorStop(0.40, 'rgba(180,200,255,0.28)');
  grad.addColorStop(0.75, 'rgba(140,170,255,0.06)');
  grad.addColorStop(1.00, 'rgba(140,170,255,0)');
  cx.fillStyle = grad;
  cx.fillRect(0, 0, 512, 512);

  const glowTex = new THREE.CanvasTexture(cv);
  glowTex.colorSpace = THREE.SRGBColorSpace;

  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  glowSprite.position.copy(moonPos);
  glowSprite.scale.set(30, 30, 1);
  group.add(glowSprite);

  // Slight haze cloud around horizon (very subtle)
  const hazeMat = new THREE.MeshBasicMaterial({
    color: 0x2a3355, transparent: true, opacity: 0.25,
    side: THREE.BackSide, depthWrite: false,
  });
  const haze = new THREE.Mesh(new THREE.SphereGeometry(119, 32, 16, 0, Math.PI * 2, Math.PI / 2 - 0.3, 0.3), hazeMat);
  group.add(haze);

  return {
    group,
    moonDirection: moonDir,
    dispose() {
      group.traverse(o => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach(mm => mm.dispose());
          else m.dispose();
        } else if (o instanceof THREE.Sprite) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
    },
  };
}