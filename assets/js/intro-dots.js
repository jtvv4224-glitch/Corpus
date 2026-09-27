/* Corpus — pulsing dot field for the opening animation.
   A plain-JS port of the AiHeroBackground React component (three.js + bloom
   + RGB shift). Loaded on demand by main.js; 'three' resolves through the
   import map in index.html. */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

const DEFAULTS = {
  cols: 120,
  rows: 120,
  jitter: 0.3,
  hexOffset: 0.5,
  dotRadius: 0.03,
  spacing: 0.6,
  color: 0xffffff,
  background: 0x000000,
};

// Rounded square wave: eases between -a and +a with softness `delta`.
const roundedSquareWave = (t, delta, a, f) =>
  ((2 * a) / Math.PI) * Math.atan(Math.sin(2 * Math.PI * t * f) / delta);

/**
 * Mounts the dot field into `container` and starts animating.
 * Returns a function that stops the animation and frees the GPU resources.
 */
export function startDots(container, options = {}) {
  const GRID = { ...DEFAULTS, ...options };

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(GRID.background, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GRID.background);
  const camera = new THREE.OrthographicCamera();

  const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.35, 0.8, 0.15);
  const rgbShift = new ShaderPass(RGBShiftShader);
  rgbShift.uniforms.amount.value = 0.0015;
  rgbShift.uniforms.angle.value = Math.PI / 4;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(rgbShift);
  composer.addPass(new OutputPass());

  // Hex-offset, jittered grid of instanced dots.
  const total = GRID.cols * GRID.rows;
  const geometry = new THREE.CircleGeometry(GRID.dotRadius, 8);
  const material = new THREE.MeshBasicMaterial({ color: GRID.color });
  const dots = new THREE.InstancedMesh(geometry, material, total);
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(dots);

  const basePos = new Float32Array(total * 2);
  const distArr = new Float32Array(total);
  const xOffset = (GRID.cols - 1) * GRID.spacing * 0.5;
  const yOffset = (GRID.rows - 1) * GRID.spacing * 0.5;
  const dummy = new THREE.Object3D();

  for (let r = 0, i = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++, i++) {
      let x = c * GRID.spacing - xOffset;
      let y = r * GRID.spacing - yOffset;
      y += (c % 2) * GRID.hexOffset * GRID.spacing;
      x += (Math.random() - 0.5) * GRID.jitter;
      y += (Math.random() - 0.5) * GRID.jitter;
      basePos[i * 2] = x;
      basePos[i * 2 + 1] = y;
      // Distance with an eight-fold ripple, like the petals of a rose window.
      distArr[i] = Math.hypot(x, y) + 0.5 * Math.cos(Math.atan2(y, x) * 8) * 0.75;
      dummy.position.set(x, y, 0);
      dummy.updateMatrix();
      dots.setMatrixAt(i, dummy.matrix);
    }
  }

  const timer = new THREE.Timer();
  const mat = new THREE.Matrix4();
  let frame = 0;

  function animate(timestamp) {
    frame = requestAnimationFrame(animate);
    timer.update(timestamp);
    const t = timer.getElapsed();
    const speed = 0.5;
    const amp = 0.75;
    const freq = 0.3;
    const falloff = 0.035;
    rgbShift.uniforms.amount.value = 0.001 + ((Math.sin(2 * Math.PI * t * freq) + 1) * 0.5) * 0.0025;

    for (let i = 0; i < total; i++) {
      const dist = distArr[i];
      const localDelta = THREE.MathUtils.lerp(0.05, 0.2, Math.min(1, dist / 70));
      const k = 1 + roundedSquareWave(t * speed - dist * falloff, localDelta, amp, freq);
      mat.set(1, 0, 0, basePos[i * 2] * k, 0, 1, 0, basePos[i * 2 + 1] * k, 0, 0, 1, 0, 0, 0, 0, 1);
      dots.setMatrixAt(i, mat);
    }
    dots.instanceMatrix.needsUpdate = true;
    composer.render();
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    const worldHeight = 10;
    const worldWidth = worldHeight * (w / h);
    camera.left = -worldWidth / 2;
    camera.right = worldWidth / 2;
    camera.top = worldHeight / 2;
    camera.bottom = -worldHeight / 2;
    camera.near = -100;
    camera.far = 100;
    camera.position.set(0, 0, 10);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  frame = requestAnimationFrame(animate);

  return function stop() {
    observer.disconnect();
    cancelAnimationFrame(frame);
    geometry.dispose();
    material.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
