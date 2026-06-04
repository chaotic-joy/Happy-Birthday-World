import * as THREE from 'three';

const BALLOON_COLORS = [
  0xff8fb1, 0xb58cff, 0x7fdfd4, 0xffd28f, 0x8fb1ff, 0xff9ec4, 0x9be59b, 0xffc46b,
  0xc5a3ff, 0x7fd4ff,
];

// A bunch of pastel balloons drifting in the night air. They bob and sway gently
// and carry a faint emissive so they read against the dark sky.
export class Balloons {
  constructor(scene, center, count = 18, opts = {}) {
    this.group = new THREE.Group();
    this.items = [];

    const minRad = opts.minRad ?? 6;
    const maxRad = opts.maxRad ?? 70;
    const minY = opts.minY ?? 14;
    const maxY = opts.maxY ?? 46;

    const bodyGeo = new THREE.SphereGeometry(1, 16, 16);
    const knotGeo = new THREE.ConeGeometry(0.32, 0.5, 6);

    for (let i = 0; i < count; i++) {
      const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        emissive: color,
        emissiveIntensity: 0.3,
      });

      const balloon = new THREE.Group();

      const body = new THREE.Mesh(bodyGeo, mat);
      body.scale.set(1, 1.25, 1);
      balloon.add(body);

      const knot = new THREE.Mesh(knotGeo, mat);
      knot.position.y = -1.28;
      knot.rotation.x = Math.PI;
      balloon.add(knot);

      const string = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -1.5, 0),
          new THREE.Vector3(0, -5.5, 0),
        ]),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
      );
      balloon.add(string);

      const size = 2 + Math.random() * 1.8;
      balloon.scale.setScalar(size);

      // Scatter within the configured radius band at varied heights.
      const ang = Math.random() * Math.PI * 2;
      const rad = minRad + Math.random() * (maxRad - minRad);
      const baseY = minY + Math.random() * (maxY - minY);
      balloon.position.set(
        center.x + Math.cos(ang) * rad,
        baseY,
        center.z + Math.sin(ang) * rad
      );

      balloon.userData = {
        baseY,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.5,
        swayPhase: Math.random() * Math.PI * 2,
        amp: 1 + Math.random() * 1.6,
      };

      this.group.add(balloon);
      this.items.push(balloon);
    }

    this.group.visible = false; // hidden until the countdown is over
    scene.add(this.group);
  }

  reveal() {
    this.group.visible = true;
  }

  update(dt, elapsed) {
    for (const b of this.items) {
      const u = b.userData;
      b.position.y = u.baseY + Math.sin(elapsed * u.speed + u.phase) * u.amp;
      b.rotation.z = Math.sin(elapsed * 0.6 + u.swayPhase) * 0.12;
    }
  }
}
