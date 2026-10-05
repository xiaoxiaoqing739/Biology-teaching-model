import * as THREE from '../vendor/three.module.js';
import {createLeafVein, LEAF_VEIN_DEFAULTS} from './leaf-vein-model.js';

const host = document.querySelector('#model-stage');
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
host.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x102128);
scene.add(new THREE.HemisphereLight(0xebfff4, 0x13242b, 2.5));
const key = new THREE.DirectionalLight(0xffffff, 3.15);
key.position.set(5, 8, 7);
scene.add(key);
const fill = new THREE.DirectionalLight(0x84c7ff, 1.1);
fill.position.set(-5, 3, -4);
scene.add(fill);

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
const model = createLeafVein();
scene.add(model.root);

const grid = new THREE.GridHelper(18, 18, 0x35525b, 0x263d45);
grid.position.y = -1.45;
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
      new THREE.SphereGeometry(0.085, 14, 10),
      new THREE.MeshBasicMaterial({color: 0x67e8f9, depthTest: false}),
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
    outputs.get(control.dataset.parameter).textContent = control.dataset.parameter === 'veinSize'
      ? (Number(control.value) >= 1 ? '粗' : '细')
      : control.value;
  }
}

function writeParameters(parameters) {
  for (const control of controls) control.value = parameters[control.dataset.parameter];
  updateLabels();
}

function updateReadout() {
  document.querySelector('#xylem-count').textContent = model.getXylemTubes().length;
  document.querySelector('#phloem-count').textContent = model.getPhloemTubes().length;
  document.querySelector('#model-data').textContent = JSON.stringify(model.serialize(), null, 2);
}

function updateModel() {
  model.setParameters(readParameters());
  updateLabels();
  updateReadout();
  updateDiagnostics();
  fitModel();
}

controls.forEach((control) => control.addEventListener('input', updateModel));
document.querySelector('#show-bounds').addEventListener('change', updateDiagnostics);
document.querySelector('#show-anchors').addEventListener('change', updateDiagnostics);
document.querySelector('#reset-model').addEventListener('click', () => {
  model.setParameters(LEAF_VEIN_DEFAULTS);
  writeParameters(model.getParameters());
  updateModel();
  resetView();
});

let yaw = -0.72;
let pitch = 0.48;
let distance = 12;
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
  distance = THREE.MathUtils.clamp((radius / Math.sin(Math.min(vFov, hFov) * 0.5)) * 1.18, 7, 24);
}

function resetView() {
  yaw = -0.72;
  pitch = 0.48;
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
  pitch = THREE.MathUtils.clamp(pitch + (event.clientY - previousY) * 0.006, -0.2, 1.3);
  previousX = event.clientX;
  previousY = event.clientY;
});
renderer.domElement.addEventListener('pointerup', (event) => {
  dragging = false;
  renderer.domElement.releasePointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  distance = THREE.MathUtils.clamp(distance * Math.exp(event.deltaY * 0.001), 5, 30);
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

writeParameters(LEAF_VEIN_DEFAULTS);
updateModel();
resetView();
animate();
