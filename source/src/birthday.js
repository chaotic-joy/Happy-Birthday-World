import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { COLORS } from './config.js';

// A large floating 3D text banner (the "Happy Birthday Clark!" style). Configurable
// lines/sizes/placement so it can be reused for other messages around the track.
// Loads the font up front (returns a promise), then reveals + animates on cue.
export class FloatingText {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.lines = opts.lines || ['Happy Birthday', 'Clark!'];
    this.sizes = opts.sizes || [3.2, 4.5];
    this.baseY = opts.y ?? 8;
    this.offset = opts.offset ?? 26; // distance ahead of the anchor along its tangent
    this.lineGap = opts.lineGap ?? 5;

    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.scale.setScalar(0.001);
    scene.add(this.group);
    this.revealT = -1; // <0 = not revealed yet; otherwise seconds since reveal
    this.loaded = false;
  }

  // anchor: { position, angle } — the banner floats above/ahead of it, facing oncoming cars.
  load(anchor) {
    return new Promise((resolve) => {
      const loader = new FontLoader();
      loader.load(
        new URL('three/examples/fonts/helvetiker_bold.typeface.json', import.meta.url).href,
        (font) => {
          this._buildText(font, anchor);
          this.loaded = true;
          resolve();
        },
        undefined,
        (err) => {
          console.warn('[floatingText] font failed to load', err);
          resolve();
        }
      );
    });
  }

  _buildText(font, anchor) {
    const matTop = new THREE.MeshStandardMaterial({
      color: COLORS.textA,
      emissive: COLORS.textA,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.1,
    });
    const matSide = new THREE.MeshStandardMaterial({
      color: COLORS.textB,
      emissive: COLORS.textB,
      emissiveIntensity: 0.25,
      roughness: 0.5,
    });

    const n = this.lines.length;
    this.lines.forEach((line, idx) => {
      const size = this.sizes[idx] ?? this.sizes[this.sizes.length - 1];
      const geo = new TextGeometry(line, {
        font,
        size,
        height: 1.0,
        curveSegments: 6,
        bevelEnabled: true,
        bevelThickness: 0.18,
        bevelSize: 0.16,
        bevelSegments: 2,
      });
      geo.computeBoundingBox();
      const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
      geo.translate(-w / 2, 0, 0);
      const mesh = new THREE.Mesh(geo, [matSide, matTop]);
      mesh.position.y = (n - 1 - idx) * this.lineGap; // first line on top
      mesh.castShadow = true;
      this.group.add(mesh);
    });

    // Anchor above and ahead of the given point, facing oncoming cars.
    const { position, angle } = anchor;
    this.group.position.set(
      position.x + Math.sin(angle) * this.offset,
      this.baseY,
      position.z + Math.cos(angle) * this.offset
    );
    this.group.rotation.y = angle + Math.PI;
    this._baseY = this.group.position.y;
  }

  reveal() {
    if (!this.loaded) return;
    this.group.visible = true;
    this.revealT = 0;
  }

  update(dt) {
    if (this.revealT < 0 || !this.loaded) return;
    this.revealT += dt;

    // Bouncy scale-in over ~0.9s using an easeOutBack curve.
    const t = Math.min(1, this.revealT / 0.9);
    this.group.scale.setScalar(easeOutBack(t));

    // Gentle idle float + sway once settled.
    if (this.revealT > 0.9) {
      const f = this.revealT;
      this.group.position.y = this._baseY + Math.sin(f * 1.4) * 0.8;
      this.group.rotation.z = Math.sin(f * 0.8) * 0.03;
    }
  }
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
