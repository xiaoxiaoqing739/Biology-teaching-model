import * as THREE from '../vendor/three.module.js';

const DEFAULTS = Object.freeze({
  veinSize: 1.32,
  xylemCount: 6,
  phloemCount: 6,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function createTube({name, length, radius, color, opacity = 1, selectRoot, showCaps = true, openEnded = false}) {
  const group = new THREE.Group();
  group.name = name;
  const material = new THREE.MeshPhysicalMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    roughness: 0.42,
    transmission: opacity < 0.7 ? 0.06 : 0,
    depthWrite: opacity >= 0.7,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24, 1, openEnded), material);
  body.rotation.z = Math.PI * 0.5;
  body.name = `${name}_Body`;
  body.userData.selectRoot = selectRoot;
  group.add(body);
  if (showCaps) {
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 14), material.clone());
      cap.name = `${name}_Cap`;
      cap.position.x = side * length * 0.5;
      cap.userData.selectRoot = selectRoot;
      group.add(cap);
    }
  }
  return group;
}

function ellipticalClusterPositions(count, {centerY, radiusY, radiusZ, phase = 0}) {
  const positions = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const radial = count === 1 ? 0 : Math.sqrt((index + 0.3) / count);
    const angle = phase + index * goldenAngle;
    positions.push({
      y: centerY + Math.cos(angle) * radial * radiusY,
      z: Math.sin(angle) * radial * radiusZ,
    });
  }
  return positions;
}

function sixTubePacking(radius, centerY, topRowCount) {
  const horizontalStep = radius * 2.06;
  const verticalStep = Math.sqrt(3) * radius * 1.03;
  const row = (count, y) => Array.from({length: count}, (_, index) => ({
    y,
    z: (index - (count - 1) * 0.5) * horizontalStep,
  }));
  return [
    ...row(topRowCount, centerY + verticalStep * 0.5),
    ...row(6 - topRowCount, centerY - verticalStep * 0.5),
  ];
}

export function createLeafVein(initialParameters = {}) {
  const root = new THREE.Group();
  root.name = 'LeafVeinVascularBundle';
  root.userData.modelType = 'leaf-vein';
  root.userData.modelVersion = 3;

  const visual = new THREE.Group();
  visual.name = 'LeafVeinVisual';
  root.add(visual);

  const anchors = {};
  for (const name of ['left', 'right', 'topSurface', 'bottomSurface', 'front', 'back', 'center']) {
    const anchor = new THREE.Object3D();
    anchor.name = `Anchor_${name}`;
    anchor.userData.anchorType = name;
    anchors[name] = anchor;
    root.add(anchor);
  }

  let parameters = {...DEFAULTS, ...initialParameters};
  let xylemTubes = [];
  let phloemTubes = [];
  let bundleSheath = null;
  let hitbox = null;
  let size = null;

  function normalize(next) {
    return {
      veinSize: clamp(Number(next.veinSize), 0.72, 1.42),
      xylemCount: Math.round(clamp(Number(next.xylemCount), 2, 8)),
      phloemCount: Math.round(clamp(Number(next.phloemCount), 3, 10)),
    };
  }

  function getDimensions() {
    const scale = parameters.veinSize;
    return {
      length: 5.2 * scale,
      height: 1.62 * scale,
      depth: 1.55 * scale,
      scale,
    };
  }

  function clear() {
    while (visual.children.length) {
      const child = visual.children.pop();
      disposeObject(child);
    }
    xylemTubes = [];
    phloemTubes = [];
    bundleSheath = null;
    hitbox = null;
  }

  function updateAnchors() {
    anchors.left.position.set(-size.length * 0.5, 0, 0);
    anchors.right.position.set(size.length * 0.5, 0, 0);
    anchors.topSurface.position.set(0, size.height * 0.5, 0);
    anchors.bottomSurface.position.set(0, -size.height * 0.5, 0);
    anchors.front.position.set(0, 0, size.depth * 0.5);
    anchors.back.position.set(0, 0, -size.depth * 0.5);
    anchors.center.position.set(0, 0, 0);
  }

  function rebuild() {
    parameters = normalize(parameters);
    clear();
    size = getDimensions();

    bundleSheath = createTube({
      name: 'BundleSheath',
      length: size.length,
      radius: size.height * 0.5,
      color: 0x9fc78f,
      opacity: 0.1,
      selectRoot: root,
      showCaps: false,
      openEnded: true,
    });
    bundleSheath.scale.z = size.depth / size.height;
    visual.add(bundleSheath);

    const xylemRadius = 0.14 * size.scale;
    const phloemRadius = 0.115 * size.scale;
    const conduitLength = size.length * 0.86;
    const groupGap = 0.035 * size.scale;
    const xylemHalfHeight = Math.sqrt(3) * xylemRadius * 1.03 * 0.5 + xylemRadius;
    const phloemHalfHeight = Math.sqrt(3) * phloemRadius * 1.03 * 0.5 + phloemRadius;
    const xylemCenterY = groupGap * 0.5 + xylemHalfHeight;
    const phloemCenterY = -groupGap * 0.5 - phloemHalfHeight;
    const xylemPositions = parameters.xylemCount === 6
      ? sixTubePacking(xylemRadius, xylemCenterY, 2)
      : ellipticalClusterPositions(parameters.xylemCount, {
        centerY: xylemCenterY,
        radiusY: xylemHalfHeight * 0.62,
        radiusZ: size.depth * 0.27,
        phase: 0.42,
      });
    xylemTubes = xylemPositions.map((position, index) => {
      const tube = createTube({
        name: `XylemVessel_${index + 1}`,
        length: conduitLength,
        radius: xylemRadius,
        color: 0xd7765e,
        opacity: 0.94,
        selectRoot: root,
        showCaps: false,
      });
      tube.position.set(0, position.y, position.z);
      tube.userData.tissueRole = 'xylem';
      tube.userData.conduitShape = 'cylinder';
      tube.userData.crossSectionPosition = {y: position.y, z: position.z};
      visual.add(tube);
      return tube;
    });

    const phloemPositions = parameters.phloemCount === 6
      ? sixTubePacking(phloemRadius, phloemCenterY, 4)
      : ellipticalClusterPositions(parameters.phloemCount, {
        centerY: phloemCenterY,
        radiusY: phloemHalfHeight * 0.62,
        radiusZ: size.depth * 0.3,
        phase: 1.18,
      });
    phloemTubes = phloemPositions.map((position, index) => {
      const tube = createTube({
        name: `PhloemSieveTube_${index + 1}`,
        length: conduitLength,
        radius: phloemRadius,
        color: 0x6a86c8,
        opacity: 0.92,
        selectRoot: root,
        showCaps: false,
      });
      tube.position.set(0, position.y, position.z);
      tube.userData.tissueRole = 'phloem';
      tube.userData.conduitShape = 'cylinder';
      tube.userData.crossSectionPosition = {y: position.y, z: position.z};
      visual.add(tube);
      return tube;
    });

    hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(size.length * 1.05, size.height * 1.08, size.depth * 1.08),
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
    );
    hitbox.name = 'InteractionHitbox';
    hitbox.userData.selectRoot = root;
    hitbox.userData.interactionRole = 'drag-target';
    visual.add(hitbox);

    updateAnchors();
    root.userData.parameters = {...parameters};
    root.userData.orientation = {upper: 'xylem', lower: 'phloem'};
    root.userData.crossSectionShape = 'elliptical';
  }

  const api = {
    root,
    anchors,
    getXylemTubes: () => [...xylemTubes],
    getPhloemTubes: () => [...phloemTubes],
    getBundleSheath: () => bundleSheath,
    getParameters: () => ({...parameters}),
    setParameters(nextParameters) {
      parameters = {...parameters, ...nextParameters};
      rebuild();
      return api;
    },
    getLocalBounds() {
      return new THREE.Box3(
        new THREE.Vector3(-size.length * 0.5, -size.height * 0.5, -size.depth * 0.5),
        new THREE.Vector3(size.length * 0.5, size.height * 0.5, size.depth * 0.5),
      );
    },
    serialize() {
      return {
        type: root.userData.modelType,
        version: root.userData.modelVersion,
        parameters: {...parameters},
        orientation: {...root.userData.orientation},
        transform: {
          position: root.position.toArray(),
          quaternion: root.quaternion.toArray(),
          scale: root.scale.toArray(),
        },
      };
    },
    clone() {
      const clone = createLeafVein(parameters);
      clone.root.position.copy(root.position);
      clone.root.quaternion.copy(root.quaternion);
      clone.root.scale.copy(root.scale);
      return clone;
    },
    dispose() {
      clear();
    },
  };

  root.userData.modelAPI = api;
  rebuild();
  return api;
}

export const LEAF_VEIN_DEFAULTS = DEFAULTS;
