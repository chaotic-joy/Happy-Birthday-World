import * as THREE from 'three';
import { PLACEHOLDER_COUNT, COLORS, ROAD_WIDTH } from './config.js';

// 13 framed photo panels floating beside/above the track. Each starts as a
// canvas-drawn numbered placeholder and tries to load public/images/{i}.jpg,
// swapping the texture in on success. Panels billboard toward the camera.
export class Placeholders {
  constructor(scene, curve) {
    this.panels = [];
    this.group = new THREE.Group();
    this.group.visible = false; // hidden until the countdown is over
    this.revealT = -1;
    scene.add(this.group);

    const loader = new THREE.TextureLoader();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < PLACEHOLDER_COUNT; i++) {
      const t = i / PLACEHOLDER_COUNT;
      const p = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Alternate which side of the track, and vary height for a floaty feel.
      const sideSign = i % 2 === 0 ? 1 : -1;
      const lateral = ROAD_WIDTH / 2 + 5 + (i % 3) * 1.5;
      const height = 7 + (i % 4) * 1.6;

      const panel = this._makePanel(i + 1, loader);
      panel.position.set(
        p.x + side.x * lateral * sideSign,
        height,
        p.z + side.z * lateral * sideSign
      );
      panel.userData.bobPhase = Math.random() * Math.PI * 2;
      panel.userData.baseY = height;
      this.group.add(panel);
      this.panels.push(panel);
    }
  }

  _makePanel(number, loader) {
    const panel = new THREE.Group();

    // Frame (slightly larger, pastel border).
    const frameW = 6.4;
    const frameH = 4.6;
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(frameW, frameH),
      new THREE.MeshBasicMaterial({ color: 0xfff6e9, side: THREE.DoubleSide })
    );
    panel.add(frame);

    // Picture surface.
    const picW = 6;
    const picH = 4.2;
    const tex = makePlaceholderTexture(number);
    const picMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(picW, picH), picMat);
    pic.position.z = 0.02;
    panel.add(pic);

    // Try to upgrade to a real image; keep placeholder if missing.
    loader.load(
      `./images/${number}.jpg`,
      (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        picMat.map = loaded;
        picMat.needsUpdate = true;
      },
      undefined,
      () => {
        /* no image yet — placeholder stays */
      }
    );

    return panel;
  }

  // Reveal the billboards (called when the countdown ends) with a staggered pop-in.
  reveal() {
    this.group.visible = true;
    this.revealT = 0;
    for (const panel of this.panels) panel.scale.setScalar(0.001);
  }

  // Billboard each panel toward the camera (Y-locked) + gentle bob + pop-in.
  update(dt, camera, elapsed) {
    if (this.revealT >= 0 && this.revealT < 2) this.revealT += dt;

    for (let i = 0; i < this.panels.length; i++) {
      const panel = this.panels[i];
      panel.position.y =
        panel.userData.baseY + Math.sin(elapsed * 1.2 + panel.userData.bobPhase) * 0.4;
      // Face the camera but stay upright.
      const dx = camera.position.x - panel.position.x;
      const dz = camera.position.z - panel.position.z;
      panel.rotation.y = Math.atan2(dx, dz);

      // Staggered bouncy scale-in once revealed.
      if (this.revealT >= 0) {
        const local = THREE.MathUtils.clamp(this.revealT - i * 0.07, 0, 0.55) / 0.55;
        panel.scale.setScalar(easeOutBack(local));
      }
    }
  }
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const placeholderColors = [
  '#ff8fb1', '#b58cff', '#7fdfd4', '#ffd28f', '#8fb1ff',
  '#ff9ed6', '#9be59b', '#ffb3a0', '#c5a3ff', '#7fd4ff',
  '#ffc46b', '#a0e7c0', '#ffa8c8',
];

function makePlaceholderTexture(number) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 358;
  const ctx = c.getContext('2d');
  const bg = placeholderColors[(number - 1) % placeholderColors.length];

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);

  // subtle inner panel
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(16, 16, c.width - 32, c.height - 32);

  // dashed border
  ctx.strokeStyle = 'rgba(58,53,80,0.55)';
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 12]);
  ctx.strokeRect(28, 28, c.width - 56, c.height - 56);
  ctx.setLineDash([]);

  // camera glyph
  ctx.fillStyle = 'rgba(58,53,80,0.7)';
  ctx.font = '70px serif';
  ctx.textAlign = 'center';
  ctx.fillText('📷', c.width / 2, c.height / 2 - 20);

  // number + label
  ctx.fillStyle = '#3a3550';
  ctx.font = 'bold 56px Trebuchet MS, sans-serif';
  ctx.fillText(`Photo ${number}`, c.width / 2, c.height / 2 + 70);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
