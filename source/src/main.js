import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { COLORS, BOOST, NIGHT, BLOOM } from './config.js';
import { createTrack } from './track.js';
import { Car } from './car.js';
import { Input } from './input.js';
import { Boost } from './boost.js';
import { Countdown } from './countdown.js';
import { Celebration } from './audio.js';
import { FloatingText } from './birthday.js';
import { Placeholders } from './placeholders.js';
import { Cake } from './cake.js';
import { Balloons } from './balloons.js';
import { Fireworks } from './fireworks.js';
import { BirthdayGifs } from './gifs.js';
import { EngineSound } from './engine.js';
import { makeCircularPhoto } from './photoTopper.js';

// ---------------------------------------------------------------------------
// Game states: LOADING -> READY -> COUNTDOWN -> RACING
// ---------------------------------------------------------------------------
const STATE = { LOADING: 'loading', READY: 'ready', COUNTDOWN: 'countdown', RACING: 'racing' };
let state = STATE.LOADING;

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(NIGHT.sky);
scene.fog = new THREE.Fog(NIGHT.fog, 70, 340);

const camera = new THREE.PerspectiveCamera(
  BOOST.fov.normal,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 20, 40);

// Post-processing: bloom for glowing fireworks, candles, and neon text.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  BLOOM.strength,
  BLOOM.radius,
  BLOOM.threshold
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// Lights — soft lofi night.
const hemi = new THREE.HemisphereLight(NIGHT.moon, 0x0b1026, 0.45);
scene.add(hemi);
const moonLight = new THREE.DirectionalLight(NIGHT.moon, 0.6);
moonLight.position.set(-70, 95, -40);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 10;
moonLight.shadow.camera.far = 320;
moonLight.shadow.camera.left = -160;
moonLight.shadow.camera.right = 160;
moonLight.shadow.camera.top = 160;
moonLight.shadow.camera.bottom = -160;
scene.add(moonLight);
scene.add(new THREE.AmbientLight(0x2a3358, 0.7));

addNightSky(scene);

// Starfield (fog-immune so they stay crisp) plus a glowing moon.
function addNightSky(scene) {
  const N = 700;
  const positions = new Float32Array(N * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    v.set(Math.random() - 0.5, Math.random() * 0.6 + 0.05, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(450);
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: NIGHT.star, size: 1.6, sizeAttenuation: false, fog: false })
  );
  scene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(20, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfdf6d8, fog: false })
  );
  moon.position.set(-150, 150, -230);
  scene.add(moon);
  const moonGlow = new THREE.Mesh(
    new THREE.SphereGeometry(28, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.18, fog: false })
  );
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
const { group: trackGroup, curve, startTransform } = createTrack();
scene.add(trackGroup);

const car = new Car();
scene.add(car.group);
// Park the car on the grid, just behind the start line, facing along the track.
const gridPos = startTransform.position.clone().addScaledVector(startTransform.tangent, -4);
car.placeAt(gridPos, startTransform.angle);

// Clark's photo riding on top of the car (billboards toward the camera).
const carTopper = makeCircularPhoto('./images/clark_topper.png', 0.85);
scene.add(carTopper);

function updateCarTopper(elapsed) {
  carTopper.position.set(
    car.position.x,
    car.position.y + 2.2 + Math.sin(elapsed * 2) * 0.08,
    car.position.z
  );
  carTopper.rotation.y = Math.atan2(
    camera.position.x - car.position.x,
    camera.position.z - car.position.z
  );
}

const placeholders = new Placeholders(scene, curve);

// Infield centre of the track (where the grass is enclosed by the loop).
const infield = new THREE.Vector3();
{
  const pts = curve.getSpacedPoints(60);
  for (const p of pts) infield.add(p);
  infield.divideScalar(pts.length);
  infield.y = 0;
}

// Birthday scenery.
const cake = new Cake(scene, infield);
const balloons = new Balloons(scene, infield, 18); // infield cluster
const balloonsOuter = new Balloons(scene, infield, 22, {
  minRad: 95, maxRad: 175, minY: 16, maxY: 58,
}); // ring around the outside of the track
// Keep the animated gif signs clear of the start/finish line.
const gifs = new BirthdayGifs(scene, curve, 24, {
  x: startTransform.position.x,
  z: startTransform.position.z,
  r: 34,
});
const fireworks = new Fireworks(scene, 95);
fireworks.setResolution(window.innerHeight);

// HUD refs
const hud = {
  gantry: document.getElementById('gantry'),
  boostWrap: document.getElementById('boost-wrap'),
  fill: document.getElementById('boost-fill'),
  hint: document.getElementById('hint'),
  loading: document.getElementById('loading'),
  startOverlay: document.getElementById('start-overlay'),
};

const input = new Input();
const boost = new Boost(scene, car, { fill: hud.fill });
const birthday = new FloatingText(scene, {
  lines: ['Happy Birthday', 'Clark!'],
  sizes: [3.2, 4.5],
});

// Floating messages around the track, same styling. anchorAt(t) returns the
// placement transform at fraction t along the looping curve.
function anchorAt(t) {
  const tan = curve.getTangentAt(t).normalize();
  return { position: curve.getPointAt(t), angle: Math.atan2(tan.x, tan.z) };
}

// 1/3 of the way around.
const message3 = new FloatingText(scene, {
  lines: ['Thank you for', 'being awesome'],
  sizes: [2.7, 2.7],
  lineGap: 3.5,
  offset: 0,
  y: 10,
});

// 2/3 of the way around.
const message = new FloatingText(scene, {
  lines: ["We wouldn't change", 'a thing about you! :)'],
  sizes: [2.7, 2.7],
  lineGap: 3.5,
  offset: 0,
  y: 10,
});

const celebration = new Celebration();

// Web Audio context for the countdown beeps (created on the start gesture).
let audioCtx = null;
let countdown = null;
let engine = null;

// ---------------------------------------------------------------------------
// Boot: load the font, then reveal the start overlay (gesture unlocks audio).
// ---------------------------------------------------------------------------
Promise.all([
  birthday.load(startTransform),
  message3.load(anchorAt(1 / 3)),
  message.load(anchorAt(2 / 3)),
  car.ready,
]).then(() => {
  hud.loading.classList.add('hidden');
  state = STATE.READY;
});

hud.startOverlay.addEventListener('click', startGame, { once: true });

function startGame() {
  if (state !== STATE.READY) {
    // If the font is still loading, wait for it.
    const wait = setInterval(() => {
      if (state === STATE.READY) {
        clearInterval(wait);
        beginCountdown();
      }
    }, 80);
  } else {
    beginCountdown();
  }
}

function beginCountdown() {
  hud.startOverlay.classList.add('hidden');
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  countdown = new Countdown(hud.gantry, audioCtx);
  engine = new EngineSound(audioCtx);

  celebration.play(); // music starts as soon as Start Race is clicked

  state = STATE.COUNTDOWN;
  countdown.start(onLightsOut);
}

function onLightsOut() {
  state = STATE.RACING;
  input.enabled = true;
  birthday.reveal();
  message3.reveal();
  message.reveal();
  placeholders.reveal(); // photos appear now that the countdown is over
  gifs.reveal(); // animated gif signs appear
  balloons.reveal(); // balloons appear
  balloonsOuter.reveal();
  fireworks.start(); // continuous celebration fireworks
  if (engine) engine.start(); // engine note begins

  hud.boostWrap.classList.remove('hidden');
  hud.hint.classList.remove('hidden');
  setTimeout(() => hud.hint.classList.add('hidden'), 6000);
}

// ---------------------------------------------------------------------------
// Chase camera
// ---------------------------------------------------------------------------
const camTarget = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function updateCamera(dt) {
  // Desired position: behind + above the car along its heading.
  const back = 13;
  const height = 7;
  camDesired.set(
    car.position.x - Math.sin(car.heading) * back,
    car.position.y + height,
    car.position.z - Math.cos(car.heading) * back
  );
  // Smooth follow.
  const lerp = 1 - Math.pow(0.0015, dt);
  camera.position.lerp(camDesired, lerp);

  // Look ahead of the car, tilted up toward the sky so the fireworks show.
  lookTarget.set(
    car.position.x + Math.sin(car.heading) * 6,
    car.position.y + 6,
    car.position.z + Math.cos(car.heading) * 6
  );
  camTarget.lerp(lookTarget, lerp);
  camera.lookAt(camTarget);

  // Ease FOV with boost.
  const targetFov = THREE.MathUtils.lerp(BOOST.fov.normal, BOOST.fov.boost, boost.fovFactor);
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
  camera.updateProjectionMatrix();
}

// Snap camera behind the car at the very start.
camTarget.copy(car.position);
updateCamera(0.016);

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (state === STATE.RACING) {
    if (input.consumeBoost()) boost.tryActivate();
    const controls = input.read();
    car.update(dt, controls, boost.maxSpeed, boost.accelMult);
    if (engine) engine.update(car.speed, boost.maxSpeed, controls.up || controls.down);
  }

  boost.update(dt);
  birthday.update(dt);
  message3.update(dt);
  message.update(dt);
  placeholders.update(dt, camera, elapsed);
  updateCarTopper(elapsed);
  cake.update(dt, elapsed, camera);
  balloons.update(dt, elapsed);
  balloonsOuter.update(dt, elapsed);
  gifs.update(dt, camera, elapsed);
  fireworks.focus = { x: car.position.x, z: car.position.z, h: car.heading };
  fireworks.update(dt);

  if (state === STATE.COUNTDOWN || state === STATE.RACING || state === STATE.READY) {
    updateCamera(dt);
  }

  composer.render();
}
animate();

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  fireworks.setResolution(window.innerHeight);
});
