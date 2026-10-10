import * as THREE from '../../shared/vendor/three.module.js';
import {createLongStemFunnel} from './long-stem-funnel.js';

const canvas = document.querySelector('#model-canvas');
const status = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x183038);
scene.add(new THREE.HemisphereLight(0xe9ffff, 0x19383d, 2.8));
const key = new THREE.DirectionalLight(0xffffff, 4.5);
key.position.set(-4, 8, 5);
key.castShadow = true;
scene.add(key);
const edge = new THREE.DirectionalLight(0x62f0e6, 3.2);
edge.position.set(4, 5, -4);
scene.add(edge);

const table = new THREE.Mesh(
  new THREE.CylinderGeometry(4.2, 4.35, .28, 128),
  new THREE.MeshStandardMaterial({color: 0x385f61, roughness: .62, metalness: .14}),
);
table.position.y = -.18;
table.receiveShadow = true;
scene.add(table);

const funnel = createLongStemFunnel();
scene.add(funnel);
const home = new THREE.Vector3();
const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
const target = new THREE.Vector3(0, 2.75, 0);
const view = {distance: 10.8};
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
  const minByHeight = 7.0 / (2 * Math.tan(fov / 2));
  const minByWidth = 2.2 / (2 * Math.tan(fov / 2) * Math.max(camera.aspect, .28));
  const distance = Math.max(view.distance, minByHeight, minByWidth);
  camera.position.set(distance * .34, target.y + distance * .08, distance * .94);
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
  if (!raycaster.intersectObject(funnel, true).length || !raycaster.ray.intersectPlane(tablePlane, worldPoint)) return;
  drag = {id: event.pointerId, offset: funnel.position.clone().sub(worldPoint)};
  canvas.setPointerCapture(event.pointerId);
  status.textContent = '正在拖动长颈漏斗；漏斗作为完整刚性器材移动。';
});
canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  setRay(event);
  if (raycaster.ray.intersectPlane(tablePlane, worldPoint)) funnel.position.copy(worldPoint).add(drag.offset);
  funnel.position.y = 0;
});
function release(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  returning = {from: funnel.position.clone(), start: performance.now(), duration: 450};
  status.textContent = '当前没有装配目标，漏斗正在返回材料位置。';
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  view.distance = THREE.MathUtils.clamp(view.distance + event.deltaY * .006, 9.2, 16);
}, {passive: false});

function reset() {
  funnel.position.copy(home);
  funnel.quaternion.identity();
  view.distance = 10.8;
  drag = null;
  returning = null;
  status.textContent = '长颈漏斗为连续中空玻璃结构，当前独立展示。';
}
document.querySelector('#reset').addEventListener('click', reset);
new ResizeObserver(resize).observe(canvas);
resize();
reset();

function render(now) {
  updateCamera();
  if (returning) {
    const progress = THREE.MathUtils.clamp((now - returning.start) / returning.duration, 0, 1);
    funnel.position.lerpVectors(returning.from, home, 1 - Math.pow(1 - progress, 3));
    if (progress >= 1) {
      returning = null;
      status.textContent = '长颈漏斗已返回材料位置。';
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
