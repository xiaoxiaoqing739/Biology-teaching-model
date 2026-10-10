import * as THREE from '../../shared/vendor/three.module.js';

export const TEST_TUBE_SPEC = Object.freeze({
  outerDiameter: 0.54,
  innerDiameter: 0.44,
  totalHeight: 3.20,
  straightWallHeight: 2.93,
  roundedBottomRadius: 0.27,
  mouthOuterDiameter: 0.62,
  mouthThickness: 0.08,
  glassWallThickness: 0.05,
});

function createGlassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xbfecea,
    roughness: .08,
    metalness: 0,
    transmission: .68,
    transparent: true,
    opacity: .36,
    thickness: .05,
    ior: 1.46,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function createTestTubeProfile(spec) {
  const outerRadius = spec.outerDiameter / 2;
  const innerRadius = spec.innerDiameter / 2;
  const mouthRadius = spec.mouthOuterDiameter / 2;
  const bodyTop = spec.totalHeight - spec.mouthThickness;
  const points = [];

  for (let index = 0; index <= 16; index += 1) {
    const angle = index / 16 * Math.PI / 2;
    points.push(new THREE.Vector2(
      outerRadius * Math.sin(angle),
      outerRadius - outerRadius * Math.cos(angle),
    ));
  }
  points.push(
    new THREE.Vector2(outerRadius, bodyTop - .04),
    new THREE.Vector2(mouthRadius, bodyTop),
    new THREE.Vector2(mouthRadius, spec.totalHeight),
    new THREE.Vector2(innerRadius, spec.totalHeight),
    new THREE.Vector2(innerRadius, bodyTop),
    new THREE.Vector2(innerRadius, outerRadius),
  );
  for (let index = 16; index >= 0; index -= 1) {
    const angle = index / 16 * Math.PI / 2;
    points.push(new THREE.Vector2(
      innerRadius * Math.sin(angle),
      outerRadius - innerRadius * Math.cos(angle),
    ));
  }
  return points;
}

export function createTestTube() {
  const spec = TEST_TUBE_SPEC;
  const root = new THREE.Group();
  root.name = 'experiment-two-round-bottom-test-tube';

  const geometry = new THREE.LatheGeometry(createTestTubeProfile(spec), 128);
  geometry.computeVertexNormals();
  const glass = new THREE.Mesh(geometry, createGlassMaterial());
  glass.name = 'continuous-hollow-round-bottom-glass';
  glass.castShadow = true;
  root.add(glass);

  const rimHighlight = new THREE.Mesh(
    new THREE.TorusGeometry((spec.mouthOuterDiameter + spec.innerDiameter) / 4, spec.mouthThickness / 2, 12, 128),
    createGlassMaterial(),
  );
  rimHighlight.name = 'rounded-mouth-rim';
  rimHighlight.rotation.x = Math.PI / 2;
  rimHighlight.position.y = spec.totalHeight - spec.mouthThickness / 2;
  root.add(rimHighlight);

  const pick = new THREE.Mesh(
    new THREE.CapsuleGeometry(.34, 2.72, 12, 24),
    new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
  );
  pick.name = 'expanded-test-tube-pick-volume';
  pick.position.y = 1.60;
  root.add(pick);

  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.name = 'delivery-tube-entry-anchor';
  mouthAnchor.position.y = spec.totalHeight;
  const liquidOrigin = new THREE.Object3D();
  liquidOrigin.name = 'limewater-volume-origin';
  liquidOrigin.position.y = spec.glassWallThickness;
  const outletTarget = new THREE.Object3D();
  outletTarget.name = 'delivery-tube-outlet-target';
  outletTarget.position.y = .30;
  root.add(mouthAnchor, liquidOrigin, outletTarget);

  root.userData = {
    type: 'round-bottom-test-tube',
    version: 'model-04-v1',
    dimensions: spec,
    hollowInterior: true,
    invisiblePositionConstraintAllowed: true,
    pick,
    anchors: {mouth: mouthAnchor, liquidOrigin, outlet: outletTarget},
  };
  return root;
}
