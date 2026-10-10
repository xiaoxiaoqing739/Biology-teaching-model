import * as THREE from '../shared/vendor/three.module.js';

function annularDisc(outerRadius, innerRadius, material, y) {
  const disc = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 72), material);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = y;
  return disc;
}

function hollowSection(radius, innerRadius, height, y, material) {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 72, 1, true), material);
  outer.position.y = y;
  group.add(outer);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(innerRadius, innerRadius, height, 48, 1, true), material);
  inner.material = material.clone();
  inner.material.side = THREE.BackSide;
  inner.position.y = y;
  group.add(inner, annularDisc(radius, innerRadius, material, y + height / 2), annularDisc(radius, innerRadius, material, y - height / 2));
  return group;
}

/** 原点位于塞子下端；插入后下部塞体进入瓶颈，凸缘保留在瓶口上方。 */
export function createPerforatedStopper() {
  const root = new THREE.Group();
  root.name = 'experiment-three-perforated-stopper';
  const cork = new THREE.MeshStandardMaterial({color: 0xb87742, roughness: .88, metalness: 0});
  const dark = new THREE.MeshStandardMaterial({color: 0x6d3f28, roughness: .94, side: THREE.DoubleSide});
  const plug = hollowSection(.76, .205, .62, .31, cork);
  const flange = hollowSection(.94, .205, .20, .70, cork);
  root.add(plug, flange);
  const holeShadow = new THREE.Mesh(new THREE.CylinderGeometry(.212, .212, .045, 48), dark);
  holeShadow.position.y = .815;
  root.add(holeShadow);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, .94, 24), new THREE.MeshBasicMaterial({transparent: true, opacity: .001, depthWrite: false}));
  hit.position.y = .42;
  root.add(hit);
  root.userData = {type: 'perforated-stopper', hit, holeRadius: .205, insertedDepth: .46};
  return root;
}
