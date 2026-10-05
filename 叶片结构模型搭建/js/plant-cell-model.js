import * as THREE from '../vendor/three.module.js';

const DEFAULTS = Object.freeze({
  shapeType: 'regular',
  width: 4.2,
  height: 2.4,
  depth: 2.2,
  boxiness: 0.62,
  irregularity: 0.08,
  wallOpacity: 0.42,
  greenStrength: 0.28,
  colorContrast: 1,
  chloroplastCount: 10,
  chloroplastSize: 0.18,
  showNucleus: true,
  showVacuole: true,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const signedPow = (value, power) => Math.sign(value) * Math.pow(Math.abs(value), power);

function makeSuperellipsoidGeometry({width, height, depth, boxiness, irregularity}, scale = 1) {
  const longitudeSegments = 48;
  const latitudeSegments = 24;
  const positions = [];
  const indices = [];
  const exponent = THREE.MathUtils.lerp(1.0, 0.24, clamp(boxiness, 0, 1));
  const radiusX = width * 0.5 * scale;
  const radiusY = height * 0.5 * scale;
  const radiusZ = depth * 0.5 * scale;

  const shapeType = arguments[0].shapeType === 'irregular' ? 'irregular' : 'regular';
  const irregularStrength = shapeType === 'irregular' ? clamp(irregularity, 0, 1) : 0;

  for (let lat = 0; lat <= latitudeSegments; lat += 1) {
    const phi = -Math.PI * 0.5 + Math.PI * (lat / latitudeSegments);
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    for (let lon = 0; lon <= longitudeSegments; lon += 1) {
      const theta = -Math.PI + Math.PI * 2 * (lon / longitudeSegments);
      const regularRipple = 1 + irregularity * (
        0.055 * Math.sin(theta * 3 + phi * 2) + 0.035 * Math.sin(theta * 5 - phi * 3)
      );
      const irregularRipple = 1 + irregularStrength * (
        0.18 * Math.sin(theta * 2.1 + phi * 1.35 + 0.7)
        + 0.11 * Math.sin(theta * 3.7 - phi * 2.4)
        + 0.07 * Math.cos(theta * 5.2 + phi * 1.8)
      );
      const ripple = shapeType === 'irregular' ? irregularRipple : regularRipple;
      let x = radiusX * signedPow(cosPhi, exponent) * signedPow(Math.cos(theta), exponent) * ripple;
      let y = radiusY * signedPow(sinPhi, exponent) * ripple;
      let z = radiusZ * signedPow(cosPhi, exponent) * signedPow(Math.sin(theta), exponent) * ripple;
      if (shapeType === 'irregular') {
        const equatorWeight = Math.pow(Math.max(0, cosPhi), 0.65);
        x += radiusX * irregularStrength * 0.08 * Math.sin(phi * 2.3 - theta * 1.4) * equatorWeight;
        y += radiusY * irregularStrength * 0.07 * Math.cos(theta * 2.6 + phi) * equatorWeight;
        z += radiusZ * irregularStrength * 0.09 * Math.sin(phi * 1.7 + theta * 1.8) * equatorWeight;
      }
      positions.push(x, y, z);
    }
  }

  if (shapeType === 'irregular') {
    const minima = [Infinity, Infinity, Infinity];
    const maxima = [-Infinity, -Infinity, -Infinity];
    for (let index = 0; index < positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        minima[axis] = Math.min(minima[axis], positions[index + axis]);
        maxima[axis] = Math.max(maxima[axis], positions[index + axis]);
      }
    }
    const targets = [radiusX, radiusY, radiusZ];
    for (let index = 0; index < positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        const center = (minima[axis] + maxima[axis]) * 0.5;
        const halfSpan = Math.max((maxima[axis] - minima[axis]) * 0.5, 1e-6);
        positions[index + axis] = (positions[index + axis] - center) / halfSpan * targets[axis];
      }
    }
  }

  const row = longitudeSegments + 1;
  for (let lat = 0; lat < latitudeSegments; lat += 1) {
    for (let lon = 0; lon < longitudeSegments; lon += 1) {
      const a = lat * row + lon;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

export function createPlantCell(initialParameters = {}) {
  const root = new THREE.Group();
  root.name = 'ParametricPlantCell';
  root.userData.modelType = 'plant-cell';
  root.userData.modelVersion = 2;

  const visual = new THREE.Group();
  visual.name = 'CellVisual';
  root.add(visual);

  const anchors = {};
  for (const name of ['left', 'right', 'top', 'bottom', 'front', 'back', 'center']) {
    const anchor = new THREE.Object3D();
    anchor.name = `Anchor_${name}`;
    anchor.userData.anchorType = name;
    anchors[name] = anchor;
    root.add(anchor);
  }

  let parameters = {...DEFAULTS, ...initialParameters};

  function normalize(next) {
    const chloroplastCount = Math.round(clamp(Number(next.chloroplastCount), 0, 48));
    return {
      shapeType: next.shapeType === 'irregular' ? 'irregular' : 'regular',
      width: clamp(Number(next.width), 0.65, 7),
      height: clamp(Number(next.height), 0.55, 7),
      depth: clamp(Number(next.depth), 0.7, 5),
      boxiness: clamp(Number(next.boxiness), 0, 1),
      irregularity: clamp(Number(next.irregularity), 0, 1),
      wallOpacity: clamp(Number(next.wallOpacity), 0.14, 0.9),
      greenStrength: chloroplastCount / 48,
      colorContrast: clamp(Number(next.colorContrast ?? 1), 0.6, 3),
      chloroplastCount,
      chloroplastSize: DEFAULTS.chloroplastSize,
      showNucleus: true,
      showVacuole: true,
    };
  }

  function updateAnchors() {
    const {width, height, depth} = parameters;
    anchors.left.position.set(-width * 0.5, 0, 0);
    anchors.right.position.set(width * 0.5, 0, 0);
    anchors.top.position.set(0, height * 0.5, 0);
    anchors.bottom.position.set(0, -height * 0.5, 0);
    anchors.front.position.set(0, 0, depth * 0.5);
    anchors.back.position.set(0, 0, -depth * 0.5);
    anchors.center.position.set(0, 0, 0);
  }

  function rebuild() {
    while (visual.children.length) {
      const child = visual.children.pop();
      disposeObject(child);
    }

    parameters = normalize(parameters);
    const green = clamp(parameters.greenStrength * parameters.colorContrast, 0, 1);

    const wall = new THREE.Mesh(
      makeSuperellipsoidGeometry(parameters, 1),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(0.25, 0.14 + green * 0.72, 0.72 - green * 0.43),
        transparent: true,
        opacity: Math.min(0.88, parameters.wallOpacity + green * 0.3),
        roughness: 0.42,
        transmission: 0.08,
        thickness: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    wall.name = 'CellWall';
    wall.userData.selectRoot = root;
    visual.add(wall);

    const membrane = new THREE.Mesh(
      makeSuperellipsoidGeometry(parameters, 0.91),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(0.28, 0.16 + green * 0.68, 0.76 - green * 0.4),
        transparent: true,
        opacity: 0.21 + green * 0.17,
        roughness: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    membrane.name = 'CellMembraneAndCytoplasm';
    membrane.userData.selectRoot = root;
    visual.add(membrane);

    if (parameters.showVacuole) {
      const vacuole = new THREE.Mesh(
        makeSuperellipsoidGeometry({...parameters, boxiness: parameters.boxiness * 0.55, irregularity: 0}, 0.59),
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color().setHSL(0.3, 0.2 + green * 0.56, 0.76 - green * 0.34),
          transparent: true,
          opacity: 0.16 + green * 0.25,
          roughness: 0.18,
          transmission: 0.18,
          depthWrite: false,
        }),
      );
      vacuole.name = 'CentralVacuole';
      vacuole.userData.selectRoot = root;
      visual.add(vacuole);
    }

    if (parameters.showNucleus) {
      const nucleusRadius = Math.min(parameters.width, parameters.height, parameters.depth) * 0.16;
      const nucleus = new THREE.Mesh(
        new THREE.SphereGeometry(nucleusRadius, 28, 18),
        new THREE.MeshPhysicalMaterial({
          color: 0xe6b8cd,
          transparent: true,
          opacity: 0.78,
          roughness: 0.46,
        }),
      );
      nucleus.name = 'Nucleus';
      const nucleusInset = parameters.shapeType === 'irregular'
        ? {x: -0.14, y: -0.1, z: 0.04}
        : {x: -0.24, y: -0.17, z: 0.1};
      nucleus.position.set(
        parameters.width * nucleusInset.x,
        parameters.height * nucleusInset.y,
        parameters.depth * nucleusInset.z,
      );
      nucleus.scale.set(1, 0.82, 0.82);
      nucleus.userData.selectRoot = root;
      visual.add(nucleus);
    }

    const count = parameters.chloroplastCount;
    if (count > 0) {
      const chloroplastGeometry = new THREE.SphereGeometry(1, 18, 10);
      const chloroplastMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(0.31, 0.82, 0.32),
        roughness: 0.38,
        emissive: new THREE.Color(0x092f0c),
        emissiveIntensity: 0.08,
      });
      const chloroplasts = new THREE.InstancedMesh(chloroplastGeometry, chloroplastMaterial, count);
      chloroplasts.name = 'Chloroplasts';
      chloroplasts.userData.selectRoot = root;

      const random = seededRandom(8327 + count * 17);
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const position = new THREE.Vector3();
      const scale = new THREE.Vector3();
      const minimumDimension = Math.min(parameters.width, parameters.height, parameters.depth);
      const baseSize = parameters.chloroplastSize * minimumDimension * 0.38;
      const usableRadiusX = Math.max(parameters.width * 0.5 - baseSize * 1.45, baseSize);
      const usableRadiusY = Math.max(parameters.height * 0.5 - baseSize, baseSize);
      const usableRadiusZ = Math.max(parameters.depth * 0.5 - baseSize, baseSize);

      for (let index = 0; index < count; index += 1) {
        const shell = parameters.shapeType === 'irregular'
          ? 0.5 + random() * 0.16
          : 0.7 + random() * 0.18;
        const angle = random() * Math.PI * 2;
        const elevation = (random() - 0.5) * Math.PI * 0.72;
        position.set(
          Math.cos(angle) * Math.cos(elevation) * usableRadiusX * shell,
          Math.sin(elevation) * usableRadiusY * shell,
          Math.sin(angle) * Math.cos(elevation) * usableRadiusZ * shell,
        );
        quaternion.setFromEuler(new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI));
        scale.set(baseSize * 1.28, baseSize * 0.48, baseSize * 0.82);
        matrix.compose(position, quaternion, scale);
        chloroplasts.setMatrixAt(index, matrix);
      }
      chloroplasts.instanceMatrix.needsUpdate = true;
      visual.add(chloroplasts);
    }

    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(parameters.width * 1.08, parameters.height * 1.08, parameters.depth * 1.08),
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
    );
    hitbox.name = 'InteractionHitbox';
    hitbox.userData.selectRoot = root;
    hitbox.userData.interactionRole = 'drag-target';
    visual.add(hitbox);

    updateAnchors();
    root.userData.parameters = {...parameters};
    root.userData.shapeType = parameters.shapeType;
  }

  const api = {
    root,
    anchors,
    getParameters: () => ({...parameters}),
    setParameters(nextParameters) {
      parameters = {...parameters, ...nextParameters};
      rebuild();
      return api;
    },
    serialize() {
      return {
        type: root.userData.modelType,
        version: root.userData.modelVersion,
        parameters: {...parameters},
        transform: {
          position: root.position.toArray(),
          quaternion: root.quaternion.toArray(),
          scale: root.scale.toArray(),
        },
      };
    },
    clone() {
      const cloned = createPlantCell(parameters);
      cloned.root.position.copy(root.position);
      cloned.root.quaternion.copy(root.quaternion);
      cloned.root.scale.copy(root.scale);
      return cloned;
    },
    getLocalBounds() {
      return new THREE.Box3(
        new THREE.Vector3(-parameters.width * 0.5, -parameters.height * 0.5, -parameters.depth * 0.5),
        new THREE.Vector3(parameters.width * 0.5, parameters.height * 0.5, parameters.depth * 0.5),
      );
    },
    dispose() {
      disposeObject(root);
    },
  };

  root.userData.modelAPI = api;
  rebuild();
  return api;
}

export const PLANT_CELL_DEFAULTS = DEFAULTS;
