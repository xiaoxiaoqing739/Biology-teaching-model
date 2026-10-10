import * as THREE from '../../shared/vendor/three.module.js';
import {createTestTube} from '../model-04-test-tube/test-tube.js';
import {createLimewaterSystem} from './limewater.js';

const canvas = document.querySelector('#model-canvas');
const status = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x183038);
scene.add(new THREE.HemisphereLight(0xf1ffff, 0x17353b, 3.0));
const key = new THREE.DirectionalLight(0xffffff, 4.8);
key.position.set(-4, 7, 5);
key.castShadow = true;
scene.add(key);
const edge = new THREE.DirectionalLight(0x6ff6eb, 3.8);
edge.position.set(5, 4, -4);
scene.add(edge);

const table = new THREE.Mesh(
  new THREE.CylinderGeometry(3.8, 3.95, .28, 128),
  new THREE.MeshStandardMaterial({color: 0x385f61, roughness: .62, metalness: .14}),
);
table.position.y = -.18;
table.receiveShadow = true;
scene.add(table);
const testTube = createTestTube();
const limewater = createLimewaterSystem();
scene.add(testTube, limewater);

const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
const target = new THREE.Vector3(0, 1.5, 0);
let distance = 5.8;
function resize() {
  const width = canvas.clientWidth;
  const height = Math.max(canvas.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function updateCamera() {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const minimum = 4.0 / (2 * Math.tan(fov / 2) * Math.max(camera.aspect, .36));
  const fitted = Math.max(distance, minimum);
  camera.position.set(fitted * .34, target.y + fitted * .12, fitted * .94);
  camera.lookAt(target);
}
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  distance = THREE.MathUtils.clamp(distance + event.deltaY * .005, 5.0, 10);
}, {passive: false});
document.querySelector('#group-a').addEventListener('click', () => {
  limewater.userData.start('A');
  status.textContent = '甲组正在通气：气泡持续上升，1 秒后石灰水逐渐变浑浊。';
});
document.querySelector('#group-b').addEventListener('click', () => {
  limewater.userData.start('B');
  status.textContent = '乙组正在通气：同样产生气泡，但石灰水保持澄清。';
});
document.querySelector('#reset').addEventListener('click', () => {
  limewater.userData.reset();
  distance = 5.8;
  status.textContent = '初始状态：澄清石灰水，尚未通入气体。';
});
new ResizeObserver(resize).observe(canvas);
resize();

function render(now) {
  updateCamera();
  limewater.userData.update(now);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
