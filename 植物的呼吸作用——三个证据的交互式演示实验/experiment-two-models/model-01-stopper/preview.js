import * as THREE from '../../shared/vendor/three.module.js';
import {createDoubleHoleStopper} from './double-hole-stopper.js';

const canvas = document.querySelector('#model-canvas');
const status = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x183038);
scene.add(new THREE.HemisphereLight(0xfff1d8, 0x1c3439, 2.35));
const key = new THREE.DirectionalLight(0xffe1bd, 4.1);
key.position.set(-3.8, 6.2, 4.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const edge = new THREE.DirectionalLight(0x75e7e1, 2.15);
edge.position.set(4.5, 3.8, -3.4);
scene.add(edge);

const table = new THREE.Mesh(
  new THREE.CylinderGeometry(3.25, 3.38, .30, 128),
  new THREE.MeshStandardMaterial({color: 0x385f61, roughness: .62, metalness: .16}),
);
table.position.y = -.19;
table.receiveShadow = true;
scene.add(table);

const stopper = createDoubleHoleStopper();
scene.add(stopper);
const homePosition = new THREE.Vector3(0, 0, 0);
const homeQuaternion = stopper.quaternion.clone();

const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
const view = {distance: 4.9};
const cameraTarget = new THREE.Vector3(0, .35, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPoint = new THREE.Vector3();
let drag = null;
let returnAnimation = null;

function updateCamera() {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const fitWidth = 2.75;
  const minimumDistance = fitWidth / (2 * Math.tan(verticalFov / 2) * Math.max(camera.aspect, .28));
  const distance = Math.max(view.distance, minimumDistance);
  const azimuth = .47;
  const elevation = .32;
  const horizontalDistance = Math.cos(elevation) * distance;
  camera.position.set(
    Math.sin(azimuth) * horizontalDistance,
    cameraTarget.y + Math.sin(elevation) * distance,
    Math.cos(azimuth) * horizontalDistance,
  );
  camera.lookAt(cameraTarget);
}

function resize() {
  const width = canvas.clientWidth;
  const height = Math.max(canvas.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function rayFrom(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

function beginReturn() {
  returnAnimation = {start: stopper.position.clone(), started: performance.now(), duration: 450};
  status.textContent = '当前没有装配目标，橡胶塞正在以 0.45 秒返回模型审核位置。';
}

function reset() {
  stopper.position.copy(homePosition);
  stopper.quaternion.copy(homeQuaternion);
  view.distance = 4.9;
  drag = null;
  returnAnimation = null;
  status.textContent = '当前只审核双孔橡胶塞。模型采用真实贯穿孔，未加入漏斗和导气管。';
}

canvas.addEventListener('pointerdown', event => {
  if (returnAnimation) return;
  rayFrom(event);
  const hits = raycaster.intersectObject(stopper, true);
  if (!hits.length) return;
  if (!raycaster.ray.intersectPlane(tablePlane, worldPoint)) return;
  drag = {id: event.pointerId, offset: stopper.position.clone().sub(worldPoint), moved: false, startX: event.clientX, startY: event.clientY};
  canvas.setPointerCapture(event.pointerId);
  status.textContent = '正在拖动双孔橡胶塞；模型始终贴着实验台移动。';
});

canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
  rayFrom(event);
  if (raycaster.ray.intersectPlane(tablePlane, worldPoint)) {
    stopper.position.copy(worldPoint).add(drag.offset);
    stopper.position.y = 0;
  }
});

function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  beginReturn();
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  view.distance = THREE.MathUtils.clamp(view.distance + event.deltaY * .0045, 3.55, 7.2);
}, {passive: false});
document.querySelector('#reset').addEventListener('click', reset);
new ResizeObserver(resize).observe(canvas);
resize();
reset();

function render(now) {
  updateCamera();
  if (returnAnimation) {
    const progress = THREE.MathUtils.clamp((now - returnAnimation.started) / returnAnimation.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    stopper.position.lerpVectors(returnAnimation.start, homePosition, eased);
    if (progress >= 1) {
      returnAnimation = null;
      status.textContent = '橡胶塞已回到审核位置；拖动和自动归位可再次操作。';
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
