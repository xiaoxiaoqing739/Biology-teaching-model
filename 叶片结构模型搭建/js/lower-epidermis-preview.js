import * as THREE from '../vendor/three.module.js';
import {createLowerEpidermis, LOWER_EPIDERMIS_DEFAULTS} from './lower-epidermis-model.js';
import {createStoma} from './stoma-model.js';

const host = document.querySelector('#model-stage');
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
host.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x102128);
scene.add(new THREE.HemisphereLight(0xebfff4, 0x13242b, 2.4));
const key = new THREE.DirectionalLight(0xffffff, 3.1);
key.position.set(5, 9, 7);
scene.add(key);
const fill = new THREE.DirectionalLight(0x83c5ff, 1.1);
fill.position.set(-5, 3, -4);
scene.add(fill);

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 120);
const model = createLowerEpidermis();
scene.add(model.root);
let stomaApis = [];

const grid = new THREE.GridHelper(24, 24, 0x35525b, 0x263d45);
grid.position.y = -1.3;
scene.add(grid);

let boundsHelper = null;
const anchorGroup = new THREE.Group();
scene.add(anchorGroup);

function updateDiagnostics() {
  if (boundsHelper) {
    scene.remove(boundsHelper);
    boundsHelper.geometry.dispose();
    boundsHelper.material.dispose();
  }
  boundsHelper = new THREE.Box3Helper(new THREE.Box3().setFromObject(model.root), 0xffd166);
  boundsHelper.visible = document.querySelector('#show-bounds').checked;
  scene.add(boundsHelper);
  anchorGroup.clear();
  for (const anchor of Object.values(model.anchors)) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 14, 10),
      new THREE.MeshBasicMaterial({color: 0x67e8f9, depthTest: false}),
    );
    marker.position.copy(anchor.position);
    marker.renderOrder = 20;
    anchorGroup.add(marker);
  }
  for (const slot of model.getStomaSlots()) {
    const footprint = slot.userData.recommendedFootprint;
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(footprint.width * 0.2, footprint.width * 0.38, 32),
      new THREE.MeshBasicMaterial({color: 0x67e8f9, transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthTest: false}),
    );
    marker.rotation.x = -Math.PI * 0.5;
    marker.position.copy(slot.position);
    marker.position.y += model.getParameters().layerThickness * 0.62;
    marker.scale.z = footprint.depth / footprint.width;
    marker.renderOrder = 21;
    anchorGroup.add(marker);
  }
  anchorGroup.visible = document.querySelector('#show-anchors').checked;
}

const controls = [...document.querySelectorAll('[data-parameter]')];
const outputs = new Map([...document.querySelectorAll('[data-value]')].map((element) => [element.dataset.value, element]));

function readParameters() {
  return Object.fromEntries(controls.map((control) => [
    control.dataset.parameter,
    control.dataset.parameter === 'layoutMode' ? control.value : Number(control.value),
  ]));
}

function writeParameters(parameters) {
  for (const control of controls) control.value = parameters[control.dataset.parameter];
  updateLabels();
}

function updateLabels() {
  for (const control of controls) {
    outputs.get(control.dataset.parameter).textContent = control.dataset.parameter === 'layoutMode'
      ? ({regular: '规则砖状', mosaic: '镶嵌状'}[control.value] || control.value)
      : control.value;
  }
}

function clearStomaVisuals() {
  for (const api of stomaApis) {
    model.root.remove(api.root);
    api.dispose();
  }
  stomaApis = [];
}

function installStomaVisuals() {
  for (const slot of model.getStomaSlots()) {
    const api = createStoma({aperture: 0.48, guardCellSize: 0.72, chloroplastCount: 6});
    const footprint = api.getMountFootprint();
    const target = slot.userData.recommendedFootprint;
    const scale = Math.min(target.width / footprint.width, target.depth / footprint.depth) * 0.92;
    api.root.scale.setScalar(scale);
    api.root.position.copy(slot.position);
    api.root.rotation.y = slot.userData.rotationY;
    api.root.position.y = model.getParameters().layerThickness * 0.52;
    model.root.add(api.root);
    stomaApis.push(api);
  }
}

function updateModel() {
  clearStomaVisuals();
  model.setParameters(readParameters());
  installStomaVisuals();
  updateLabels();
  updateDiagnostics();
  document.querySelector('#cell-count').textContent = model.getCells().length;
  document.querySelector('#slot-count').textContent = model.getStomaSlots().length;
  document.querySelector('#model-data').textContent = JSON.stringify(model.serialize(), null, 2);
  fitModel();
}

controls.forEach((control) => control.addEventListener('input', updateModel));
document.querySelector('#show-bounds').addEventListener('change', updateDiagnostics);
document.querySelector('#show-anchors').addEventListener('change', updateDiagnostics);
document.querySelector('#reset-model').addEventListener('click', () => {
  model.setParameters(LOWER_EPIDERMIS_DEFAULTS);
  writeParameters(model.getParameters());
  updateModel();
  resetView();
});

let yaw = -0.66;
let pitch = 0.7;
let distance = 16;
let dragging = false;
let previousX = 0;
let previousY = 0;
let lastWidth = 0;
let lastHeight = 0;

function fitModel() {
  const size = model.getLocalBounds().getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.5, 0.5);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * Math.max(camera.aspect, 0.25));
  distance = THREE.MathUtils.clamp((radius / Math.sin(Math.min(vFov, hFov) * 0.5)) * 1.12, 7, 36);
}

function resetView() {
  yaw = -0.66;
  pitch = 0.7;
  fitModel();
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
  pitch = THREE.MathUtils.clamp(pitch + (event.clientY - previousY) * 0.006, -0.08, 1.25);
  previousX = event.clientX;
  previousY = event.clientY;
});
renderer.domElement.addEventListener('pointerup', (event) => {
  dragging = false;
  renderer.domElement.releasePointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  distance = THREE.MathUtils.clamp(distance * Math.exp(event.deltaY * 0.001), 6, 42);
}, {passive: false});

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (Math.abs(width - lastWidth) > 8 || Math.abs(height - lastHeight) > 8) {
    fitModel();
    lastWidth = width;
    lastHeight = height;
  }
}
new ResizeObserver(resize).observe(host);

document.querySelector('#reset-view').addEventListener('click', resetView);

const scrim = document.querySelector('#drawer-scrim');
function closeDrawers() {
  document.querySelectorAll('.panel.is-open').forEach((panel) => panel.classList.remove('is-open'));
  scrim.classList.remove('is-open');
}
document.querySelectorAll('[data-open-drawer]').forEach((button) => button.addEventListener('click', () => {
  closeDrawers();
  document.querySelector(`#${button.dataset.openDrawer}`).classList.add('is-open');
  scrim.classList.add('is-open');
}));
document.querySelectorAll('[data-close-drawer]').forEach((button) => button.addEventListener('click', closeDrawers));
scrim.addEventListener('click', closeDrawers);

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

writeParameters(LOWER_EPIDERMIS_DEFAULTS);
updateModel();
resetView();
animate();
