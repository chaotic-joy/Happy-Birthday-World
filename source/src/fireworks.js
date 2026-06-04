import * as THREE from 'three';

const LIGHT_POOL = 7; // reusable point lights that flash on each explosion

// Bright base hues (0..1) to seed each burst.
const HUES = [0.95, 0.83, 0.6, 0.5, 0.13, 0.08, 0.33, 0.9];

// High-fidelity GPU fireworks. Each burst is a Points cloud driven by a custom
// shader: particles explode outward, arc under gravity, twinkle, and fade — all
// computed on the GPU from a single uProgress uniform (the technique used by the
// Three.js Journey fireworks lesson). Sparks are camera-facing textured points.
// Pairs with UnrealBloom in main.js for the glow. Each explosion also flashes a
// colored light + a scene-wide tint so the track lights up to match.
export class Fireworks {
  constructor(scene, bounds = 95) {
    this.scene = scene;
    this.bounds = bounds;
    this.active = false;
    this.bursts = [];
    this.spawnTimer = 0;
    this.resolutionY = 720;
    this.focus = null; // {x, z, h} of the car, so bursts favour the player's view
    this.texture = makeSparkTexture();

    // Pool of point lights so each burst lights the track in its own colour.
    this.lights = [];
    this.lightNext = 0;
    for (let i = 0; i < LIGHT_POOL; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 900, 1.0);
      light.castShadow = false;
      scene.add(light);
      this.lights.push(light);
    }

    // Scene-wide tinted flash so the whole track pulses with each explosion.
    this.flash = new THREE.AmbientLight(0xffffff, 0);
    scene.add(this.flash);
  }

  start() {
    this.active = true;
  }

  setResolution(height) {
    this.resolutionY = height;
    for (const b of this.bursts) b.material.uniforms.uResolution.value = height;
  }

  _spawnBurst() {
    const count = 240 + ((Math.random() * 360) | 0);
    const radius = 9 + Math.random() * 9;
    const baseHue = HUES[(Math.random() * HUES.length) | 0];
    const hueSpread = Math.random() < 0.4 ? 0.18 : 0.04; // sometimes multi-hue
    const bicolor = Math.random() < 0.25;
    const altHue = (baseHue + 0.5 + (Math.random() - 0.5) * 0.2) % 1;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const times = new Float32Array(count);

    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Direction on a sphere, biased toward a shell for that classic look.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rr = radius * (0.78 + Math.random() * 0.22);
      const i3 = i * 3;
      positions[i3] = Math.sin(phi) * Math.cos(theta) * rr;
      positions[i3 + 1] = Math.cos(phi) * rr;
      positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * rr;

      const sparkle = Math.random() < 0.12;
      const h = bicolor && Math.random() < 0.5 ? altHue : baseHue;
      col.setHSL(
        (h + (Math.random() - 0.5) * hueSpread + 1) % 1,
        sparkle ? 0.2 : 0.95,
        sparkle ? 0.92 : 0.55 + Math.random() * 0.18
      );
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      scales[i] = 0.4 + Math.random() * Math.random() * 1.4; // a few big sparks
      times[i] = 0.62 + Math.random() * 0.38;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aTime', new THREE.BufferAttribute(times, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uSize: { value: 0.78 + Math.random() * 0.48 },
        uResolution: { value: this.resolutionY },
        uGravity: { value: 13 + Math.random() * 6 },
        uTexture: { value: this.texture },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, material);
    points.frustumCulled = false;

    // Most bursts pop ahead of the car so the player sees the show; the rest go
    // anywhere for ambient sky coverage.
    let x, z;
    if (this.focus && Math.random() < 0.7) {
      const ahead = 34 + Math.random() * 64;
      const ang = this.focus.h + (Math.random() - 0.5) * 1.6;
      x = this.focus.x + Math.sin(ang) * ahead + (Math.random() - 0.5) * 24;
      z = this.focus.z + Math.cos(ang) * ahead + (Math.random() - 0.5) * 24;
    } else {
      x = (Math.random() - 0.5) * this.bounds * 2;
      z = (Math.random() - 0.5) * this.bounds * 2;
    }
    const y = 26 + Math.random() * 30;
    points.position.set(x, y, z);
    this.scene.add(points);

    this.bursts.push({ points, material, geo, life: 0, maxLife: 2.4 + Math.random() * 0.6 });

    // Light up the track to match.
    col.setHSL(baseHue, 0.95, 0.55);
    const light = this.lights[this.lightNext];
    this.lightNext = (this.lightNext + 1) % LIGHT_POOL;
    light.position.set(x, y, z);
    light.color.copy(col);
    light.intensity = 150;

    this.flash.color.copy(col);
    this.flash.intensity = Math.min(0.32, this.flash.intensity + 0.2);
  }

  update(dt) {
    if (this.active) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const n = 1 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0);
        for (let i = 0; i < n; i++) this._spawnBurst();
        this.spawnTimer = 0.3 + Math.random() * 0.5;
      }
    }

    // Decay the explosion lights + scene flash.
    for (const light of this.lights) {
      if (light.intensity > 0.01) light.intensity *= Math.pow(0.0008, dt);
      else light.intensity = 0;
    }
    if (this.flash.intensity > 0.002) this.flash.intensity *= Math.pow(0.02, dt);
    else this.flash.intensity = 0;

    // Advance + retire bursts.
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life += dt;
      b.material.uniforms.uProgress.value = b.life / b.maxLife;
      if (b.life >= b.maxLife) {
        this.scene.remove(b.points);
        b.geo.dispose();
        b.material.dispose();
        this.bursts.splice(i, 1);
      }
    }
  }
}

const VERT = /* glsl */ `
  uniform float uProgress;
  uniform float uSize;
  uniform float uResolution;
  uniform float uGravity;
  attribute float aScale;
  attribute float aTime;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float p = clamp(uProgress / aTime, 0.0, 1.0);

    // Explosion: rapid outward burst easing to full spread by ~25% of life.
    float explode = 1.0 - pow(1.0 - clamp(p / 0.25, 0.0, 1.0), 3.0);
    vec3 pos = position * explode;

    // Gravity arc after the initial burst.
    float fall = max(p - 0.1, 0.0);
    pos.y -= fall * fall * uGravity;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size staging: pop in, hold, shrink out.
    float sizeIn = smoothstep(0.0, 0.08, p);
    float sizeOut = 1.0 - smoothstep(0.62, 1.0, p);
    float stage = sizeIn * sizeOut;

    // Twinkle in the later half.
    float tw = sin(p * 45.0 + aTime * 30.0) * 0.5 + 0.5;
    tw = mix(1.0, tw, smoothstep(0.25, 0.85, p));

    float size = uSize * aScale * stage * (0.6 + 0.8 * tw);
    gl_PointSize = clamp(size * uResolution / -mvPosition.z, 0.0, 192.0);

    vColor = aColor;
    vAlpha = stage * (0.55 + 0.45 * tw);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTexture;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float a = texture2D(uTexture, gl_PointCoord).a;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

// Soft glowing spark with a faint cross flare.
function makeSparkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const cx = 64;

  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, 64);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  // subtle cross flare
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, 8); ctx.lineTo(cx, 120);
  ctx.moveTo(8, cx); ctx.lineTo(120, cx);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  return tex;
}
