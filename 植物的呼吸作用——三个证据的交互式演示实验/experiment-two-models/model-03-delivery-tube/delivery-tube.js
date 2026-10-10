import * as THREE from '../../shared/vendor/three.module.js';

export const DELIVERY_TUBE_SPEC = Object.freeze({
  outerDiameter: 0.16,
  innerDiameter: 0.10,
  bottleInnerLength: 0.62,
  bottleOuterVertical: 0.84,
  horizontalLength: 2.45,
  testTubeDescent: 5.80,
  upperBendRadius: 0.28,
  testTubeBendRadius: 0.24,
  bottleEndHeight: 4.55,
  testTubeOutletBottomClearance: 0.30,
});

function createPath(mirrored = false) {
  const direction = mirrored ? -1 : 1;
  const x = value => value * direction;
  const floorOffset = 1.44;
  const points = [
    [0, 0], [0, .28], [0, .62], [0, .90],
    [.035, 1.15], [.14, 1.34], [.28, 1.44],
    [.72, 1.46], [1.32, 1.46], [1.92, 1.46], [2.48, 1.46], [2.73, 1.44],
    [2.88, 1.34], [2.96, 1.18], [2.97, .40], [2.97, -.80], [2.97, -2.20], [2.97, -4.34],
  ].map(([px, py]) => new THREE.Vector3(x(px), py + floorOffset, 0));
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', .42);
}

function glassMaterial(side = THREE.FrontSide) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xbce9e7,
    roughness: .07,
    transmission: .68,
    transparent: true,
    opacity: .38,
    thickness: .05,
    ior: 1.46,
    side,
    depthWrite: false,
  });
}

function orientRingToTangent(ring, tangent) {
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent.clone().normalize());
}

export function createDeliveryTube({mirrored = false} = {}) {
  const spec = DELIVERY_TUBE_SPEC;
  const path = createPath(mirrored);
  const root = new THREE.Group();
  root.name = mirrored ? 'experiment-two-delivery-tube-group-b' : 'experiment-two-delivery-tube-group-a';

  const outer = new THREE.Mesh(
    new THREE.TubeGeometry(path, 160, spec.outerDiameter / 2, 20, false),
    glassMaterial(THREE.FrontSide),
  );
  outer.name = 'continuous-outer-glass-wall';
  outer.castShadow = true;
  const inner = new THREE.Mesh(
    new THREE.TubeGeometry(path, 160, spec.innerDiameter / 2, 20, false),
    glassMaterial(THREE.BackSide),
  );
  inner.name = 'continuous-inner-glass-wall';
  root.add(outer, inner);

  const endMaterial = glassMaterial(THREE.DoubleSide);
  const start = path.getPoint(0);
  const finish = path.getPoint(1);
  const startRing = new THREE.Mesh(
    new THREE.RingGeometry(spec.innerDiameter / 2, spec.outerDiameter / 2, 32),
    endMaterial,
  );
  startRing.name = 'bottle-end-glass-annulus';
  startRing.position.copy(start);
  orientRingToTangent(startRing, path.getTangent(0).multiplyScalar(-1));
  const finishRing = startRing.clone();
  finishRing.name = 'test-tube-end-glass-annulus';
  finishRing.position.copy(finish);
  orientRingToTangent(finishRing, path.getTangent(1));
  root.add(startRing, finishRing);

  const pick = new THREE.Mesh(
    new THREE.TubeGeometry(path, 100, .16, 12, false),
    new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
  );
  pick.name = 'expanded-delivery-tube-pick-volume';
  root.add(pick);

  const bottleAnchor = new THREE.Object3D();
  bottleAnchor.name = 'stopper-gas-hole-anchor';
  bottleAnchor.position.copy(start);
  bottleAnchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), path.getTangent(0));
  const testTubeAnchor = new THREE.Object3D();
  testTubeAnchor.name = 'test-tube-outlet-anchor';
  testTubeAnchor.position.copy(finish);
  testTubeAnchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), path.getTangent(1));
  root.add(bottleAnchor, testTubeAnchor);

  root.userData = {
    type: 'delivery-tube',
    version: 'model-03-v1',
    mirrored,
    dimensions: spec,
    continuousCurve: true,
    curveControlPointCount: 18,
    tubularSegments: 160,
    pick,
    anchors: {bottle: bottleAnchor, testTube: testTubeAnchor},
  };
  return root;
}
