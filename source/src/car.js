import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { COLORS, CAR } from './config.js';

// Where to find the external low-poly F1 model + its palette texture, and how to
// fit it into the world (target length along Z; yaw if the nose faces -Z).
const MODEL = {
  obj: './models/LowpolyF1.obj',
  texture: './models/Colores03.png',
  length: 5,
  yawDeg: 0,
};

// The F1 car: external OBJ model (with a procedural fallback) + arcade physics.
export class Car {
  constructor() {
    this.group = new THREE.Group();
    this.body = new THREE.Group(); // visual body that leans; physics live on this.group
    this.group.add(this.body);

    this.position = new THREE.Vector3(0, 0, 0);
    this.heading = 0; // radians, 0 = facing +Z
    this.speed = 0; // signed (forward positive)
    this.wheels = [];
    this.exhaust = new THREE.Object3D(); // attach point for boost trail
    this.exhaust.position.set(0, 0.6, -2.3);
    this.group.add(this.exhaust);

    // Resolves once the model (or fallback) is in place, so boot can wait for it.
    this.ready = new Promise((resolve) => (this._resolveReady = resolve));
    this._loadModel();
  }

  _loadModel() {
    new OBJLoader().load(
      MODEL.obj,
      (obj) => {
        const tex = new THREE.TextureLoader().load(MODEL.texture);
        tex.colorSpace = THREE.SRGBColorSpace;
        // Slight self-illumination from the texture so the car reads at night.
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.22,
          roughness: 0.6,
          metalness: 0.08,
        });
        obj.traverse((o) => {
          if (o.isMesh) {
            o.material = mat;
            o.castShadow = true;
          }
        });

        // Fit: scale to target length (along Z), face forward, sit on the ground.
        const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
        obj.scale.setScalar(MODEL.length / size.z);
        obj.rotation.y = (MODEL.yawDeg * Math.PI) / 180;
        const box = new THREE.Box3().setFromObject(obj);
        const c = box.getCenter(new THREE.Vector3());
        obj.position.x -= c.x;
        obj.position.z -= c.z;
        obj.position.y -= box.min.y;

        this.body.add(obj);
        this._resolveReady();
      },
      undefined,
      () => {
        console.info('[car] model failed to load, using built-in car.');
        this._buildProcedural();
        this._resolveReady();
      }
    );
  }

  _buildProcedural() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: COLORS.carBody });
    const accentMat = new THREE.MeshLambertMaterial({ color: COLORS.carAccent });
    const noseMat = new THREE.MeshLambertMaterial({ color: COLORS.carNose });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2733 });

    // Main tub
    const tub = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 3.2), bodyMat);
    tub.position.y = 0.7;
    tub.castShadow = true;
    this.body.add(tub);

    // Nose cone (front, +Z)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 4), noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.rotation.z = Math.PI / 4;
    nose.position.set(0, 0.6, 2.4);
    nose.castShadow = true;
    this.body.add(nose);

    // Front wing
    const fWing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.7), accentMat);
    fWing.position.set(0, 0.42, 2.9);
    this.body.add(fWing);

    // Cockpit / driver bump
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), darkMat);
    cockpit.position.set(0, 1.05, 0.2);
    cockpit.scale.set(1, 0.9, 1.1);
    this.body.add(cockpit);

    // Halo-ish hoop (cute detail)
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 16, Math.PI), accentMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 1.25, 0.2);
    this.body.add(halo);

    // Rear wing
    const rWingPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), darkMat);
    rWingPost.position.set(0, 1.1, -1.5);
    this.body.add(rWingPost);
    const rWing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.6), accentMat);
    rWing.position.set(0, 1.35, -1.5);
    this.body.add(rWing);

    // Engine cover taper
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.4), bodyMat);
    cover.position.set(0, 0.85, -0.9);
    this.body.add(cover);

    // Wheels (4 fat cylinders)
    const wheelGeo = new THREE.CylinderGeometry(CAR.wheelRadius, CAR.wheelRadius, 0.55, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x2a2733 });
    const rimMat = new THREE.MeshLambertMaterial({ color: COLORS.carNose });
    const wheelPositions = [
      [-0.95, 0.55, 1.5],
      [0.95, 0.55, 1.5],
      [-0.95, 0.55, -1.5],
      [0.95, 0.55, -1.5],
    ];
    for (const [x, y, z] of wheelPositions) {
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.57, 8),
        rimMat
      );
      rim.rotation.z = Math.PI / 2;
      wheel.add(tire, rim);
      wheel.position.set(x, y, z);
      this.body.add(wheel);
      this.wheels.push(wheel);
    }

    this.group.position.copy(this.position);
  }

  // Place the car at a position/heading (used to set it on the grid).
  placeAt(position, angle) {
    this.position.copy(position);
    this.position.y = 0;
    this.heading = angle;
    this.speed = 0;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
  }

  // input: {up,down,left,right}; maxSpeed/accelMult are modified by the boost module.
  update(dt, input, maxSpeed, accelMult) {
    const forward = this.speed >= 0;

    if (input.up) {
      this.speed += CAR.accel * accelMult * dt;
    } else if (input.down) {
      if (forward && this.speed > 0.1) {
        this.speed -= CAR.brake * dt; // braking
      } else {
        this.speed -= CAR.reverseAccel * dt; // reverse
      }
    } else {
      // passive friction toward 0
      const drop = CAR.friction * dt;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - drop);
      else this.speed = Math.min(0, this.speed + drop);
    }

    this.speed = THREE.MathUtils.clamp(this.speed, -CAR.maxReverse, maxSpeed);

    // Steering scales with speed (no turning while parked), and flips in reverse.
    const speedFactor = THREE.MathUtils.clamp(Math.abs(this.speed) / 8, 0, 1);
    let steerInput = 0;
    if (input.left) steerInput += 1;
    if (input.right) steerInput -= 1;
    const dir = this.speed >= 0 ? 1 : -1;
    this.heading += steerInput * CAR.steer * speedFactor * dir * dt;

    // Integrate position along heading.
    const dx = Math.sin(this.heading) * this.speed * dt;
    const dz = Math.cos(this.heading) * this.speed * dt;
    this.position.x += dx;
    this.position.z += dz;

    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // Visual lean into corners.
    const targetLean = -steerInput * CAR.bodyLean * speedFactor;
    this.body.rotation.z += (targetLean - this.body.rotation.z) * Math.min(1, dt * 8);

    // Spin wheels by distance traveled.
    const wheelSpin = (this.speed * dt) / CAR.wheelRadius;
    for (const w of this.wheels) w.rotation.x += wheelSpin;
  }
}
