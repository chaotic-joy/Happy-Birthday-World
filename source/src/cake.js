import * as THREE from 'three';
import { makeCircularPhoto } from './photoTopper.js';

const CANDLE_COLORS = [
  0xff8fb1, 0xb58cff, 0x7fdfd4, 0xffd28f, 0x8fb1ff, 0x9be59b, 0xffa8c8, 0xffc46b,
];

// A big, cute, multi-tier birthday cake for the infield grass. Candle flames and
// a warm point light flicker so it glows against the night.
export class Cake {
  constructor(scene, position) {
    this.group = new THREE.Group();
    this.flames = [];
    this._build();
    this.group.position.copy(position);
    this.group.position.y = 0;
    scene.add(this.group);

    // Warm glow radiating from the candles.
    this.glow = new THREE.PointLight(0xffb066, 1.6, 80, 2);
    this.glow.position.set(0, this.topY + 3, 0);
    this.group.add(this.glow);
  }

  _build() {
    // Gentle emissive so the cake stays bright and festive under night lighting.
    const frostA = new THREE.MeshStandardMaterial({
      color: 0xfff0f5, roughness: 0.7, emissive: 0xff9ec4, emissiveIntensity: 0.18,
    });
    const frostB = new THREE.MeshStandardMaterial({
      color: 0xff9ec4, roughness: 0.7, emissive: 0xff6fa5, emissiveIntensity: 0.2,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.55, emissive: 0xffffff, emissiveIntensity: 0.12,
    });

    const tiers = [
      { r: 10, h: 4.0, y: 0.0, mat: frostA },
      { r: 7, h: 3.5, y: 4.0, mat: frostB },
      { r: 4.6, h: 3.0, y: 7.5, mat: frostA },
    ];

    let topY = 0;
    for (const t of tiers) {
      const tier = new THREE.Mesh(
        new THREE.CylinderGeometry(t.r, t.r, t.h, 40),
        t.mat
      );
      tier.position.y = t.y + t.h / 2;
      tier.castShadow = true;
      tier.receiveShadow = true;
      this.group.add(tier);

      // Frosting drip rim at the top edge of each tier.
      const rim = new THREE.Mesh(new THREE.TorusGeometry(t.r, 0.5, 10, 40), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = t.y + t.h;
      this.group.add(rim);

      topY = t.y + t.h;
    }
    this.topY = topY;

    // "HAPPY BIRTHDAY CLARK!" wrapping around the bottom tier's outer face.
    this._buildBottomText(tiers[0]);

    // Cherries around the top rim.
    const cherryMat = new THREE.MeshStandardMaterial({ color: 0xff5d73, roughness: 0.4 });
    const cherryCount = 10;
    for (let i = 0; i < cherryCount; i++) {
      const a = (i / cherryCount) * Math.PI * 2;
      const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), cherryMat);
      cherry.position.set(Math.cos(a) * 4.6, topY + 0.4, Math.sin(a) * 4.6);
      this.group.add(cherry);
    }

    // Candles + flames on every tier.
    const flameMat = () =>
      new THREE.MeshStandardMaterial({
        color: 0xffe07a,
        emissive: 0xffb02e,
        emissiveIntensity: 2,
      });
    const addCandleRing = (count, ringR, surfaceY, candleH, rot) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rot;
        const cx = Math.cos(a) * ringR;
        const cz = Math.sin(a) * ringR;

        const candle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, candleH, 8),
          new THREE.MeshStandardMaterial({ color: CANDLE_COLORS[i % CANDLE_COLORS.length] })
        );
        candle.position.set(cx, surfaceY + candleH / 2, cz);
        this.group.add(candle);

        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 8), flameMat());
        flame.position.set(cx, surfaceY + candleH + 0.33, cz);
        this.group.add(flame);
        this.flames.push(flame);
      }
    };
    // Tier tops: bottom y=4 (r=10), middle y=7.5 (r=7), top y=10.5 (r=4.6).
    addCandleRing(14, 9.0, 4.0, 1.7, 0.0);
    addCandleRing(11, 6.0, 7.5, 1.7, 0.28);
    addCandleRing(8, 3.0, topY, 2.2, 0.55);

    this._buildTopper(topY);
  }

  // Wrap "HAPPY BIRTHDAY CLARK!" around the outer face of a tier (a thin textured
  // band just outside the frosting). The text repeats a few times around.
  _buildBottomText(tier) {
    const text = 'HAPPY BIRTHDAY CLARK!';
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext('2d');

    // Fit the phrase to the canvas width.
    let fs = 140;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    while (ctx.measureText(text).width > c.width * 0.86 && fs > 10) {
      fs -= 4;
      ctx.font = `bold ${fs}px Arial, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(6, fs * 0.12);
    ctx.strokeStyle = '#5a2350'; // dark plum outline so it reads on pink frosting
    ctx.fillStyle = '#fff6e9';
    ctx.strokeText(text, c.width / 2, c.height / 2 + 4);
    ctx.fillText(text, c.width / 2, c.height / 2 + 4);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = 3; // appears 3 times around the cake

    const bandH = Math.min(2.6, tier.h - 0.6);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(tier.r + 0.06, tier.r + 0.06, bandH, 64, 1, true),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    band.position.y = tier.y + tier.h / 2;
    this.group.add(band);
  }

  // A circular framed photo "cake topper" on a stick that billboards toward the camera.
  _buildTopper(topY) {
    // Stick holding the photo up above the candles.
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 5, 6),
      new THREE.MeshStandardMaterial({ color: 0xfff6e9, roughness: 0.6 })
    );
    stick.position.set(0, topY + 2.5, 0);
    this.group.add(stick);

    // Billboard pivot with a circular framed photo.
    this.topper = new THREE.Group();
    this._topperBaseY = topY + 6.6;
    this.topper.position.set(0, this._topperBaseY, 0);

    const radius = 2.6;
    this.topper.add(makeCircularPhoto('./images/clark_topper.png', radius));

    // Little heart on top of the frame.
    const heart = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff5d73, emissive: 0xff5d73, emissiveIntensity: 0.4 })
    );
    heart.position.set(0, radius + 0.7, 0.05);
    this.topper.add(heart);

    this.group.add(this.topper);
  }

  update(dt, elapsed, camera) {
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      const n = 0.85 + Math.sin(elapsed * 12 + i) * 0.12 + Math.random() * 0.12;
      f.scale.set(n, n * (0.9 + Math.random() * 0.3), n);
      f.material.emissiveIntensity = 1.6 + Math.random() * 0.9;
    }
    this.glow.intensity = 1.5 + Math.sin(elapsed * 9) * 0.25 + Math.random() * 0.3;

    // Photo topper: face the camera + gentle bob.
    if (this.topper && camera) {
      this.topper.position.y = this._topperBaseY + Math.sin(elapsed * 1.5) * 0.15;
      this.topper.rotation.y = Math.atan2(
        camera.position.x - this.group.position.x,
        camera.position.z - this.group.position.z
      );
    }
  }
}
