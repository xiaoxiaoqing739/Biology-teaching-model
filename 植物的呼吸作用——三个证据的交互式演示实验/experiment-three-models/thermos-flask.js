import * as THREE from '../shared/vendor/three.module.js';

const glassMaterial = () => new THREE.MeshPhysicalMaterial({
  color: 0xc7edf0,
  roughness: .12,
  transmission: .72,
  transparent: true,
  opacity: .42,
  ior: 1.42,
  thickness: .18,
  clearcoat: .5,
  side: THREE.DoubleSide,
  depthWrite: false,
});

function openCylinder(radius, height, material) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 72, 1, true), material);
}

/**
 * 教学剖视保温瓶。模型原点位于瓶底中心，便于把种子、温度计和瓶塞共用同一坐标系。
 */
export function createThermosFlask() {
  const root = new THREE.Group();
  root.name = 'experiment-three-thermos-flask';

  const outerGlass = glassMaterial();
  const innerGlass = glassMaterial();
  innerGlass.opacity = .30;
  innerGlass.color.set(0xe0f7f6);
  const edge = new THREE.MeshStandardMaterial({color: 0x9fc9c7, roughness: .28, metalness: .34});
  const insulation = new THREE.MeshPhysicalMaterial({
    color: 0xa8c7c9,
    roughness: .24,
    metalness: .34,
    transparent: true,
    opacity: .28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const outerBody = openCylinder(1.50, 4.05, outerGlass);
  outerBody.position.y = 2.18;
  outerBody.castShadow = true;
  root.add(outerBody);

  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(.88, 1.50, 1.02, 72, 1, true), outerGlass);
  shoulder.position.y = 4.70;
  shoulder.castShadow = true;
  root.add(shoulder);

  const neck = openCylinder(.88, .56, outerGlass);
  neck.position.y = 5.47;
  root.add(neck);

  const innerChamber = openCylinder(1.08, 4.30, innerGlass);
  innerChamber.position.y = 2.48;
  root.add(innerChamber);

  const innerBottom = new THREE.Mesh(new THREE.SphereGeometry(1.08, 72, 28, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), innerGlass);
  innerBottom.scale.y = .34;
  innerBottom.position.y = .34;
  root.add(innerBottom);

  const vacuumBand = openCylinder(1.29, 3.92, insulation);
  vacuumBand.position.y = 2.20;
  root.add(vacuumBand);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.50, 1.50, .22, 72), edge);
  base.position.y = .11;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);

  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(1.48, .055, 14, 72), edge);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = .19;
  root.add(baseRing);

  const mouthOuter = new THREE.Mesh(new THREE.TorusGeometry(.92, .10, 18, 72), edge);
  mouthOuter.rotation.x = Math.PI / 2;
  mouthOuter.position.y = 5.76;
  root.add(mouthOuter);

  const mouthInner = new THREE.Mesh(new THREE.TorusGeometry(.69, .045, 14, 72), edge);
  mouthInner.rotation.x = Math.PI / 2;
  mouthInner.position.y = 5.74;
  root.add(mouthInner);

  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(1.62, 1.62, 5.9, 24),
    new THREE.MeshBasicMaterial({transparent: true, opacity: .001, depthWrite: false}),
  );
  hit.position.y = 2.95;
  root.add(hit);

  const anchors = {
    mouth: new THREE.Object3D(),
    stopper: new THREE.Object3D(),
    seedBase: new THREE.Object3D(),
    seedHalfTop: new THREE.Object3D(),
    thermometerBulb: new THREE.Object3D(),
  };
  anchors.mouth.position.set(0, 5.76, 0);
  anchors.stopper.position.set(0, 5.32, 0);
  anchors.seedBase.position.set(0, .34, 0);
  anchors.seedHalfTop.position.set(0, 2.50, 0);
  anchors.thermometerBulb.position.set(0, 1.28, 0);
  Object.values(anchors).forEach(anchor => root.add(anchor));

  root.userData = {
    type: 'thermos-flask',
    anchors,
    hit,
    interiorRadius: 1.08,
    interiorBaseY: .34,
    interiorTopY: 4.66,
    halfFillTopY: 2.50,
  };
  return root;
}
