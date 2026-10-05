import * as THREE from '../vendor/three.module.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => material.dispose());
    }
  });
}

function makeGeometry(outline, thickness, scale = 1) {
  const shape = new THREE.Shape();
  outline.forEach(([x, z], index) => {
    const point = [x * scale, z * scale];
    if (index === 0) shape.moveTo(...point);
    else shape.lineTo(...point);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness * scale,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(0.025, thickness * 0.05),
    bevelThickness: Math.min(0.025, thickness * 0.05),
  });
  geometry.translate(0, 0, -thickness * scale * 0.5);
  geometry.rotateX(Math.PI * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pointInside(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = ((yi > point[1]) !== (yj > point[1]))
      && point[0] < (xj - xi) * (point[1] - yi) / ((yj - yi) || 1e-6) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function createPavementCell(initialParameters) {
  const root = new THREE.Group();
  root.name = 'MosaicPavementCell';
  root.userData.modelType = 'epidermal-pavement-cell';
  root.userData.cellRole = 'pavement-cell';
  const parameters = {
    outline: initialParameters.outline.map(point => [...point]),
    thickness: Number(initialParameters.thickness),
    chloroplastCount: Math.round(clamp(Number(initialParameters.chloroplastCount), 0, 24)),
    colorContrast: clamp(Number(initialParameters.colorContrast ?? 1), 0.6, 3),
    seed: Math.round(Number(initialParameters.seed) || 1),
  };
  const green = clamp(parameters.chloroplastCount / 24 * parameters.colorContrast, 0, 1);

  const wall = new THREE.Mesh(
    makeGeometry(parameters.outline, parameters.thickness),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(0.25, 0.12 + green * 0.66, 0.76 - green * 0.4),
      transparent: true,
      opacity: 0.43 + green * 0.28,
      roughness: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  wall.name = 'CellWall';
  wall.userData.selectRoot = root;
  root.add(wall);

  const membrane = new THREE.Mesh(
    makeGeometry(parameters.outline, parameters.thickness * 0.78, 0.9),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(0.29, 0.13 + green * 0.58, 0.78 - green * 0.35),
      transparent: true,
      opacity: 0.16 + green * 0.2,
      roughness: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  membrane.name = 'CellMembraneAndCytoplasm';
  root.add(membrane);

  const bounds = new THREE.Box2();
  parameters.outline.forEach(([x, z]) => bounds.expandByPoint(new THREE.Vector2(x, z)));
  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(Math.min(bounds.getSize(new THREE.Vector2()).x, bounds.getSize(new THREE.Vector2()).y) * 0.09, 18, 12),
    new THREE.MeshPhysicalMaterial({color: 0xe0bfd0, transparent: true, opacity: 0.74, roughness: 0.48}),
  );
  nucleus.name = 'Nucleus';
  nucleus.position.set(-bounds.getSize(new THREE.Vector2()).x * 0.13, parameters.thickness * 0.18, 0);
  nucleus.scale.y = 0.55;
  root.add(nucleus);

  if (parameters.chloroplastCount) {
    const random = seededRandom(parameters.seed * 7919 + parameters.chloroplastCount * 31);
    const geometry = new THREE.SphereGeometry(0.055, 12, 8);
    const material = new THREE.MeshPhysicalMaterial({color: 0x23863d, roughness: 0.42});
    const chloroplasts = new THREE.InstancedMesh(geometry, material, parameters.chloroplastCount);
    chloroplasts.name = 'Chloroplasts';
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1.3, 0.55, 0.78);
    for (let index = 0; index < parameters.chloroplastCount; index += 1) {
      let x = 0;
      let z = 0;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        x = THREE.MathUtils.lerp(bounds.min.x * 0.82, bounds.max.x * 0.82, random());
        z = THREE.MathUtils.lerp(bounds.min.y * 0.82, bounds.max.y * 0.82, random());
        if (pointInside([x, z], parameters.outline)) break;
      }
      quaternion.setFromEuler(new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI));
      matrix.compose(new THREE.Vector3(x, parameters.thickness * 0.22, z), quaternion, scale);
      chloroplasts.setMatrixAt(index, matrix);
    }
    chloroplasts.instanceMatrix.needsUpdate = true;
    root.add(chloroplasts);
  }

  const api = {
    root,
    getParameters: () => ({...parameters, outline: parameters.outline.map(point => [...point])}),
    getLocalBounds() {
      return new THREE.Box3(
        new THREE.Vector3(bounds.min.x, -parameters.thickness * 0.5, bounds.min.y),
        new THREE.Vector3(bounds.max.x, parameters.thickness * 0.5, bounds.max.y),
      );
    },
    serialize() {
      return {
        type: root.userData.modelType,
        parameters: api.getParameters(),
        transform: {position: root.position.toArray(), quaternion: root.quaternion.toArray(), scale: root.scale.toArray()},
      };
    },
    clone() {
      const clone = createPavementCell(parameters);
      clone.root.position.copy(root.position);
      clone.root.quaternion.copy(root.quaternion);
      clone.root.scale.copy(root.scale);
      return clone;
    },
    dispose() { disposeObject(root); },
  };
  root.userData.modelAPI = api;
  return api;
}
