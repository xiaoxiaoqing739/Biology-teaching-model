import * as THREE from '../vendor/three.module.js';
import {createPlantCell, PLANT_CELL_DEFAULTS} from './plant-cell-model.js';

const host = document.querySelector('#model-stage');
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(host.clientWidth, host.clientHeight, false);
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
host.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x102128);

const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.05, 100);
camera.position.set(8.4, 5.2, 10.2);

scene.add(new THREE.HemisphereLight(0xe8fff1, 0x152229, 2.25));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(6, 8, 7);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x8ec7ff, 1.2);
fillLight.position.set(-5, 2, -4);
scene.add(fillLight);

const floor = new THREE.GridHelper(18, 18, 0x35525b, 0x263d45);
floor.position.y = -3.2;
scene.add(floor);

const model = createPlantCell();
scene.add(model.root);

const diagnostics = new THREE.Group();
scene.add(diagnostics);
let boundsHelper = null;
const anchorMeshes = [];

function makeAnchorMarkers() {
  for (const mesh of anchorMeshes) diagnostics.remove(mesh);
  anchorMeshes.length = 0;
  for (const [name, anchor] of Object.entries(model.anchors)) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 16, 12),
      new THREE.MeshBasicMaterial({color: name === 'center' ? 0xffd166 : 0x67e8f9, depthTest: false}),
    );
    marker.name = `Marker_${name}`;
    marker.position.copy(anchor.position);
    marker.renderOrder = 20;
    diagnostics.add(marker);
    anchorMeshes.push(marker);
  }
}

function updateDiagnostics() {
  if (boundsHelper) {
    scene.remove(boundsHelper);
    boundsHelper.geometry.dispose();
    boundsHelper.material.dispose();
  }
  boundsHelper = new THREE.Box3Helper(new THREE.Box3().setFromObject(model.root), 0xffd166);
  boundsHelper.visible = document.querySelector('#show-bounds').checked;
  scene.add(boundsHelper);
  makeAnchorMarkers();
  diagnostics.visible = document.querySelector('#show-anchors').checked;
}

const controls = [...document.querySelectorAll('[data-parameter]')];
const values = new Map([...document.querySelectorAll('[data-value]')].map((element) => [element.dataset.value, element]));

function readParameters() {
  const result = {};
  for (const control of controls) {
    result[control.dataset.parameter] = control.type === 'checkbox' ? control.checked : Number(control.value);
  }
  return result;
}

function writeParameters(parameters) {
  for (const control of controls) {
    const value = parameters[control.dataset.parameter];
    if (control.type === 'checkbox') control.checked = Boolean(value);
    else control.value = value;
  }
  updateLabels();
}

function updateLabels() {
  for (const control of controls) {
    const output = values.get(control.dataset.parameter);
    if (!output) continue;
    const value = control.type === 'checkbox' ? (control.checked ? '显示' : '隐藏') : control.value;
    output.textContent = value;
  }
}

function applyParameters() {
  model.setParameters(readParameters());
  updateLabels();
  updateDiagnostics();
  document.querySelector('#model-data').textContent = JSON.stringify(model.serialize(), null, 2);
}

controls.forEach((control) => control.addEventListener('input', applyParameters));
document.querySelector('#show-bounds').addEventListener('change', updateDiagnostics);
document.querySelector('#show-anchors').addEventListener('change', updateDiagnostics);

const presets = {
  flat: {shapeType: 'regular', width: 5.2, height: 1.2, depth: 2.7, boxiness: 0.78, irregularity: 0.06, chloroplastCount: 0},
  column: {shapeType: 'regular', width: 1.8, height: 5.3, depth: 1.8, boxiness: 0.6, irregularity: 0.04, chloroplastCount: 24},
  sphere: {shapeType: 'regular', width: 3, height: 3, depth: 3, boxiness: 0, irregularity: 0, chloroplastCount: 10},
  irregular: {shapeType: 'irregular', width: 3.8, height: 2.8, depth: 3.6, boxiness: 0.2, irregularity: 0.92, chloroplastCount: 10},
};

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => {
    const next = {...model.getParameters(), ...presets[button.dataset.preset]};
    model.setParameters(next);
    writeParameters(model.getParameters());
    applyParameters();
    fitModel();
  });
});

document.querySelector('#reset-model').addEventListener('click', () => {
  model.setParameters(PLANT_CELL_DEFAULTS);
  writeParameters(model.getParameters());
  applyParameters();
  fitModel({resetAngles: true});
});

let yaw = -0.55;
let pitch = 0.28;
let distance = 13.6;
let dragging = false;
let previousX = 0;
let previousY = 0;
let lastStageWidth = 0;
let lastStageHeight = 0;

function fitModel({resetAngles = false} = {}) {
  if (resetAngles) {
    yaw = -0.55;
    pitch = 0.28;
  }
  const size = model.getLocalBounds().getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.5, 0.5);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * Math.max(camera.aspect, 0.25));
  const limitingFov = Math.max(0.2, Math.min(verticalFov, horizontalFov));
  distance = THREE.MathUtils.clamp((radius / Math.sin(limitingFov * 0.5)) * 1.15, 5.5, 30);
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  dragging = true;
  previousX = event.clientX;
  previousY = event.clientY;
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  yaw -= (event.clientX - previousX) * 0.008;
  pitch = THREE.MathUtils.clamp(pitch + (event.clientY - previousY) * 0.006, -0.2, 1.1);
  previousX = event.clientX;
  previousY = event.clientY;
});
renderer.domElement.addEventListener('pointerup', (event) => {
  dragging = false;
  renderer.domElement.releasePointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  distance = THREE.MathUtils.clamp(distance * Math.exp(event.deltaY * 0.001), 7, 24);
}, {passive: false});

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (Math.abs(width - lastStageWidth) > 8 || Math.abs(height - lastStageHeight) > 8) {
    fitModel();
    lastStageWidth = width;
    lastStageHeight = height;
  }
}

new ResizeObserver(resize).observe(host);

document.querySelector('#reset-view').addEventListener('click', () => fitModel({resetAngles: true}));

const scrim = document.querySelector('#drawer-scrim');
function closeDrawers() {
  document.querySelectorAll('.panel.is-open').forEach((panel) => panel.classList.remove('is-open'));
  scrim.classList.remove('is-open');
}
document.querySelectorAll('[data-open-drawer]').forEach((button) => {
  button.addEventListener('click', () => {
    closeDrawers();
    document.querySelector(`#${button.dataset.openDrawer}`).classList.add('is-open');
    scrim.classList.add('is-open');
  });
});
document.querySelectorAll('[data-close-drawer]').forEach((button) => button.addEventListener('click', closeDrawers));
scrim.addEventListener('click', closeDrawers);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawers();
});

function animate() {
  requestAnimationFrame(animate);
  camera.position.set(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance,
  );
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

writeParameters(PLANT_CELL_DEFAULTS);
applyParameters();
fitModel({resetAngles: true});
animate();
