import * as THREE from '../../shared/vendor/three.module.js';
import {createWaterBeaker, createWaterStream} from './water-beaker.js';

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
scene.add(new THREE.HemisphereLight(0xf0ffff, 0x19383d, 3));
const key = new THREE.DirectionalLight(0xffffff, 4.8);
key.position.set(-4, 7, 5);
key.castShadow = true;
scene.add(key);
const edge = new THREE.DirectionalLight(0x6af3e9, 3.5);
edge.position.set(5, 4, -4);
scene.add(edge);
const table = new THREE.Mesh(
  new THREE.CylinderGeometry(4.0, 4.15, .28, 128),
  new THREE.MeshStandardMaterial({color: 0x385f61, roughness: .62, metalness: .14}),
);
table.position.y = -.18;
table.receiveShadow = true;
scene.add(table);

const beaker = createWaterBeaker();
const waterStream = createWaterStream();
scene.add(beaker, waterStream);
const home = new THREE.Vector3(0, 0, 0);
const pourPosition = new THREE.Vector3(-.70, 1.82, 0);
const streamEnd = new THREE.Vector3(1.18, .18, 0);
const streamStart = new THREE.Vector3();
const streamDirection = new THREE.Vector3();
const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
const target = new THREE.Vector3(0, .86, 0);
let distance = 4.8;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPoint = new THREE.Vector3();
let drag = null;
let animation = null;

function resize() {
  const width = canvas.clientWidth;
  const height = Math.max(canvas.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function updateCamera() {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const minimum = 2.9 / (2 * Math.tan(fov / 2) * Math.max(camera.aspect, .38));
  const fitted = Math.max(distance, minimum);
  camera.position.set(fitted * .38, target.y + fitted * .28, fitted * .90);
  camera.lookAt(target);
}
function setRay(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}
canvas.addEventListener('pointerdown', event => {
  if (animation) return;
  setRay(event);
  if (!raycaster.intersectObject(beaker, true).length || !raycaster.ray.intersectPlane(plane, worldPoint)) return;
  drag = {id: event.pointerId, offset: beaker.position.clone().sub(worldPoint)};
  canvas.setPointerCapture(event.pointerId);
  status.textContent = '正在拖动注水烧杯。';
});
canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  setRay(event);
  if (raycaster.ray.intersectPlane(plane, worldPoint)) beaker.position.copy(worldPoint).add(drag.offset);
  beaker.position.y = 0;
});
function release(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  animation = {type: 'return', fromPosition: beaker.position.clone(), fromQuaternion: beaker.quaternion.clone(), start: performance.now(), duration: 450};
  status.textContent = '未进入漏斗有效范围，烧杯正在返回材料位置。';
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  distance = THREE.MathUtils.clamp(distance + event.deltaY * .005, 4.2, 9);
}, {passive: false});
document.querySelector('#pour').addEventListener('click', () => {
  if (animation) return;
  animation = {type: 'pour', fromPosition: beaker.position.clone(), fromQuaternion: beaker.quaternion.clone(), start: performance.now(), duration: 1800};
  status.textContent = '烧杯正在转到 62° 倾倒姿态，水量同步下降。';
});
document.querySelector('#reset').addEventListener('click', () => {
  animation = null;
  drag = null;
  beaker.position.copy(home);
  beaker.quaternion.identity();
  beaker.userData.setPourState(0, 0);
  waterStream.userData.hide();
  distance = 4.8;
  status.textContent = '烧杯初始装水量为有效容积的 78%。';
});
new ResizeObserver(resize).observe(canvas);
resize();

function render(now) {
  updateCamera();
  if (animation) {
    const progress = THREE.MathUtils.clamp((now - animation.start) / animation.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    if (animation.type === 'return') {
      beaker.position.lerpVectors(animation.fromPosition, home, eased);
      beaker.quaternion.slerpQuaternions(animation.fromQuaternion, new THREE.Quaternion(), eased);
    } else {
      const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -THREE.MathUtils.degToRad(62));
      beaker.position.lerpVectors(animation.fromPosition, pourPosition, Math.min(eased * 1.35, 1));
      beaker.quaternion.slerpQuaternions(animation.fromQuaternion, targetQuaternion, Math.min(eased * 1.5, 1));
      const fillProgress = THREE.MathUtils.smoothstep(progress, .30, .96);
      beaker.userData.setPourState(beaker.rotation.z, fillProgress);
      beaker.userData.anchors.streamOrigin.getWorldPosition(streamStart);
      streamDirection.set(1, 0, 0).applyQuaternion(beaker.quaternion).normalize();
      const flowIn = THREE.MathUtils.smoothstep(progress, .22, .34);
      const flowOut = 1 - THREE.MathUtils.smoothstep(progress, .78, .98);
      waterStream.userData.update(streamStart, streamEnd, flowIn * flowOut, now - animation.start, streamDirection);
    }
    if (progress >= 1) {
      const type = animation.type;
      animation = null;
      waterStream.userData.hide();
      status.textContent = type === 'pour' ? '倾倒演示完成：烧杯水量为 0%。' : '烧杯已返回材料位置。';
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
