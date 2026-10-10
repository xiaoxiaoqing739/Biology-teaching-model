import * as THREE from '../../shared/vendor/three.module.js';
import {beakerFluid} from './fluid-geometry.js';

export const WATER_BEAKER_SPEC = Object.freeze({
  mouthOuterDiameter: 1.24,
  bottomOuterDiameter: 1.04,
  height: 1.66,
  wallThickness: 0.06,
  initialFillRatio: 0.78,
  emptyFillRatio: 0,
  pouringAngleMin: 58,
  pouringAngleMax: 65,
  streamDiameterMin: 0.07,
  streamDiameterMax: 0.10,
});

function glassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xbdeae8,
    roughness: .08,
    transmission: .68,
    transparent: true,
    opacity: .34,
    thickness: .06,
    ior: 1.46,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function createBeakerProfile(spec) {
  const outerBottom = spec.bottomOuterDiameter / 2;
  const outerTop = spec.mouthOuterDiameter / 2;
  const innerBottom = outerBottom - spec.wallThickness;
  const innerTop = outerTop - spec.wallThickness;
  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(outerBottom, 0),
    new THREE.Vector2(outerTop, spec.height),
    new THREE.Vector2(innerTop, spec.height),
    new THREE.Vector2(innerBottom, spec.wallThickness),
    new THREE.Vector2(0, spec.wallThickness),
  ];
}

function createWater(spec) {
  const bottomRadius = spec.bottomOuterDiameter / 2 - spec.wallThickness - .012;
  const topRadius = spec.mouthOuterDiameter / 2 - spec.wallThickness - .012;
  const bottom = spec.wallThickness;
  const top = spec.height - spec.wallThickness * 1.8;
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xb8e8f1,
    roughness: .05,
    transmission: .76,
    transparent: true,
    opacity: .42,
    thickness: .35,
    ior: 1.333,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const liquid = new THREE.Mesh(beakerFluid(0, spec.initialFillRatio, bottomRadius, topRadius, bottom, top), material);
  liquid.name = 'world-horizontal-contained-water';
  liquid.userData = {bottomRadius, topRadius, bottom, top, fraction: spec.initialFillRatio, angle: 0};
  return liquid;
}

export function createWaterBeaker() {
  const spec = WATER_BEAKER_SPEC;
  const root = new THREE.Group();
  root.name = 'experiment-two-water-beaker';
  const beaker = new THREE.Mesh(new THREE.LatheGeometry(createBeakerProfile(spec), 128), glassMaterial());
  beaker.name = 'continuous-hollow-tapered-beaker';
  beaker.castShadow = true;
  root.add(beaker);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(spec.mouthOuterDiameter / 2, spec.wallThickness / 2, 16, 128),
    glassMaterial(),
  );
  rim.name = 'rounded-outer-rim';
  rim.rotation.x = Math.PI / 2;
  rim.position.y = spec.height;
  root.add(rim);

  const innerRim = new THREE.Mesh(
    new THREE.TorusGeometry(spec.mouthOuterDiameter / 2 - spec.wallThickness, spec.wallThickness * .12, 10, 128),
    glassMaterial(),
  );
  innerRim.name = 'inner-rim-edge';
  innerRim.rotation.x = Math.PI / 2;
  innerRim.position.y = spec.height - .012;
  root.add(innerRim);

  const spoutScale = spec.mouthOuterDiameter / 2 / .235;
  const spoutShape = new THREE.Shape();
  spoutShape.moveTo(-.055 * spoutScale, 0);
  spoutShape.quadraticCurveTo(0, .045 * spoutScale, .065 * spoutScale, 0);
  spoutShape.lineTo(.045 * spoutScale, -.018 * spoutScale);
  spoutShape.quadraticCurveTo(0, .012 * spoutScale, -.045 * spoutScale, -.018 * spoutScale);
  spoutShape.closePath();
  const spoutGeometry = new THREE.ExtrudeGeometry(spoutShape, {
    depth: .025 * spoutScale,
    bevelEnabled: true,
    bevelSize: .006 * spoutScale,
    bevelThickness: .004 * spoutScale,
    bevelSegments: 3,
  });
  spoutGeometry.center();
  const spout = new THREE.Mesh(spoutGeometry, glassMaterial());
  spout.name = 'approved-curved-pouring-spout';
  spout.position.set(spec.mouthOuterDiameter / 2 - .016, spec.height, 0);
  spout.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  root.add(spout);

  const water = createWater(spec);
  root.add(water);

  const pick = new THREE.Mesh(
    new THREE.CylinderGeometry(.73, .62, 1.82, 32),
    new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
  );
  pick.name = 'expanded-beaker-pick-volume';
  pick.position.y = .84;
  root.add(pick);

  const streamOrigin = new THREE.Object3D();
  streamOrigin.name = 'water-stream-origin';
  streamOrigin.position.set(spec.mouthOuterDiameter / 2 + .15, spec.height + .025, 0);
  root.add(streamOrigin);

  function setPourState(angle, fillProgress) {
    const progress = THREE.MathUtils.clamp(fillProgress, 0, 1);
    const remainingFraction = spec.initialFillRatio * (1 - progress);
    const data = water.userData;
    const nextGeometry = beakerFluid(angle, Math.max(remainingFraction, .001), data.bottomRadius, data.topRadius, data.bottom, data.top);
    water.geometry.dispose();
    water.geometry = nextGeometry;
    water.visible = remainingFraction > .012;
    data.fraction = remainingFraction;
    data.angle = angle;
  }

  root.userData = {
    type: 'water-beaker',
    version: 'model-06-v1',
    dimensions: spec,
    water,
    pick,
    anchors: {streamOrigin},
    setFillProgress: progress => setPourState(0, progress),
    setPourState,
  };
  setPourState(0, 0);
  return root;
}

export function createWaterStream() {
  const root = new THREE.Group();
  root.name = 'curved-gravity-water-stream';
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xb9ebf5,
    roughness: .04,
    transmission: .78,
    transparent: true,
    opacity: .66,
    thickness: .08,
    ior: 1.333,
    depthWrite: false,
  });
  const segments = Array.from({length: 26}, (_, index) => {
    const segment = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), material);
    segment.name = `tapered-water-stream-segment-${index + 1}`;
    segment.visible = false;
    root.add(segment);
    return segment;
  });
  const droplets = Array.from({length: 5}, (_, index) => {
    const droplet = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 8), material.clone());
    droplet.name = `remaining-water-droplet-${index + 1}`;
    droplet.visible = false;
    root.add(droplet);
    return droplet;
  });
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();

  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion();
  function bezier(a, b, c, d, t, target = new THREE.Vector3()) {
    const inverse = 1 - t;
    return target.set(0, 0, 0)
      .addScaledVector(a, inverse ** 3)
      .addScaledVector(b, 3 * inverse * inverse * t)
      .addScaledVector(c, 3 * inverse * t * t)
      .addScaledVector(d, t ** 3);
  }
  function update(from, to, strength, elapsed = 0, direction = new THREE.Vector3(1, 0, 0)) {
    start.copy(from);
    end.copy(to);
    const amount = THREE.MathUtils.clamp(strength, 0, 1);
    const control1 = start.clone().addScaledVector(direction.clone().normalize(), .34 + .08 * amount);
    const control2 = end.clone().add(new THREE.Vector3(0, .42 + .08 * amount, 0));
    const points = [];
    for (let index = 0; index <= segments.length; index += 1) points.push(bezier(start, control1, control2, end, index / segments.length));
    segments.forEach((segment, index) => {
      const a = points[index];
      const b = points[index + 1];
      const t = index / (segments.length - 1);
      const radius = (.046 - .021 * t) * (.35 + .65 * amount) * (1 + .06 * Math.sin(elapsed * .018 + index));
      segment.visible = amount > .025;
      segment.position.copy(a).add(b).multiplyScalar(.5);
      segment.quaternion.copy(quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()));
      segment.scale.set(radius, a.distanceTo(b) * 1.10, radius);
      segment.material.opacity = THREE.MathUtils.lerp(.38, .72, amount);
    });
    droplets.forEach((droplet, index) => {
      const show = amount > 0 && amount < .22 && index < 3;
      droplet.visible = show;
      if (!show) return;
      const phase = (elapsed * .0016 + index * .27) % 1;
      droplet.position.copy(bezier(start, control1, control2, end, .58 + .42 * phase));
      droplet.scale.set(1, 1.35, 1);
      droplet.material.opacity = .56 * (1 - phase * .35);
    });
  }

  function hide() {
    segments.forEach(segment => { segment.visible = false; });
    droplets.forEach(droplet => { droplet.visible = false; });
  }
  root.userData = {type: 'water-stream', update, hide, components: {segments, droplets}};
  hide();
  return root;
}
