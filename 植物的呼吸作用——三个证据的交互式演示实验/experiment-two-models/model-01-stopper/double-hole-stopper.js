import * as THREE from '../../shared/vendor/three.module.js';

export const DOUBLE_HOLE_STOPPER_SPEC = Object.freeze({
  topDiameter: 2.16,
  topThickness: 0.24,
  plugTopDiameter: 1.82,
  plugBottomDiameter: 1.68,
  plugHeight: 0.58,
  totalHeight: 0.82,
  funnelHole: Object.freeze({centerX: 0.34, diameter: 0.26}),
  gasHole: Object.freeze({centerX: -0.34, diameter: 0.22}),
});

function createRubberTexture() {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  let seed = 271828;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < size * size; i += 1) {
    const grain = Math.round((random() - .5) * 24);
    const pore = random() > .985 ? -34 : 0;
    data[i * 4] = THREE.MathUtils.clamp(157 + grain + pore, 0, 255);
    data[i * 4 + 1] = THREE.MathUtils.clamp(99 + grain * .58 + pore, 0, 255);
    data[i * 4 + 2] = THREE.MathUtils.clamp(57 + grain * .34 + pore, 0, 255);
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.8, 2.8);
  texture.needsUpdate = true;
  return texture;
}

function createPerforatedShape(radius, spec) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const funnelHole = new THREE.Path();
  funnelHole.absarc(spec.funnelHole.centerX, 0, spec.funnelHole.diameter / 2, 0, Math.PI * 2, true);
  const gasHole = new THREE.Path();
  gasHole.absarc(spec.gasHole.centerX, 0, spec.gasHole.diameter / 2, 0, Math.PI * 2, true);
  shape.holes.push(funnelHole, gasHole);
  return shape;
}

function createPerforatedFace(radius, y, material, spec, faceDown = false) {
  const geometry = new THREE.ShapeGeometry(createPerforatedShape(radius, spec), 112);
  geometry.rotateX(faceDown ? Math.PI / 2 : -Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createOpenFrustum(topRadius, bottomRadius, height, bottomY, material, segments = 128) {
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, segments, 1, true);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = bottomY + height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createHoleLining(centerX, radius, height, bottomY) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4a2919,
    roughness: .90,
    metalness: 0,
    side: THREE.BackSide,
  });
  const lining = new THREE.Mesh(geometry, material);
  lining.position.set(centerX, bottomY + height / 2, 0);
  return lining;
}

export function createDoubleHoleStopper() {
  const spec = DOUBLE_HOLE_STOPPER_SPEC;
  const root = new THREE.Group();
  root.name = 'experiment-two-double-hole-stopper-approved-candidate';

  const texture = createRubberTexture();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xb97a47,
    map: texture,
    bumpMap: texture,
    bumpScale: .018,
    roughness: .82,
    metalness: 0,
  });
  const topMaterial = bodyMaterial.clone();
  topMaterial.color.setHex(0xc48750);
  topMaterial.roughness = .76;

  const plugSide = createOpenFrustum(
    spec.plugTopDiameter / 2,
    spec.plugBottomDiameter / 2,
    spec.plugHeight,
    0,
    bodyMaterial,
  );
  plugSide.name = 'continuous-tapered-plug-side';

  const capSide = createOpenFrustum(
    spec.topDiameter / 2,
    spec.topDiameter / 2,
    spec.topThickness,
    spec.plugHeight,
    topMaterial,
  );
  capSide.name = 'continuous-cap-side';

  const topFace = createPerforatedFace(spec.topDiameter / 2, spec.totalHeight, topMaterial, spec);
  topFace.name = 'stopper-top-with-real-holes';
  const bottomFace = createPerforatedFace(spec.plugBottomDiameter / 2, .002, bodyMaterial, spec, true);
  bottomFace.name = 'stopper-bottom-with-real-holes';

  const shoulder = new THREE.Mesh(
    new THREE.RingGeometry(spec.plugTopDiameter / 2, spec.topDiameter / 2, 128),
    topMaterial,
  );
  shoulder.name = 'cap-underside-shoulder';
  shoulder.rotation.x = Math.PI / 2;
  shoulder.position.y = spec.plugHeight + .002;
  shoulder.castShadow = true;
  shoulder.receiveShadow = true;
  root.add(plugSide, capSide, topFace, bottomFace, shoulder);

  const funnelLining = createHoleLining(spec.funnelHole.centerX, spec.funnelHole.diameter / 2, spec.totalHeight, 0);
  funnelLining.name = 'funnel-hole-inner-wall';
  const gasLining = createHoleLining(spec.gasHole.centerX, spec.gasHole.diameter / 2, spec.totalHeight, 0);
  gasLining.name = 'gas-hole-inner-wall';
  root.add(funnelLining, gasLining);

  const lowerEdge = new THREE.Mesh(
    new THREE.TorusGeometry(spec.plugBottomDiameter / 2, .012, 8, 112),
    new THREE.MeshStandardMaterial({color: 0x734529, roughness: .88, transparent: true, opacity: .72}),
  );
  lowerEdge.rotation.x = Math.PI / 2;
  lowerEdge.position.y = .008;
  root.add(lowerEdge);

  const pickMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false});
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(1.16, .96, .94, 36), pickMaterial);
  pick.name = 'stopper-expanded-pick-volume';
  pick.position.y = .43;
  root.add(pick);

  const funnelAnchor = new THREE.Object3D();
  funnelAnchor.name = 'funnel-port-anchor';
  funnelAnchor.position.set(spec.funnelHole.centerX, spec.totalHeight, 0);
  const gasAnchor = new THREE.Object3D();
  gasAnchor.name = 'gas-port-anchor';
  gasAnchor.position.set(spec.gasHole.centerX, spec.totalHeight, 0);
  const bottleAnchor = new THREE.Object3D();
  bottleAnchor.name = 'bottle-connection-anchor';
  root.add(funnelAnchor, gasAnchor, bottleAnchor);

  root.userData = {
    type: 'double-hole-stopper',
    version: 'model-01-v2',
    dimensions: spec,
    pick,
    anchors: {funnel: funnelAnchor, gasTube: gasAnchor, bottle: bottleAnchor},
    realThroughHoles: true,
  };
  return root;
}
