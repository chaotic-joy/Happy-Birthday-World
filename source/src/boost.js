import * as THREE from 'three';
import { BOOST, CAR, COLORS } from './config.js';

// Boost state machine + visuals. While active it raises the car's speed/accel,
// emits a glowing additive particle trail from the car's exhaust, shows a pulsing
// flame cone, and exposes a 0..1 FOV factor for the camera to ease on.
export class Boost {
  constructor(scene, car, hud) {
    this.car = car;
    this.hud = hud; // { fill } element refs
    this.state = 'ready'; // 'ready' | 'active' | 'cooldown'
    this.timer = 0;
    this.fovFactor = 0; // 0 = normal, 1 = full boost

    // Flame cone parented to the car's exhaust point.
    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 2.6, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: COLORS.boost,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    this.flame.rotation.x = -Math.PI / 2; // point backward (-Z)
    this.flame.position.set(0, 0, -1.3);
    this.flame.visible = false;
    car.exhaust.add(this.flame);

    // Particle trail (world-space points so they linger behind the car).
    this.MAX = 220;
    this.alive = 0;
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.MAX * 3);
    this.life = new Float32Array(this.MAX); // remaining life 0..1
    this.velocity = new Float32Array(this.MAX * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.alphaAttr = new Float32Array(this.MAX);
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphaAttr, 1));

    const mat = new THREE.PointsMaterial({
      size: 1.1,
      map: makeSpriteTexture(),
      color: COLORS.boost,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this._tmp = new THREE.Vector3();
    this._exhaustWorld = new THREE.Vector3();
  }

  get active() {
    return this.state === 'active';
  }

  // Returns current max speed for the car given boost state.
  get maxSpeed() {
    return this.active ? CAR.maxSpeed * BOOST.speedMult : CAR.maxSpeed;
  }

  get accelMult() {
    return this.active ? BOOST.accelMult : 1;
  }

  tryActivate() {
    if (this.state === 'ready') {
      this.state = 'active';
      this.timer = BOOST.duration;
      this.flame.visible = true;
      return true;
    }
    return false;
  }

  update(dt) {
    // --- state machine ---
    if (this.state === 'active') {
      this.timer -= dt;
      this.fovFactor = Math.min(1, this.fovFactor + dt * 4);
      if (this.timer <= 0) {
        this.state = 'cooldown';
        this.timer = BOOST.cooldown;
        this.flame.visible = false;
      }
    } else if (this.state === 'cooldown') {
      this.timer -= dt;
      this.fovFactor = Math.max(0, this.fovFactor - dt * 3);
      if (this.timer <= 0) this.state = 'ready';
    } else {
      this.fovFactor = Math.max(0, this.fovFactor - dt * 3);
    }

    // --- flame pulse ---
    if (this.flame.visible) {
      const pulse = 0.8 + Math.sin(performance.now() * 0.03) * 0.25;
      this.flame.scale.set(pulse, 1 + pulse * 0.4, pulse);
      this.flame.material.opacity = 0.7 + Math.random() * 0.3;
    }

    this._updateParticles(dt);
    this._updateHud();
  }

  _updateParticles(dt) {
    // Spawn from exhaust while boosting.
    if (this.active) {
      this.car.exhaust.getWorldPosition(this._exhaustWorld);
      const spawn = 6;
      for (let s = 0; s < spawn && this.alive < this.MAX; s++) {
        const i = this.alive++;
        const i3 = i * 3;
        this.positions[i3] = this._exhaustWorld.x + (Math.random() - 0.5) * 0.4;
        this.positions[i3 + 1] = this._exhaustWorld.y + (Math.random() - 0.5) * 0.4;
        this.positions[i3 + 2] = this._exhaustWorld.z + (Math.random() - 0.5) * 0.4;
        // slight backward + outward drift
        const back = -this.car.speed * 0.02;
        this.velocity[i3] = Math.sin(this.car.heading) * back + (Math.random() - 0.5) * 2;
        this.velocity[i3 + 1] = Math.random() * 1.5 + 0.5;
        this.velocity[i3 + 2] = Math.cos(this.car.heading) * back + (Math.random() - 0.5) * 2;
        this.life[i] = 1;
      }
    }

    // Integrate + compact the live particles.
    let write = 0;
    for (let i = 0; i < this.alive; i++) {
      this.life[i] -= dt * 1.4;
      if (this.life[i] <= 0) continue;
      const r3 = i * 3;
      const w3 = write * 3;
      const px = this.positions[r3] + this.velocity[r3] * dt;
      const py = this.positions[r3 + 1] + this.velocity[r3 + 1] * dt;
      const pz = this.positions[r3 + 2] + this.velocity[r3 + 2] * dt;
      this.positions[w3] = px;
      this.positions[w3 + 1] = py;
      this.positions[w3 + 2] = pz;
      this.velocity[w3] = this.velocity[r3] * 0.92;
      this.velocity[w3 + 1] = this.velocity[r3 + 1] * 0.92;
      this.velocity[w3 + 2] = this.velocity[r3 + 2] * 0.92;
      this.life[write] = this.life[i];
      write++;
    }
    this.alive = write;
    // Park dead particles far away so they don't render at origin.
    for (let i = this.alive; i < this.MAX; i++) {
      this.positions[i * 3 + 1] = -9999;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  _updateHud() {
    if (!this.hud || !this.hud.fill) return;
    let pct = 100;
    let cooldown = false;
    if (this.state === 'active') {
      pct = (this.timer / BOOST.duration) * 100;
    } else if (this.state === 'cooldown') {
      pct = (1 - this.timer / BOOST.cooldown) * 100;
      cooldown = true;
    }
    this.hud.fill.style.width = `${pct}%`;
    this.hud.fill.classList.toggle('cooldown', cooldown);
  }
}

// Small soft round sprite for particles.
function makeSpriteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
