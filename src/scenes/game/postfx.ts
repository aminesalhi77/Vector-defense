import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface PostFX {
  composer: EffectComposer;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

export function createPostFX(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostFX {
  const size = new THREE.Vector2();
  renderer.getSize(size);

  const composer = new EffectComposer(renderer);
  composer.setSize(size.x, size.y);
  composer.setPixelRatio(renderer.getPixelRatio());

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.85,   // strength
    0.6,    // radius
    0.15,   // threshold
  );
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  return {
    composer,
    render(s, c) {
      (renderPass as RenderPass).scene = s;
      (renderPass as RenderPass).camera = c;
      composer.render();
    },
    resize(w, h) {
      composer.setSize(w, h);
    },
    dispose() {
      composer.dispose();
    },
  };
}