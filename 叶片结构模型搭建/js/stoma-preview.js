import * as THREE from '../vendor/three.module.js';
import {createStoma, STOMA_DEFAULTS} from './stoma-model.js';

const host = document.querySelector('#model-stage');
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
host.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x102128);
scene.add(new THREE.HemisphereLight(0xebfff4, 0x13242b, 2.6));
const key = new THREE.DirectionalLight(0xffffff, 3.2);
key.position.set(5, 8, 7);
scene.add(key);
const fill = new THREE.DirectionalLight(0x84c7ff, 1.1);
fill.position.set(-5, 3, -4);
scene.add(fill);

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
const model = createStoma();
scene.add(model.root);

const mountingSurface = new THREE.Mesh(
  new THREE.CylinderGeometry(3.6, 3.6, 0.08, 64),
  new THREE.MeshPhysicalMaterial({color: 0x27464a, transparent: true, opacity: 0.42, roughness: 0.56}),
);
mountingSurface.position.y = -0.43;
scene.add(mountingSurface);

const grid = new THREE.GridHelper(14, 14, 0x35525b, 0x263d45);
grid.position.y = -0.49;
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
  for (const [name, anchor] of Object.entries(model.anchors)) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(name === 'mount' ? 0.13 : 0.09, 14, 10),
      new THREE.MeshBasicMaterial({color: name === 'mount' ? 0xffd166 : 0x67e8f9, depthTest: false}),
    );
    marker.position.copy(anchor.position);
    marker.renderOrder = 20;
    anchorGroup.add(marker);
  }
  anchorGroup.visible = document.querySelector('#show-anchors').checked;
}

const controls = [...document.querySelectorAll('[data-parameter]')];
const outputs = new Map([...document.querySelectorAll('[data-value]')].map((element) => [element.dataset.value, element]));

function readParameters() {
  return Object.fromEntries(controls.map((control) => [control.dataset.parameter, Number(control.value)]));
}

function updateLabels() {
  for (const control of controls) {
    const value = control.dataset.parameter === 'aperture' ? `${Math.round(Number(control.value) * 100)}%` : control.value;
    outputs.get(control.dataset.parameter).textContent = value;
  }
}

function writeParameters(parameters) {
  for (const control of controls) control.value = parameters[control.dataset.parameter];
  updateLabels();
}

function updateReadout() {
  document.querySelector('#opening-status').textContent = model.getParameters().aperture < 0.08 ? '关闭' : '开启';
  document.querySelector('#model-data').textContent = JSON.stringify(model.serialize(), null, 2);
}

function updateModel({fit = true} = {}) {
  model.setParameters(readParameters());
  updateLabels();
  updateReadout();
  updateDiagnostics();
  if (fit) fitModel();
}

controls.forEach((control) => control.addEventListener('input', () => updateModel()));
document.querySelector('#show-bounds').addEventListener('change', updateDiagnostics);
document.querySelector('#show-anchors').addEventListener('change', updateDiagnostics);
document.querySelector('#reset-model').addEventListener('click', () => {
  stopDemonstration();
  model.setParameters(STOMA_DEFAULTS);
  writeParameters(model.getParameters());
  updateModel();
  resetView();
});

let demonstrationStart = null;
let demonstrationDirection = 1;
const demonstrationButton = document.querySelector('#demonstrate-aperture');

function stopDemonstration() {
  demonstrationStart = null;
  demonstrationButton.textContent = '演示气孔开闭';
}

demonstrationButton.addEventListener('click', () => {
  if (demonstrationStart !== null) {
    stopDemonstration();
    return;
  }
  demonstrationDirection = model.getParameters().aperture > 0.5 ? -1 : 1;
  demonstrationStart = performance.now();
  demonstrationButton.textContent = '停止演示';
});

let yaw = -0.35;
let pitch = 0.92;
let distance = 11;
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
  distance = THREE.MathUtils.clamp((radius / Math.sin(Math.min(vFov, hFov) * 0.5)) * 1.2, 7, 22);
}

function resetView() {
  yaw = -0.35;
  pitch = 0.92;
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
  pitch = THREE.MathUtils.clamp(pitch + (event.clientY - previousY) * 0.006, -0.05, 1.45);
  previousX = event.clientX;
  previousY = event.clientY;
});
renderer.domElement.addEventListener('pointerup', (event) => {
  dragging = false;
  renderer.domElement.releasePointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  distance = THREE.MathUtils.clamp(distance * Math.exp(event.deltaY * 0.001), 5, 28);
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

let previousAnimationUpdate = 0;
function animate(time) {
  requestAnimationFrame(animate);
  if (demonstrationStart !== null && time - previousAnimationUpdate > 34) {
    const elapsed = time - demonstrationStart;
    const progress = Math.min(elapsed / 2200, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const aperture = demonstrationDirection > 0 ? eased : 1 - eased;
    const apertureControl = document.querySelector('[data-parameter="aperture"]');
    apertureControl.value = aperture;
    model.setAperture(aperture);
    updateLabels();
    updateReadout();
    updateDiagnostics();
    previousAnimationUpdate = time;
    if (progress >= 1) stopDemonstration();
  }
  camera.position.set(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance,
  );
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

writeParameters(STOMA_DEFAULTS);
updateModel();
resetView();
animate();
