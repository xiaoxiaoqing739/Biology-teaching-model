import * as THREE from '../shared/vendor/three.module.js';
import { createRespirationBench, RESPIRATION_BENCH_PLAN } from '../shared/bench/respiration-bench.js';

const host = document.querySelector('#bench-scene');
const renderer = new THREE.WebGLRenderer({ canvas: host, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2a31);
const camera = new THREE.OrthographicCamera(-18, 18, 10, -10, .1, 100);
const eye = new THREE.Vector3(0, 11.6, 31);
const focus = new THREE.Vector3(0, .05, 5.2);
camera.position.copy(eye);
camera.lookAt(focus);

scene.add(new THREE.HemisphereLight(0xf0f7f8, 0x34424b, 2.8));
const key = new THREE.DirectionalLight(0xfff1d9, 3.4);
key.position.set(-8, 16, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -20, right: 20, top: 13, bottom: -13, near: .1, far: 55 });
scene.add(key);
const fill = new THREE.DirectionalLight(0xbde9f8, 1.9);
fill.position.set(8, 10, -8);
scene.add(fill);

const layout = createRespirationBench(scene);
const slots = RESPIRATION_BENCH_PLAN.reduce((total, zone) => total + zone.slots.length, 0);
document.querySelector('#bench-status').textContent = `共 ${layout.zones.length} 个实验区 · ${slots} 个独立器材物位 · 当前仅审核实验台与物位，不放置器材模型`;

const zoneSummary = document.querySelector('#zone-summary');
const zoneHeadings = document.querySelector('#zone-headings');
const operationLabels = document.querySelector('#operation-labels');
const zoneHeadingEntries = [];
for (const zone of layout.zones) {
  const item = document.createElement('li');
  item.innerHTML = `<strong>${zone.title}</strong><span>${zone.slots.length} 个物位 · 台面宽度 ${zone.width.toFixed(2)} 单位</span>`;
  zoneSummary.append(item);

  const heading = document.createElement('div');
  const fullTitle = zone.id === 'oxygen' ? '实验一：种子萌发时吸收氧气' : zone.id === 'carbon-dioxide' ? '实验二：种子萌发时释放二氧化碳' : '实验三：种子萌发时释放能量';
  heading.className = 'zone-heading';
  heading.style.setProperty('--zone-color', `#${zone.color.toString(16).padStart(6, '0')}`);
  heading.innerHTML = `<strong>${fullTitle}</strong><span>${zone.slots.length} 个器材物位 · ${zone.subtitle}</span>`;
  zoneHeadings.append(heading);
  zoneHeadingEntries.push({ zone, heading });
}

const operationTitle = document.createElement('div');
operationTitle.className = 'operation-title';
operationTitle.innerHTML = '<strong>实验操作台</strong><span>当前实验步骤与甲乙对照操作在此完成</span>';
operationLabels.append(operationTitle);
const operationZoneEntries = layout.operationBench.zones.map(zone => {
  const element = document.createElement('div');
  element.className = 'operation-zone-label';
  element.textContent = zone.title;
  element.style.setProperty('--operation-color', `#${zone.color.toString(16).padStart(6, '0')}`);
  operationLabels.append(element);
  return { zone, element };
});

const view = { eye: eye.clone(), focus: focus.clone(), zoom: 1.1 };
let drag = null;

const timeOutput = document.querySelector('#time-output');
const advanceDay = document.querySelector('#advance-day');
let timeAnimation = 0;

function setDisplayedHour(hour) {
  const normalized = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(normalized);
  const minutes = Math.floor((normalized - wholeHour) * 60);
  timeOutput.value = `${String(wholeHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  layout.dayNightWindow.setHour(normalized);
}

function playTwentyFourHours() {
  const token = ++timeAnimation;
  const startedAt = performance.now();
  const duration = 8000;
  advanceDay.disabled = true;
  advanceDay.textContent = '24小时变化中…';
  const tick = now => {
    if (token !== timeAnimation) return;
    const progress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
    setDisplayedHour(12 + progress * 24);
    advanceDay.dataset.progress = String(progress);
    if (progress < 1) requestAnimationFrame(tick);
    else {
      setDisplayedHour(12);
      advanceDay.disabled = false;
      advanceDay.textContent = '24小时后';
      advanceDay.dataset.progress = '1';
    }
  };
  requestAnimationFrame(tick);
}

advanceDay.addEventListener('click', playTwentyFourHours);
setDisplayedHour(12);

function updateCamera() {
  camera.position.copy(view.eye);
  camera.lookAt(view.focus);
  camera.zoom = view.zoom;
  camera.updateProjectionMatrix();
}

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  const aspect = width / Math.max(height, 1);
  const span = Math.max(43, 19 * aspect);
  camera.left = -span / 2;
  camera.right = span / 2;
  camera.top = span / aspect / 2;
  camera.bottom = -camera.top;
  renderer.setSize(width, height, false);
  updateCamera();
}

function updateZoneHeadings() {
  const frustumWidth = camera.right - camera.left;
  for (const { zone, heading } of zoneHeadingEntries) {
    const point = new THREE.Vector3(zone.center, .72, -4.0).project(camera);
    heading.style.left = `${(point.x * .5 + .5) * host.clientWidth}px`;
    heading.style.top = `${(-point.y * .5 + .5) * host.clientHeight}px`;
    heading.style.width = `${Math.max(260, zone.width * host.clientWidth / frustumWidth * camera.zoom * .92)}px`;
  }

  const operation = layout.operationBench;
  const titlePoint = new THREE.Vector3(0, .82, operation.centerZ - operation.depth / 2 + .18).project(camera);
  operationTitle.style.left = `${(titlePoint.x * .5 + .5) * host.clientWidth}px`;
  operationTitle.style.top = `${(-titlePoint.y * .5 + .5) * host.clientHeight}px`;
  for (const { zone, element } of operationZoneEntries) {
    const point = new THREE.Vector3(zone.centerX, .10, operation.centerZ + .45).project(camera);
    element.style.left = `${(point.x * .5 + .5) * host.clientWidth}px`;
    element.style.top = `${(-point.y * .5 + .5) * host.clientHeight}px`;
  }
}

function render() {
  renderer.render(scene, camera);
  updateZoneHeadings();
}

host.addEventListener('pointerdown', event => {
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  host.setPointerCapture(event.pointerId);
});

host.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const scale = (camera.right - camera.left) / host.clientWidth / camera.zoom;
  const dx = (event.clientX - drag.x) * scale;
  const dz = (event.clientY - drag.y) * scale;
  view.eye.x -= dx;
  view.focus.x -= dx;
  view.eye.z -= dz;
  view.focus.z -= dz;
  drag.x = event.clientX;
  drag.y = event.clientY;
  updateCamera();
  render();
});

function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
}

host.addEventListener('pointerup', endDrag);
host.addEventListener('pointercancel', endDrag);
host.addEventListener('wheel', event => {
  event.preventDefault();
  view.zoom = THREE.MathUtils.clamp(view.zoom * Math.exp(-event.deltaY * .001), .8, 2.3);
  updateCamera();
  render();
}, { passive: false });

document.querySelector('#reset-view').addEventListener('click', () => {
  view.eye.copy(eye);
  view.focus.copy(focus);
  view.zoom = 1.1;
  updateCamera();
  render();
});

addEventListener('resize', resize);
new ResizeObserver(() => {
  resize();
  render();
}).observe(host);
resize();
function animate() {
  render();
  requestAnimationFrame(animate);
}
requestAnimationFrame(() => {
  resize();
  animate();
});
