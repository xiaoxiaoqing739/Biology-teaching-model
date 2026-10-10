import * as THREE from '../../shared/vendor/three.module.js';
import {createDeliveryTube} from './delivery-tube.js';

const canvas = document.querySelector('#model-canvas');
const status = document.querySelector('#status');
const mirrorButton = document.querySelector('#mirror');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x183038);
scene.add(new THREE.HemisphereLight(0xeaffff, 0x17343a, 2.8));
const key = new THREE.DirectionalLight(0xffffff, 4.4);
key.position.set(-4, 7, 5);
key.castShadow = true;
scene.add(key);
const edge = new THREE.DirectionalLight(0x67eee5, 3.4);
edge.position.set(5, 4, -4);
scene.add(edge);

const table = new THREE.Mesh(
  new THREE.CylinderGeometry(4.7, 4.85, .28, 128),
  new THREE.MeshStandardMaterial({color: 0x385f61, roughness: .62, metalness: .14}),
);
table.position.y = -.18;
table.receiveShadow = true;
scene.add(table);

let mirrored = false;
let tube = createDeliveryTube({mirrored});
scene.add(tube);
const home = new THREE.Vector3(-1.48, 2.90, 0);
tube.position.copy(home);
const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
const target = new THREE.Vector3(0, 1.25, 0);
const view = {distance: 7.4};
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPoint = new THREE.Vector3();
let drag = null;
let returning = null;

function resize() {
  const width = canvas.clientWidth;
  const height = Math.max(canvas.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function updateCamera() {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const minWidth = 4.6 / (2 * Math.tan(fov / 2) * Math.max(camera.aspect, .3));
  const distance = Math.max(view.distance, minWidth);
  camera.position.set(distance * .22, target.y + distance * .18, distance * .98);
  camera.lookAt(target);
}
function setRay(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}
canvas.addEventListener('pointerdown', event => {
  if (returning) return;
  setRay(event);
  if (!raycaster.intersectObject(tube, true).length || !raycaster.ray.intersectPlane(tablePlane, worldPoint)) return;
  drag = {id: event.pointerId, offset: tube.position.clone().sub(worldPoint)};
  canvas.setPointerCapture(event.pointerId);
  status.textContent = '正在拖动整根导气管；曲线形状保持不变。';
});
canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  setRay(event);
  if (raycaster.ray.intersectPlane(tablePlane, worldPoint)) tube.position.copy(worldPoint).add(drag.offset);
  tube.position.y = 2.90;
});
function release(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  returning = {from: tube.position.clone(), start: performance.now(), duration: 450};
  status.textContent = '两个连接端尚未同时进入目标，导气管正在返回材料位置。';
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  view.distance = THREE.MathUtils.clamp(view.distance + event.deltaY * .005, 6.6, 13);
}, {passive: false});

function rebuild() {
  scene.remove(tube);
  tube = createDeliveryTube({mirrored});
  tube.position.copy(home);
  scene.add(tube);
  returning = null;
  drag = null;
  mirrorButton.textContent = mirrored ? '切换为甲组方向' : '切换为乙组镜像';
  status.textContent = `当前显示${mirrored ? '乙组镜像' : '甲组'}导气管；尺寸保持一致。`;
}
mirrorButton.addEventListener('click', () => {
  mirrored = !mirrored;
  rebuild();
});
document.querySelector('#reset').addEventListener('click', () => {
  tube.position.copy(home);
  view.distance = 7.4;
  returning = null;
  drag = null;
  status.textContent = `已复位${mirrored ? '乙组镜像' : '甲组'}导气管。`;
});
new ResizeObserver(resize).observe(canvas);
resize();

function render(now) {
  updateCamera();
  if (returning) {
    const progress = THREE.MathUtils.clamp((now - returning.start) / returning.duration, 0, 1);
    tube.position.lerpVectors(returning.from, home, 1 - Math.pow(1 - progress, 3));
    if (progress >= 1) {
      returning = null;
      status.textContent = '导气管已返回材料位置。';
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
