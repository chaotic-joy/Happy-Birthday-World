import * as THREE from 'three';
import { COLORS, TRACK_POINTS, ROAD_WIDTH } from './config.js';

// Builds the looping circuit: a smooth closed curve, a flat asphalt road ribbon
// with red/white kerb edges, a green ground plane, and scattered low-poly trees.
// Returns { group, curve, startTransform } for reuse by car/placeholders/banner.
export function createTrack() {
  const group = new THREE.Group();

  const curve = new THREE.CatmullRomCurve3(TRACK_POINTS, true, 'catmullrom', 0.5);
  const SEGMENTS = 400;

  // --- Ground ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600, 1, 1),
    new THREE.MeshLambertMaterial({ color: COLORS.ground })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // --- Road ribbon ---
  const half = ROAD_WIDTH / 2;
  const points = curve.getSpacedPoints(SEGMENTS);
  const roadPositions = [];
  const roadUvs = [];
  const kerbLPos = [];
  const kerbRPos = [];

  const up = new THREE.Vector3(0, 1, 0);
  const kerbW = 0.7;

  for (let i = 0; i <= SEGMENTS; i++) {
    const p = points[i % points.length];
    const t = i / SEGMENTS;
    const tangent = curve.getTangentAt((i % SEGMENTS) / SEGMENTS).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const left = new THREE.Vector3().copy(p).addScaledVector(side, -half);
    const right = new THREE.Vector3().copy(p).addScaledVector(side, half);
    roadPositions.push(left.x, 0.02, left.z, right.x, 0.02, right.z);
    roadUvs.push(0, t * 40, 1, t * 40);

    // kerbs sit just outside the road edges
    const lInner = new THREE.Vector3().copy(p).addScaledVector(side, -half);
    const lOuter = new THREE.Vector3().copy(p).addScaledVector(side, -half - kerbW);
    const rInner = new THREE.Vector3().copy(p).addScaledVector(side, half);
    const rOuter = new THREE.Vector3().copy(p).addScaledVector(side, half + kerbW);
    kerbLPos.push(lOuter.x, 0.04, lOuter.z, lInner.x, 0.04, lInner.z);
    kerbRPos.push(rInner.x, 0.04, rInner.z, rOuter.x, 0.04, rOuter.z);
  }

  group.add(buildStrip(roadPositions, roadUvs, COLORS.asphalt));
  group.add(buildKerb(kerbLPos));
  group.add(buildKerb(kerbRPos));

  // --- Start/finish line (white checker-ish stripe) ---
  const startP = curve.getPointAt(0);
  const startTangent = curve.getTangentAt(0).normalize();
  const startAngle = Math.atan2(startTangent.x, startTangent.z);
  const startLine = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH, 2.2),
    new THREE.MeshBasicMaterial({ color: 0xc7c7cf, transparent: true, opacity: 0.6 })
  );
  startLine.rotation.x = -Math.PI / 2;
  startLine.rotation.z = -startAngle;
  startLine.position.set(startP.x, 0.05, startP.z);
  group.add(startLine);

  // --- Low-poly trees scattered off the track ---
  scatterTrees(group, curve, points);

  const startTransform = { position: startP.clone(), angle: startAngle, tangent: startTangent };

  return { group, curve, startTransform };
}

function buildStrip(positions, uvs, color) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (uvs) geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const vertCount = positions.length / 3;
  const indices = [];
  for (let i = 0; i < vertCount - 2; i += 2) {
    indices.push(i, i + 1, i + 2, i + 2, i + 1, i + 3);
  }
  geom.setIndex(indices);
  geom.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// Kerb with alternating red/white segments using vertex colors.
function buildKerb(positions) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const vertCount = positions.length / 3;
  const colors = [];
  const a = new THREE.Color(COLORS.kerbA);
  const b = new THREE.Color(COLORS.kerbB);
  for (let i = 0; i < vertCount; i += 2) {
    const c = (Math.floor(i / 2) % 6 < 3) ? a : b;
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const indices = [];
  for (let i = 0; i < vertCount - 2; i += 2) {
    indices.push(i, i + 1, i + 2, i + 2, i + 1, i + 3);
  }
  geom.setIndex(indices);
  geom.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  return new THREE.Mesh(geom, mat);
}

function scatterTrees(group, curve, roadPoints) {
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.6, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: COLORS.treeTrunk });
  const leafGeo = new THREE.ConeGeometry(2.0, 4.2, 7);
  const leafMat = new THREE.MeshLambertMaterial({ color: COLORS.tree });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x8ad08f });

  const trees = new THREE.Group();
  const tmp = new THREE.Vector3();
  let placed = 0;
  let attempts = 0;
  while (placed < 90 && attempts < 1200) {
    attempts++;
    const x = (Math.random() - 0.5) * 360;
    const z = (Math.random() - 0.5) * 360;
    // keep trees away from the road
    let tooClose = false;
    for (let i = 0; i < roadPoints.length; i += 6) {
      tmp.copy(roadPoints[i]);
      if (tmp.distanceToSquared(new THREE.Vector3(x, 0, z)) < 13 * 13) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.8;
    const leaves = new THREE.Mesh(leafGeo, Math.random() > 0.5 ? leafMat : leafMat2);
    leaves.position.y = 3.4;
    tree.add(trunk, leaves);
    const s = 0.7 + Math.random() * 0.9;
    tree.scale.setScalar(s);
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI;
    trees.add(tree);
    placed++;
  }
  group.add(trees);
}
