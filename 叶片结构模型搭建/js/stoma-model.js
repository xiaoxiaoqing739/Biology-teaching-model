import * as THREE from '../vendor/three.module.js';

const DEFAULTS = Object.freeze({
  aperture: 0.55,
  guardCellSize: 1,
  chloroplastCount: 8,
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

function createPoreGeometry(length, width) {
  const halfLength = length * 0.5;
  const halfWidth = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(0, -halfLength);
  shape.bezierCurveTo(halfWidth, -halfLength * 0.62, halfWidth, halfLength * 0.62, 0, halfLength);
  shape.bezierCurveTo(-halfWidth, halfLength * 0.62, -halfWidth, -halfLength * 0.62, 0, -halfLength);
  const geometry = new THREE.ShapeGeometry(shape, 24);
  geometry.rotateX(Math.PI * 0.5);
  return geometry;
}

function createGuardCellGeometry(side, length, outerWidth, poreWidth, cellThickness) {
  const halfLength = length * 0.5;
  const outerX = side * outerWidth;
  const innerX = side * poreWidth * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(0, -halfLength);
  shape.bezierCurveTo(
    side * outerWidth * 0.76, -halfLength * 1.02,
    outerX, -halfLength * 0.48,
    outerX, 0,
  );
  shape.bezierCurveTo(
    outerX, halfLength * 0.48,
    side * outerWidth * 0.76, halfLength * 1.02,
    0, halfLength,
  );
  shape.bezierCurveTo(
    innerX, halfLength * 0.72,
    innerX, halfLength * 0.34,
    innerX, 0,
  );
  shape.bezierCurveTo(
    innerX, -halfLength * 0.34,
    innerX, -halfLength * 0.72,
    0, -halfLength,
  );

  const bevel = Math.min(0.13 * (length / 4.3), cellThickness * 0.28);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: cellThickness,
    curveSegments: 30,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: bevel,
    bevelThickness: bevel,
    steps: 1,
  });
  geometry.rotateX(Math.PI * 0.5);
  geometry.translate(0, cellThickness * 0.5, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function createGuardVisual({side, length, outerWidth, cellThickness, poreWidth, chloroplastCount, selectRoot}) {
  const group = new THREE.Group();
  group.name = side < 0 ? 'LeftGuardCell' : 'RightGuardCell';
  group.userData.cellRole = 'guard-cell';
  group.userData.side = side < 0 ? 'left' : 'right';

  const wall = new THREE.Mesh(
    createGuardCellGeometry(side, length, outerWidth, poreWidth, cellThickness),
    new THREE.MeshPhysicalMaterial({
      color: 0x078765,
      transparent: true,
      opacity: 0.94,
      roughness: 0.5,
      transmission: 0,
      thickness: 0.16,
      side: THREE.DoubleSide,
    }),
  );
  wall.name = 'GuardCellWall';
  wall.userData.selectRoot = selectRoot;
  group.add(wall);

  const innerHalfWidth = poreWidth * 0.5;
  const innerWallCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, cellThickness * 0.62, -length * 0.5),
    new THREE.Vector3(side * innerHalfWidth * 0.72, cellThickness * 0.62, -length * 0.25),
    new THREE.Vector3(side * innerHalfWidth, cellThickness * 0.62, 0),
    new THREE.Vector3(side * innerHalfWidth * 0.72, cellThickness * 0.62, length * 0.25),
    new THREE.Vector3(0, cellThickness * 0.62, length * 0.5),
  ]);
  const innerWall = new THREE.Mesh(
    new THREE.TubeGeometry(innerWallCurve, 48, 0.1 * (length / 4.3), 14, false),
    new THREE.MeshPhysicalMaterial({color: 0x0a5e48, roughness: 0.38}),
  );
  innerWall.name = 'ThickenedInnerWall';
  innerWall.scale.y = 0.72;
  innerWall.userData.selectRoot = selectRoot;
  group.add(innerWall);

  if (chloroplastCount > 0) {
    const scaleUnit = length / 4.3;
    const geometry = new THREE.SphereGeometry(0.12 * scaleUnit, 16, 10);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x056d46,
      roughness: 0.4,
      emissive: 0x042b16,
      emissiveIntensity: 0.08,
    });
    const chloroplasts = new THREE.InstancedMesh(geometry, material, chloroplastCount);
    chloroplasts.name = 'GuardCellChloroplasts';
    chloroplasts.userData.selectRoot = selectRoot;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3(1.25, 0.5, 0.78);
    for (let index = 0; index < chloroplastCount; index += 1) {
      const t = (index + 1) / (chloroplastCount + 1);
      const profile = Math.pow(Math.sin(Math.PI * t), 0.72);
      const innerEdge = innerHalfWidth * profile;
      const outerEdge = outerWidth * profile;
      const lane = index % 2 === 0 ? 0.38 : 0.69;
      const x = THREE.MathUtils.lerp(innerEdge + 0.12 * scaleUnit, outerEdge - 0.16 * scaleUnit, lane);
      const position = new THREE.Vector3(side * x, cellThickness * 0.66, -length * 0.5 + t * length);
      rotation.setFromEuler(new THREE.Euler(index * 0.67, index * 0.41, index * 0.29));
      matrix.compose(position, rotation, scale);
      chloroplasts.setMatrixAt(index, matrix);
    }
    chloroplasts.instanceMatrix.needsUpdate = true;
    group.add(chloroplasts);
  }

  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(0.25 * (length / 4.3), 20, 14),
    new THREE.MeshPhysicalMaterial({color: 0xe0a85c, transparent: true, opacity: 0.92, roughness: 0.46}),
  );
  nucleus.name = 'GuardCellNucleus';
  const nucleusProfile = Math.pow(Math.sin(Math.PI * 0.56), 0.72);
  const nucleusX = THREE.MathUtils.lerp(innerHalfWidth * nucleusProfile, outerWidth * nucleusProfile, 0.58);
  nucleus.position.set(side * nucleusX, cellThickness * 0.68, length * 0.06);
  nucleus.scale.set(0.9, 0.5, 1.12);
  nucleus.userData.selectRoot = selectRoot;
  group.add(nucleus);

  return group;
}

export function createStoma(initialParameters = {}) {
  const root = new THREE.Group();
  root.name = 'StomaAssembly';
  root.userData.modelType = 'stoma';
  root.userData.modelVersion = 1;
  root.userData.compatibleAnchorType = 'stoma-slot';

  const visual = new THREE.Group();
  visual.name = 'StomaVisual';
  root.add(visual);

  const anchors = {};
  for (const name of ['mount', 'poreCenter', 'left', 'right', 'front', 'back', 'center']) {
    const anchor = new THREE.Object3D();
    anchor.name = `Anchor_${name}`;
    anchor.userData.anchorType = name;
    anchors[name] = anchor;
    root.add(anchor);
  }

  let parameters = {...DEFAULTS, ...initialParameters};
  let guardCells = [];
  let pore = null;
  let hitbox = null;
  let size = null;

  function normalize(next) {
    return {
      aperture: clamp(Number(next.aperture), 0, 1),
      guardCellSize: clamp(Number(next.guardCellSize), 0.72, 1.35),
      chloroplastCount: Math.round(clamp(Number(next.chloroplastCount), 0, 20)),
    };
  }

  function getDimensions() {
    const scale = parameters.guardCellSize;
    const length = 4.3 * scale;
    const outerWidth = 1.42 * scale;
    const cellThickness = 0.46 * scale;
    const poreWidth = THREE.MathUtils.lerp(0.015, 0.88 * scale, parameters.aperture);
    const totalWidth = outerWidth * 2;
    return {length, outerWidth, cellThickness, poreWidth, totalWidth};
  }

  function clear() {
    while (visual.children.length) {
      const child = visual.children.pop();
      disposeObject(child);
    }
    guardCells = [];
    pore = null;
    hitbox = null;
  }

  function updateAnchors() {
    anchors.mount.position.set(0, -size.cellThickness * 0.5, 0);
    anchors.poreCenter.position.set(0, 0, 0);
    anchors.left.position.set(-size.totalWidth * 0.5, 0, 0);
    anchors.right.position.set(size.totalWidth * 0.5, 0, 0);
    anchors.front.position.set(0, 0, size.length * 0.5);
    anchors.back.position.set(0, 0, -size.length * 0.5);
    anchors.center.position.set(0, 0, 0);
  }

  function rebuild() {
    parameters = normalize(parameters);
    clear();
    size = getDimensions();

    guardCells = [-1, 1].map((side) => createGuardVisual({
      side,
      length: size.length,
      outerWidth: size.outerWidth,
      cellThickness: size.cellThickness,
      poreWidth: size.poreWidth,
      chloroplastCount: parameters.chloroplastCount,
      selectRoot: root,
    }));
    guardCells.forEach((cell) => visual.add(cell));

    pore = new THREE.Mesh(
      createPoreGeometry(size.length * 0.83, Math.max(size.poreWidth, 0.025)),
      new THREE.MeshBasicMaterial({color: 0x071418, transparent: true, opacity: 0.74 * parameters.aperture, side: THREE.DoubleSide, depthWrite: false}),
    );
    pore.name = 'StomatalPore';
    pore.position.y = -size.cellThickness * 0.08;
    pore.userData.selectRoot = root;
    visual.add(pore);

    hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(size.totalWidth * 1.08, size.cellThickness * 1.5, size.length * 1.08),
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
    );
    hitbox.name = 'InteractionHitbox';
    hitbox.userData.selectRoot = root;
    hitbox.userData.interactionRole = 'drag-target';
    visual.add(hitbox);

    updateAnchors();
    root.userData.parameters = {...parameters};
    root.userData.mountFootprint = {width: size.totalWidth, depth: size.length};
  }

  const api = {
    root,
    anchors,
    getGuardCells: () => [...guardCells],
    getPore: () => pore,
    getParameters: () => ({...parameters}),
    setParameters(nextParameters) {
      parameters = {...parameters, ...nextParameters};
      rebuild();
      return api;
    },
    setAperture(aperture) {
      parameters.aperture = aperture;
      rebuild();
      return api;
    },
    getMountFootprint: () => ({...root.userData.mountFootprint}),
    getLocalBounds() {
      return new THREE.Box3(
        new THREE.Vector3(-size.totalWidth * 0.5, -size.cellThickness * 0.5, -size.length * 0.5),
        new THREE.Vector3(size.totalWidth * 0.5, size.cellThickness * 0.5, size.length * 0.5),
      );
    },
    serialize() {
      return {
        type: root.userData.modelType,
        version: root.userData.modelVersion,
        parameters: {...parameters},
        compatibleAnchorType: root.userData.compatibleAnchorType,
        mountFootprint: api.getMountFootprint(),
        transform: {
          position: root.position.toArray(),
          quaternion: root.quaternion.toArray(),
          scale: root.scale.toArray(),
        },
      };
    },
    clone() {
      const clone = createStoma(parameters);
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

export const STOMA_DEFAULTS = DEFAULTS;
