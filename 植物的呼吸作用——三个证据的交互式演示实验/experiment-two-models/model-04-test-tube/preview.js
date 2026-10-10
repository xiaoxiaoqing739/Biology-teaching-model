import * as THREE from '../../shared/vendor/three.module.js';
import {createTestTube} from './test-tube.js';

const canvas = document.querySelector('#model-canvas');
const status = document.querySelector('#status');
const orientationButton = document.querySelector('#orientation');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x183038);
scene.add(new THREE.HemisphereLight(0xebffff, 0x19383d, 2.9));
const key = new THREE.DirectionalLight(0xffffff, 4.6);
key.position.set(-4, 7, 5);
key.castShadow = true;
scene.add(key);
const edge = new THREE.DirectionalLight(0x6bf2e8, 3.4);
edge.position.set(5, 4, -4);
scene.add(edge);

const table = new THREE.Mesh(
  new THREE.CylinderGeometry(4.1, 4.25, .28, 128),
  new THREE.MeshStandardMaterial({color: 0x385f61, roughness: .62, metalness: .14}),
);
table.position.y = -.18;
table.receiveShadow = true;
scene.add(table);

const tube = createTestTube();
scene.add(tube);
let vertical = false;
const horizontalPosition = new THREE.Vector3(-1.60, .32, 0);
const verticalPosition = new THREE.Vector3(0, 0, 0);
const horizontalQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
const verticalQuaternion = new THREE.Quaternion();
const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
const target = new THREE.Vector3(0, 1.25, 0);
const view = {distance: 6.8};
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPoint = new THREE.Vector3();
let drag = null;
let transition = null;

function statePosition() { return vertical ? verticalPosition : horizontalPosition; }
function stateQuaternion() { return vertical ? verticalQuaternion : horizontalQuaternion; }
function applyState() {
  tube.position.copy(statePosition());
  tube.quaternion.copy(stateQuaternion());
  orientationButton.textContent = vertical ? '切换为材料区横放状态' : '切换为组装竖直状态';
}
function resize() {
  const width = canvas.clientWidth;
  const height = Math.max(canvas.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function updateCamera() {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const minimum = 4.4 / (2 * Math.tan(fov / 2) * Math.max(camera.aspect, .34));
  const distance = Math.max(view.distance, minimum);
  camera.position.set(distance * .28, target.y + distance * .20, distance * .96);
  camera.lookAt(target);
}
function setRay(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}
canvas.addEventListener('pointerdown', event => {
  if (transition) return;
  setRay(event);
  if (!raycaster.intersectObject(tube, true).length || !raycaster.ray.intersectPlane(tablePlane, worldPoint)) return;
  drag = {id: event.pointerId, offset: tube.position.clone().sub(worldPoint)};
  canvas.setPointerCapture(event.pointerId);
  status.textContent = `正在拖动${vertical ? '竖直' : '横放'}试管。`;
});
canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  setRay(event);
  if (raycaster.ray.intersectPlane(tablePlane, worldPoint)) tube.position.copy(worldPoint).add(drag.offset);
  tube.position.y = vertical ? 0 : .32;
});
function release(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  transition = {fromPosition: tube.position.clone(), fromQuaternion: tube.quaternion.clone(), start: performance.now(), duration: 450};
  status.textContent = '当前没有组装目标，试管正在返回材料位置。';
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  view.distance = THREE.MathUtils.clamp(view.distance + event.deltaY * .005, 5.8, 12);
}, {passive: false});
orientationButton.addEventListener('click', () => {
  if (transition) return;
  const fromPosition = tube.position.clone();
  const fromQuaternion = tube.quaternion.clone();
  vertical = !vertical;
  transition = {fromPosition, fromQuaternion, start: performance.now(), duration: vertical ? 500 : 450};
  orientationButton.textContent = vertical ? '切换为材料区横放状态' : '切换为组装竖直状态';
  status.textContent = vertical ? '试管正在升起并旋转为竖直状态。' : '试管正在恢复材料区横放状态。';
});
document.querySelector('#reset').addEventListener('click', () => {
  vertical = false;
  transition = null;
  drag = null;
  view.distance = 6.8;
  applyState();
  status.textContent = '当前为未组装横放状态；页面没有添加试管架或固定支座。';
});
new ResizeObserver(resize).observe(canvas);
resize();
applyState();

function render(now) {
  updateCamera();
  if (transition) {
    const progress = THREE.MathUtils.clamp((now - transition.start) / transition.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    tube.position.lerpVectors(transition.fromPosition, statePosition(), eased);
    tube.quaternion.slerpQuaternions(transition.fromQuaternion, stateQuaternion(), eased);
    if (progress >= 1) {
      transition = null;
      status.textContent = vertical ? '试管已竖直落在实验台面，没有可见支座。' : '试管已恢复材料区横放状态。';
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
