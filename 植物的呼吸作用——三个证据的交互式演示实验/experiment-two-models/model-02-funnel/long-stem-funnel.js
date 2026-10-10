import * as THREE from '../../shared/vendor/three.module.js';

export const LONG_STEM_FUNNEL_SPEC = Object.freeze({
  mouthOuterDiameter: 1.00,
  mouthInnerDiameter: 0.86,
  rimThickness: 0.07,
  coneHeight: 0.70,
  stemOuterDiameter: 0.20,
  stemInnerDiameter: 0.12,
  stemLength: 5.16,
  totalHeight: 5.86,
  lowerCutAngle: 24,
  installedBottomClearance: 0.45,
});

function createGlassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xbde9e6,
    roughness: .08,
    metalness: 0,
    transmission: .65,
    transparent: true,
    opacity: .35,
    thickness: .08,
    ior: 1.46,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function createHollowStem(spec, material) {
  const segments = 64;
  const outerRadius = spec.stemOuterDiameter / 2;
  const innerRadius = spec.stemInnerDiameter / 2;
  const slope = Math.tan(THREE.MathUtils.degToRad(spec.lowerCutAngle));
  const positions = [];
  const indices = [];
  const bottomY = x => (x + outerRadius) * slope;

  for (let i = 0; i <= segments; i += 1) {
    const angle = i / segments * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const outerX = cos * outerRadius;
    const innerX = cos * innerRadius;
    positions.push(outerX, bottomY(outerX), sin * outerRadius);
    positions.push(outerX, spec.stemLength, sin * outerRadius);
    positions.push(innerX, bottomY(innerX), sin * innerRadius);
    positions.push(innerX, spec.stemLength, sin * innerRadius);
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i * 4;
    const b = a + 4;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
    indices.push(a + 2, a + 3, b + 2, b + 2, a + 3, b + 3);
    indices.push(a, a + 2, b, b, a + 2, b + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const stem = new THREE.Mesh(geometry, material);
  stem.name = 'hollow-stem-with-24-degree-cut';
  stem.castShadow = true;
  return stem;
}

function createFunnelBowl(spec, material) {
  const outerStemRadius = spec.stemOuterDiameter / 2;
  const innerStemRadius = spec.stemInnerDiameter / 2;
  const outerMouthRadius = spec.mouthOuterDiameter / 2;
  const innerMouthRadius = spec.mouthInnerDiameter / 2;
  const bottom = spec.stemLength;
  const top = spec.totalHeight;
  const profile = [
    new THREE.Vector2(outerStemRadius, bottom - .015),
    new THREE.Vector2(outerStemRadius, bottom + .035),
    new THREE.Vector2(outerMouthRadius, top - .035),
    new THREE.Vector2(outerMouthRadius, top),
    new THREE.Vector2(innerMouthRadius, top),
    new THREE.Vector2(innerMouthRadius, top - .07),
    new THREE.Vector2(innerStemRadius, bottom + .025),
    new THREE.Vector2(innerStemRadius, bottom - .015),
  ];
  const geometry = new THREE.LatheGeometry(profile, 128);
  geometry.computeVertexNormals();
  const bowl = new THREE.Mesh(geometry, material);
  bowl.name = 'continuous-hollow-funnel-bowl';
  bowl.castShadow = true;
  return bowl;
}

export function createLongStemFunnel() {
  const spec = LONG_STEM_FUNNEL_SPEC;
  const root = new THREE.Group();
  root.name = 'experiment-two-long-stem-funnel';
  const glass = createGlassMaterial();
  root.add(createHollowStem(spec, glass), createFunnelBowl(spec, glass));

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry((spec.mouthOuterDiameter + spec.mouthInnerDiameter) / 4, spec.rimThickness / 2, 12, 128),
    glass.clone(),
  );
  rim.name = 'rounded-glass-rim';
  rim.rotation.x = Math.PI / 2;
  rim.position.y = spec.totalHeight;
  root.add(rim);

  const pickMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false});
  const stemPick = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, spec.stemLength, 20), pickMaterial);
  stemPick.position.y = spec.stemLength / 2;
  stemPick.name = 'expanded-stem-pick-volume';
  const bowlPick = new THREE.Mesh(new THREE.CylinderGeometry(.56, .18, spec.coneHeight, 32), pickMaterial);
  bowlPick.position.y = spec.stemLength + spec.coneHeight / 2;
  bowlPick.name = 'expanded-bowl-pick-volume';
  root.add(stemPick, bowlPick);

  const connectionAnchor = new THREE.Object3D();
  connectionAnchor.name = 'stopper-connection-anchor';
  connectionAnchor.position.y = spec.stemLength - .58;
  const waterTarget = new THREE.Object3D();
  waterTarget.name = 'water-stream-target';
  waterTarget.position.y = spec.stemLength + spec.coneHeight * .48;
  root.add(connectionAnchor, waterTarget);

  root.userData = {
    type: 'long-stem-funnel',
    version: 'model-02-v1',
    dimensions: spec,
    realHollowStem: true,
    anchors: {stopper: connectionAnchor, waterTarget},
    pickVolumes: [stemPick, bowlPick],
  };
  return root;
}
