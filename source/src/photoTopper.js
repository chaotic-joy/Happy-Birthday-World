import * as THREE from 'three';

// A circular framed photo: a cream backing disk + a circular crop of the image,
// unlit so it stays bright at night. Used for the cake topper and the car topper.
export function makeCircularPhoto(url, radius) {
  const group = new THREE.Group();

  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;

  const frame = new THREE.Mesh(
    new THREE.CircleGeometry(radius + 0.18 + radius * 0.06, 48),
    new THREE.MeshBasicMaterial({ color: 0xfff6e9, side: THREE.DoubleSide })
  );
  group.add(frame);

  // CircleGeometry maps the texture to the inscribed circle, giving a clean
  // circular crop of the (square) photo.
  const photo = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
  photo.position.z = 0.02;
  group.add(photo);

  return group;
}
