import * as THREE from '../shared/vendor/three.module.js';
import {createRespirationBench, RESPIRATION_BENCH_PLAN} from '../shared/bench/respiration-bench.js';
import {createSmallBeaker} from '../experiment-oxygen/models/small-beaker.js';
import {createThermosFlask} from '../experiment-three-models/thermos-flask.js';
import {createThermometer} from '../experiment-three-models/thermometer.js';
import {createPerforatedStopper} from '../experiment-three-models/perforated-stopper.js';
import {createSeedBed} from '../experiment-three-models/seed-bed.js';
import {setupPageControls} from '../shared/page-controls.js';
import {populateStorageCatalog} from '../shared/storage-catalog.js';

const canvas = document.querySelector('#experiment-scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2a31);
const camera = new THREE.OrthographicCamera(-18, 18, 10, -10, .1, 100);
const initialEye = new THREE.Vector3(0, 11.8, 31);
const initialFocus = new THREE.Vector3(0, .05, 5.9);
const view = {eye: initialEye.clone(), focus: initialFocus.clone(), zoom: 1.04};
scene.add(new THREE.HemisphereLight(0xf2f8f6, 0x34424b, 2.65));
const key = new THREE.DirectionalLight(0xfff1d9, 3.4);
key.position.set(-8, 16, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -20, right: 20, top: 13, bottom: -13, near: .1, far: 55});
scene.add(key);
const fill = new THREE.DirectionalLight(0xbde9f8, 1.75);
fill.position.set(8, 10, -8);
scene.add(fill);

const bench = createRespirationBench(scene);
populateStorageCatalog(scene, bench, 'energy');
bench.dayNightWindow.setHour(12);
const energyZone = bench.zones.find(zone => zone.id === 'energy');
const energyPlan = RESPIRATION_BENCH_PLAN.find(zone => zone.id === 'energy');
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const invisible = () => new THREE.MeshBasicMaterial({transparent: true, opacity: .001, depthWrite: false});

function addBenchFrontLabel(text, x, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const context = c.getContext('2d');
  context.fillStyle = 'rgba(6,25,30,.96)';
  context.fillRect(0, 0, 512, 128);
  context.strokeStyle = color;
  context.lineWidth = 8;
  context.strokeRect(6, 6, 500, 116);
  context.fillStyle = '#f4fffc';
  context.font = '700 58px "PingFang SC",sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, .70), new THREE.MeshBasicMaterial({map: texture, transparent: true, depthWrite: false}));
  mesh.position.set(x, -.50, 14.22);
  mesh.renderOrder = 8;
  scene.add(mesh);
}
addBenchFrontLabel('甲组', -4.55, '#70d6d0');
addBenchFrontLabel('乙组', 4.55, '#9ca7f3');

function createSeedBeaker(group) {
  const root = new THREE.Group();
  root.name = `experiment-three-seed-beaker-${group}`;
  const beaker = createSmallBeaker();
  root.add(beaker);
  const geometry = new THREE.SphereGeometry(1, 16, 10);
  const material = new THREE.MeshStandardMaterial({color: group === 'A' ? 0xc99648 : 0x8f644f, roughness: .80});
  const preview = new THREE.InstancedMesh(geometry, material, 96);
  preview.castShadow = true;
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let layer = 0; layer < 4; layer += 1) {
    for (let row = -2; row <= 2; row += 1) {
      for (let column = -2; column <= 2 && index < 96; column += 1) {
        const x = column * .30 + (row % 2 ? .14 : 0);
        const z = row * .25;
        if (Math.hypot(x, z) > .78) continue;
        dummy.position.set(x, .23 + layer * .24, z);
        dummy.rotation.set(index * .13, index * .47, index * .09);
        dummy.scale.set(.14, .095, .115);
        dummy.updateMatrix();
        preview.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
  }
  preview.count = index;
  preview.instanceMatrix.needsUpdate = true;
  root.add(preview);
  const streamOrigin = new THREE.Object3D();
  streamOrigin.position.set(0, 1.25, 0);
  root.add(streamOrigin);
  const pourLip = new THREE.Object3D();
  pourLip.position.set(group === 'A' ? 1.04 : -1.04, 1.25, 0);
  root.add(pourLip);
  root.userData = {
    type: 'seed-beaker',
    streamOrigin,
    pourLip,
    capacity: index,
    setFillProgress(progress) {
      preview.count = Math.round(index * THREE.MathUtils.clamp(progress, 0, 1));
      preview.visible = preview.count > 0;
    },
  };
  return root;
}

function createSeedStream(group) {
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  const material = new THREE.MeshStandardMaterial({color: group === 'A' ? 0xc99648 : 0x8f644f, roughness: .80});
  const stream = new THREE.InstancedMesh(geometry, material, 22);
  stream.visible = false;
  stream.frustumCulled = false;
  stream.castShadow = true;
  const dummy = new THREE.Object3D();
  stream.userData.update = (from, to, progress, elapsed) => {
    const flow = Math.sin(Math.PI * progress);
    stream.visible = flow > .02;
    if (!stream.visible) return;
    for (let index = 0; index < 22; index += 1) {
      const phase = ((elapsed * .0019 + index / 22) % 1);
      dummy.position.lerpVectors(from, to, phase);
      dummy.position.x += Math.sin(index * 2.1 + elapsed * .008) * .055 * flow;
      dummy.position.z += Math.cos(index * 1.7 + elapsed * .007) * .045 * flow;
      dummy.rotation.set(index * .31, elapsed * .003 + index, index * .19);
      dummy.scale.set(.08, .055, .065);
      dummy.updateMatrix();
      stream.setMatrixAt(index, dummy.matrix);
    }
    stream.instanceMatrix.needsUpdate = true;
  };
  stream.userData.hide = () => { stream.visible = false; };
  return stream;
}

function createThermosAsset(group) {
  const model = createThermosFlask();
  const bed = createSeedBed({group});
  model.add(bed);
  return model;
}

function makeAsset(model, scale = .55, hitSize = [1.8, 2.5, 1.8]) {
  const root = new THREE.Group();
  model.scale.setScalar(scale);
  root.add(model);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(...hitSize), invisible());
  hit.position.y = hitSize[1] / 2;
  root.add(hit);
  return root;
}

const slot = (index, dx = 0, dz = 0) => {
  const data = energyPlan.slots[index];
  return V(energyZone.center + data[2] + dx, .03, data[3] + dz);
};
const homes = {
  thermosA: V(-3.10, .03, 10.45), thermosB: V(3.10, .03, 10.45),
  beakerA: V(-5.45, .03, 10.55), beakerB: V(5.45, .03, 10.55),
  thermometerA: V(-4.55, .03, 12.50), thermometerB: V(4.55, .03, 12.50),
  stopperA: V(-1.90, .03, 12.48), stopperB: V(1.90, .03, 12.48),
};
const origins = {
  thermosA: V(energyZone.center-1.70,.03,-1.62), thermosB: V(energyZone.center+1.70,.03,-1.62),
  thermometerA: V(energyZone.center-1.62,.03,.62), thermometerB: V(energyZone.center+1.62,.03,.62),
  beakerA: V(energyZone.center-2.28,.03,2.28), beakerB: V(energyZone.center+2.28,.03,2.28),
  stopperA: V(energyZone.center-.58,.03,2.28), stopperB: V(energyZone.center+.58,.03,2.28),
};
const items = [];
const itemMap = {};
const tweens = [];
function register(id, root, group, originRotation = new THREE.Euler(), homeRotation = new THREE.Euler()) {
  root.position.copy(origins[id]);
  root.rotation.copy(originRotation);
  scene.add(root);
  const item = {
    id, root, group,
    origin: origins[id].clone(), originQuaternion: root.quaternion.clone(),
    home: homes[id].clone(), homeQuaternion: new THREE.Quaternion().setFromEuler(homeRotation),
  };
  root.traverse(object => { object.userData.dragItem = item; });
  items.push(item);
  itemMap[id] = item;
  return item;
}

register('thermosA', makeAsset(createThermosAsset('A'), .72, [2.4, 4.4, 2.4]), 'A');
register('thermosB', makeAsset(createThermosAsset('B'), .72, [2.4, 4.4, 2.4]), 'B');
register('beakerA', makeAsset(createSeedBeaker('A'), .70, [1.6, 1.5, 1.6]), 'A');
register('beakerB', makeAsset(createSeedBeaker('B'), .70, [1.6, 1.5, 1.6]), 'B');
register('thermometerA', makeAsset(createThermometer(), .65, [.85, 4.35, .85]), 'A', new THREE.Euler(0, 0, Math.PI / 2));
register('thermometerB', makeAsset(createThermometer(), .65, [.85, 4.35, .85]), 'B', new THREE.Euler(0, 0, Math.PI / 2));
register('stopperA', makeAsset(createPerforatedStopper(), .72, [1.45, .92, 1.45]), 'A', new THREE.Euler(0, 0, Math.PI / 2));
register('stopperB', makeAsset(createPerforatedStopper(), .72, [1.45, .92, 1.45]), 'B', new THREE.Euler(0, 0, Math.PI / 2));
const streams = {A: createSeedStream('A'), B: createSeedStream('B')};
scene.add(streams.A, streams.B);

function findModel(item, name) { return item.root.getObjectByName(name); }
function thermosModel(group) { return findModel(itemMap[`thermos${group}`], 'experiment-three-thermos-flask'); }
function seedBed(group) { return findModel(itemMap[`thermos${group}`], `experiment-three-seed-bed-${group}`); }
function seedBeaker(group) { return findModel(itemMap[`beaker${group}`], `experiment-three-seed-beaker-${group}`); }
function thermometerModel(group) { return findModel(itemMap[`thermometer${group}`], 'experiment-three-thermometer'); }

function worldAnchor(group, name) {
  const model = thermosModel(group);
  model.updateWorldMatrix(true, true);
  const target = new THREE.Vector3();
  model.userData.anchors[name].getWorldPosition(target);
  return target;
}

function createDetailView(canvas) {
  const detailRenderer = new THREE.WebGLRenderer({canvas, antialias: true});
  detailRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  detailRenderer.outputColorSpace = THREE.SRGBColorSpace;
  detailRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  detailRenderer.toneMappingExposure = 1.22;
  const detailScene = new THREE.Scene();
  detailScene.background = new THREE.Color(0x173039);
  detailScene.add(new THREE.HemisphereLight(0xf2f8f6, 0x34424b, 2.8));
  const light = new THREE.DirectionalLight(0xfff1d9, 3.2);
  light.position.set(-5, 10, 7);
  detailScene.add(light);
  const thermometer = createThermometer();
  thermometer.scale.setScalar(1.18);
  thermometer.position.y = -2.62;
  detailScene.add(thermometer);
  const detailCamera = new THREE.PerspectiveCamera(34, 1, .1, 40);
  detailCamera.position.set(1.15, 1.25, 14.5);
  detailCamera.lookAt(0, 1.10, 0);
  return {renderer: detailRenderer, scene: detailScene, camera: detailCamera, thermometer};
}

const detail = {
  panel: document.querySelector('#energy-detail'),
  status: document.querySelector('#energy-detail-status'),
  A: createDetailView(document.querySelector('#energy-detail-a')),
  B: createDetailView(document.querySelector('#energy-detail-b')),
};
function resizeDetailViews() {
  for (const group of ['A', 'B']) {
    const data = detail[group];
    const width = Math.max(data.renderer.domElement.clientWidth, 220);
    const height = Math.max(data.renderer.domElement.clientHeight, 150);
    data.renderer.setSize(width, height, false);
    data.camera.aspect = width / height;
    data.camera.updateProjectionMatrix();
  }
}

let started = false;
let busy = false;
let step = 0;
let drag = null;
let experimentRun = 0;
const temperature = {A: 20, B: 20, progress: 0};
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const cameraDirection = new THREE.Vector3();
const worldPoint = new THREE.Vector3();

const steps = [
  ['材料进入操作台', '甲乙两组等量材料分别进入对应操作区。', '甲乙两组'],
  ['向甲保温瓶装入萌发种子', '拖动甲组小烧杯至甲瓶口正上方，倒入能平铺至瓶内二分之一的种子。', '甲组'],
  ['向乙保温瓶装入煮熟种子', '拖动乙组小烧杯至乙瓶口正上方，倒入等量煮熟并冷却的种子。', '乙组'],
  ['放置甲组单孔塞', '拖动单孔塞到甲瓶口；密封塞从正上方下降并进入瓶颈。', '甲组'],
  ['插入甲组温度计', '将温度计对准塞孔，从上向下插入；液泡完全埋入种子层中央。', '甲组'],
  ['放置乙组单孔塞', '按相同方式把乙组单孔塞从正上方压入瓶颈。', '乙组'],
  ['插入乙组温度计', '将乙组温度计穿过塞孔向下插入，液泡位置与甲组一致。', '乙组'],
  ['密封3—4小时并观察', '点击“3—4小时后”，15秒内同步观察两支温度计的示意液柱变化。', '两组同步'],
  ['比较甲、乙温度', '甲组示意温度高于乙组；两组读数与细节图保持到结束实验。', '现象对比'],
];
const stepButtons = [...document.querySelectorAll('#energy-step-buttons button')];

function tween(item, to, duration, toQ = item.root.quaternion.clone()) {
  return new Promise(resolve => tweens.push({
    item,
    from: item.root.position.clone(), to: to.clone(),
    fromQ: item.root.quaternion.clone(), toQ: toQ.clone(),
    started: performance.now(), duration, resolve,
  }));
}

function remapDrag(root, item) { root.traverse(object => { object.userData.dragItem = item; }); }
function detachAssembly(group) {
  const thermometer = itemMap[`thermometer${group}`];
  const stopper = itemMap[`stopper${group}`];
  for (const item of [thermometer, stopper]) {
    if (item.root.parent !== scene) scene.attach(item.root);
    remapDrag(item.root, item);
  }
}
function attachAssembly(group) {
  scene.updateMatrixWorld(true);
  const thermos = itemMap[`thermos${group}`];
  for (const id of [`thermometer${group}`, `stopper${group}`]) thermos.root.attach(itemMap[id].root);
  remapDrag(thermos.root, thermos);
}

function setTemperature(a, b, progress = 0) {
  temperature.A = a;
  temperature.B = b;
  temperature.progress = progress;
  thermometerModel('A').userData.setTemperature(a);
  thermometerModel('B').userData.setTemperature(b);
  detail.A.thermometer.userData.setTemperature(a);
  detail.B.thermometer.userData.setTemperature(b);
  syncTemperatureOutputs();
}
function syncTemperatureOutputs() {
  const values = {A: temperature.A, B: temperature.B};
  for (const group of ['A', 'B']) {
    const value = values[group];
    const lower = group.toLowerCase();
    document.querySelector(`#temp-${lower}`).textContent = `${value.toFixed(1)} ℃`;
    document.querySelector(`#detail-temp-${lower}`).value = `${value.toFixed(1)} ℃`;
  }
  document.querySelector('#energy-progress-bar').style.width = `${temperature.progress * 100}%`;
}
function updateExperimentTime(progress) {
  const minutes = Math.round(progress * 210);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  document.querySelector('#time-output').value = `${hours}:${String(remainder).padStart(2, '0')}`;
  bench.dayNightWindow.setHour(12 + progress * 3.5);
}

function saveState() {
  localStorage.setItem('respiration-experiment-3', JSON.stringify({started, step, progress: temperature.progress, finished: false}));
}
function setStep(next, {save = true} = {}) {
  step = THREE.MathUtils.clamp(next, 0, steps.length - 1);
  const data = steps[step];
  document.querySelector('#step-number').textContent = `第 ${step + 1} 步 / ${steps.length}`;
  document.querySelector('#step-title').textContent = data[0];
  document.querySelector('#step-instruction').textContent = data[1];
  document.querySelector('#group-badge').textContent = data[2];
  document.querySelector('#scene-phase').textContent = data[0];
  document.querySelector('#scene-hint').textContent = data[1];
  stepButtons.forEach((button, index) => {
    button.classList.toggle('active', index === step);
    button.classList.toggle('done', index < step);
    button.disabled = !started || busy;
  });
  document.querySelector('#previous-step').disabled = !started || busy || step === 0;
  document.querySelector('#next-step').disabled = !started || busy || step === steps.length - 1;
  document.querySelector('#advance-time').disabled = !started || busy || step !== 7;
  document.querySelector('#conclusion').hidden = step !== 8;
  if (save) saveState();
}

function resetComponentsToHome() {
  detachAssembly('A');
  detachAssembly('B');
  for (const item of items) {
    item.root.position.copy(item.home);
    item.root.quaternion.copy(item.homeQuaternion);
    remapDrag(item.root, item);
  }
  seedBed('A').userData.setFillProgress(0);
  seedBed('B').userData.setFillProgress(0);
  seedBeaker('A').userData.setFillProgress(1);
  seedBeaker('B').userData.setFillProgress(1);
  streams.A.userData.hide();
  streams.B.userData.hide();
  setTemperature(20, 20, 0);
  updateExperimentTime(0);
  detail.panel.hidden = true;
  document.querySelector('#energy-progress-label').textContent = '3—4 小时压缩演示：0 / 15 s';
  document.querySelector('#status-a').classList.remove('complete');
  document.querySelector('#status-b').classList.remove('complete');
}

function placeInsertedThermometer(group) {
  const item = itemMap[`thermometer${group}`];
  if (item.root.parent !== scene) scene.attach(item.root);
  item.root.position.copy(worldAnchor(group, 'thermometerBulb'));
  item.root.quaternion.identity();
}
function placeInsertedStopper(group) {
  const item = itemMap[`stopper${group}`];
  if (item.root.parent !== scene) scene.attach(item.root);
  item.root.position.copy(worldAnchor(group, 'stopper'));
  item.root.quaternion.identity();
}

function applySnapshot(targetStep) {
  experimentRun += 1;
  tweens.splice(0).forEach(data => data.resolve());
  busy = false;
  started = true;
  document.querySelector('#start-experiment').hidden = true;
  resetComponentsToHome();
  if (targetStep >= 2) { seedBed('A').userData.setFillProgress(1); seedBeaker('A').userData.setFillProgress(0); }
  if (targetStep >= 3) { seedBed('B').userData.setFillProgress(1); seedBeaker('B').userData.setFillProgress(0); }
  if (targetStep >= 4) placeInsertedStopper('A');
  if (targetStep >= 5) { placeInsertedThermometer('A'); attachAssembly('A'); }
  if (targetStep >= 6) placeInsertedStopper('B');
  if (targetStep >= 7) { placeInsertedThermometer('B'); attachAssembly('B'); }
  if (targetStep >= 8) {
    setTemperature(23, 20, 1);
    updateExperimentTime(1);
    detail.panel.hidden = false;
    detail.status.textContent = '示意温差保持对比';
    document.querySelector('#energy-progress-label').textContent = '3—4 小时压缩演示：15 / 15 s';
    document.querySelector('#status-a').classList.add('complete');
    document.querySelector('#status-b').classList.add('complete');
    requestAnimationFrame(resizeDetailViews);
  }
  document.querySelector('#action-feedback').value = targetStep === 8 ? '教学示意结果：甲组 23.0 ℃，乙组保持 20.0 ℃；甲组温度升高。' : '已按步骤重建完整前置状态，可继续直接操作。';
  setStep(targetStep);
}

async function pourSeeds(group) {
  const expected = group === 'A' ? 1 : 2;
  if (busy || step !== expected) return;
  busy = true;
  setStep(step, {save: false});
  const item = itemMap[`beaker${group}`];
  const mouth = worldAnchor(group, 'mouth');
  const side = group === 'A' ? -1 : 1;
  const tilt = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), side < 0 ? -1.02 : 1.02);
  const model = seedBeaker(group);
  const lipLocal = model.userData.pourLip.position.clone().multiplyScalar(.70).applyQuaternion(tilt);
  const lipTarget = mouth.clone().add(V(0, .54, 0));
  const above = lipTarget.clone().sub(lipLocal);
  document.querySelector('#action-feedback').value = `${group === 'A' ? '甲' : '乙'}组烧杯正在瓶口正上方对准……`;
  await tween(item, above, 650, tilt);
  item.root.updateWorldMatrix(true, true);
  const from = new THREE.Vector3();
  model.userData.pourLip.getWorldPosition(from);
  const to = mouth.clone().add(V(0, -.10, 0));
  const startedAt = performance.now();
  const duration = 3600;
  await new Promise(resolve => {
    const frame = now => {
      const progress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
      streams[group].userData.update(from, to, progress, now - startedAt);
      seedBeaker(group).userData.setFillProgress(1 - progress);
      seedBed(group).userData.setFillProgress(progress);
      if (progress < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
  streams[group].userData.hide();
  seedBeaker(group).userData.setFillProgress(0);
  seedBed(group).userData.setFillProgress(1);
  await tween(item, item.home, 560, item.homeQuaternion);
  busy = false;
  document.querySelector('#action-feedback').value = `${group === 'A' ? '甲' : '乙'}组种子已平铺至保温瓶内腔二分之一。`;
  setStep(group === 'A' ? 2 : 3);
}

async function insertThermometer(group) {
  const expected = group === 'A' ? 4 : 6;
  if (busy || step !== expected) return;
  busy = true;
  setStep(step, {save: false});
  const item = itemMap[`thermometer${group}`];
  const target = worldAnchor(group, 'thermometerBulb');
  const above = worldAnchor(group, 'mouth').add(V(0, 2.05, 0));
  document.querySelector('#action-feedback').value = `${group === 'A' ? '甲' : '乙'}组温度计正在单孔塞正上方对齐……`;
  await tween(item, above, 520, new THREE.Quaternion());
  document.querySelector('#action-feedback').value = '温度计保持竖直，穿过塞孔向下插入；液泡将完全埋入种子层中央。';
  await tween(item, target, 1100, new THREE.Quaternion());
  attachAssembly(group);
  busy = false;
  document.querySelector('#action-feedback').value = '温度计液泡已埋入种子层中央，未接触瓶底和瓶壁。';
  setStep(group === 'A' ? 5 : 7);
}

async function sealThermos(group) {
  const expected = group === 'A' ? 3 : 5;
  if (busy || step !== expected) return;
  busy = true;
  setStep(step, {save: false});
  const item = itemMap[`stopper${group}`];
  const target = worldAnchor(group, 'stopper');
  const above = worldAnchor(group, 'mouth').add(V(0, 1.15, 0));
  document.querySelector('#action-feedback').value = `${group === 'A' ? '甲' : '乙'}组密封塞正在瓶口正上方对齐……`;
  await tween(item, above, 480, new THREE.Quaternion());
  document.querySelector('#action-feedback').value = '单孔塞正在从上向下进入瓶颈；中央孔保留给下一步温度计。';
  await tween(item, target, 820, new THREE.Quaternion());
  scene.updateMatrixWorld(true);
  itemMap[`thermos${group}`].root.attach(item.root);
  remapDrag(item.root, item);
  busy = false;
  document.querySelector('#action-feedback').value = `${group === 'A' ? '甲' : '乙'}组单孔塞已进入瓶颈，请将温度计穿过中央孔。`;
  setStep(group === 'A' ? 4 : 6);
}

async function runTemperatureChange() {
  if (busy || step !== 7) return;
  busy = true;
  const token = ++experimentRun;
  detail.panel.hidden = false;
  detail.status.textContent = '示意温度 · 动态观察中';
  requestAnimationFrame(resizeDetailViews);
  setStep(step, {save: false});
  document.querySelector('#action-feedback').value = '15秒代表教材中的3—4小时；请同步观察两支温度计液柱。';
  const startedAt = performance.now();
  const duration = 15000;
  await new Promise(resolve => {
    const frame = now => {
      if (token !== experimentRun) { resolve(); return; }
      const progress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
      const curve = progress * progress * (3 - 2 * progress);
      setTemperature(20 + 3 * curve, 20, progress);
      updateExperimentTime(progress);
      document.querySelector('#energy-progress-label').textContent = `3—4 小时压缩演示：${Math.min(15, Math.ceil(progress * 15))} / 15 s`;
      if (progress < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
  if (token !== experimentRun) return;
  setTemperature(23, 20, 1);
  updateExperimentTime(1);
  detail.status.textContent = '示意温差保持对比';
  document.querySelector('#energy-progress-label').textContent = '3—4 小时压缩演示：15 / 15 s';
  document.querySelector('#status-a').classList.add('complete');
  document.querySelector('#status-b').classList.add('complete');
  busy = false;
  document.querySelector('#action-feedback').value = '教学示意：甲组升至23.0 ℃，乙组保持20.0 ℃；现象保持至结束实验。';
  setStep(8);
}

async function transferMaterials() {
  if (started || busy) return;
  busy = true;
  document.querySelector('#start-experiment').hidden = true;
  document.querySelector('#scene-phase').textContent = '材料转移中';
  document.querySelector('#scene-hint').textContent = '两组器材沿独立路径进入前方对应操作区。';
  document.querySelector('#action-feedback').value = '保温瓶、种子、温度计和密封塞正在分组就位……';
  await Promise.all(items.map((item, index) => tween(item, item.home, 650 + index * 45, item.homeQuaternion)));
  started = true;
  busy = false;
  document.querySelector('#action-feedback').value = '8件独立器材已就位，请先完成甲组装种。';
  setStep(1);
}

async function finishExperiment() {
  if (step !== 8 || busy) return;
  busy = true;
  experimentRun += 1;
  setStep(step, {save: false});
  detail.panel.hidden = true;
  detachAssembly('A');
  detachAssembly('B');
  document.querySelector('#action-feedback').value = '实验结束，全部器材正在返回后方实验三材料区……';
  await Promise.all(items.map((item, index) => tween(item, item.origin, 650 + index * 35, item.originQuaternion)));
  started = false;
  busy = false;
  localStorage.setItem('respiration-experiment-3', JSON.stringify({started: true, finished: true, step: 8}));
  document.querySelector('#step-number').textContent = '完成';
  document.querySelector('#step-title').textContent = '实验三已完成';
  document.querySelector('#step-instruction').textContent = '两组器材已归回后方材料区。';
  document.querySelector('#scene-phase').textContent = '实验三已完成';
  document.querySelector('#scene-hint').textContent = '温差证据已记录，器材已归位。';
  document.querySelector('#action-feedback').value = '实验三已完成，器材已归位。';
  stepButtons.forEach(button => { button.disabled = true; button.classList.add('done'); button.classList.remove('active'); });
}

function resetExperiment() {
  experimentRun += 1;
  tweens.splice(0).forEach(data => data.resolve());
  started = false;
  busy = false;
  step = 0;
  detachAssembly('A');
  detachAssembly('B');
  for (const item of items) {
    item.root.position.copy(item.origin);
    item.root.quaternion.copy(item.originQuaternion);
    remapDrag(item.root, item);
  }
  seedBed('A').userData.setFillProgress(0);
  seedBed('B').userData.setFillProgress(0);
  seedBeaker('A').userData.setFillProgress(1);
  seedBeaker('B').userData.setFillProgress(1);
  streams.A.userData.hide();
  streams.B.userData.hide();
  setTemperature(20, 20, 0);
  updateExperimentTime(0);
  detail.panel.hidden = true;
  document.querySelector('#start-experiment').hidden = false;
  document.querySelector('#scene-phase').textContent = '准备实验三';
  document.querySelector('#scene-hint').textContent = '材料位于后方实验三材料区，点击开始后转移至操作台。';
  document.querySelector('#step-number').textContent = '准备';
  document.querySelector('#step-title').textContent = '材料陈列与转移';
  document.querySelector('#step-instruction').textContent = '两组等量种子、保温瓶、温度计和密封塞将分别进入甲、乙操作区。';
  document.querySelector('#group-badge').textContent = '甲乙两组';
  document.querySelector('#action-feedback').value = '尚未开始';
  document.querySelector('#conclusion').hidden = true;
  document.querySelector('#status-a').classList.remove('complete');
  document.querySelector('#status-b').classList.remove('complete');
  document.querySelector('#energy-progress-label').textContent = '3—4 小时压缩演示：0 / 15 s';
  stepButtons.forEach(button => { button.disabled = true; button.classList.remove('active', 'done'); });
  document.querySelector('#previous-step').disabled = true;
  document.querySelector('#next-step').disabled = true;
  document.querySelector('#advance-time').disabled = true;
  localStorage.removeItem('respiration-experiment-3');
}

function rayFrom(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}
function activeItemId() {
  return ({1: 'beakerA', 2: 'beakerB', 3: 'stopperA', 4: 'thermometerA', 5: 'stopperB', 6: 'thermometerB'})[step] || null;
}
canvas.addEventListener('pointerdown', event => {
  rayFrom(event);
  if (started && !busy) {
    const hit = raycaster.intersectObjects(items.map(item => item.root), true).find(result => result.object.userData.dragItem);
    if (hit) {
      const item = hit.object.userData.dragItem;
      camera.getWorldDirection(cameraDirection);
      dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, item.root.getWorldPosition(new THREE.Vector3()));
      raycaster.ray.intersectPlane(dragPlane, worldPoint);
      const worldPosition = item.root.getWorldPosition(new THREE.Vector3());
      drag = {id: event.pointerId, type: 'item', item, offset: worldPosition.sub(worldPoint)};
      if (item.root.parent !== scene) scene.attach(item.root);
      canvas.setPointerCapture(event.pointerId);
      return;
    }
  }
  drag = {id: event.pointerId, type: 'view', x: event.clientX, y: event.clientY};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  if (drag.type === 'view') {
    const scale = (camera.right - camera.left) / canvas.clientWidth / camera.zoom;
    const dx = (event.clientX - drag.x) * scale;
    const dz = (event.clientY - drag.y) * scale;
    view.eye.x -= dx; view.focus.x -= dx; view.eye.z -= dz; view.focus.z -= dz;
    drag.x = event.clientX; drag.y = event.clientY;
    updateCamera();
    return;
  }
  rayFrom(event);
  if (raycaster.ray.intersectPlane(dragPlane, worldPoint)) drag.item.root.position.copy(worldPoint).add(drag.offset);
});
async function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const finished = drag;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (finished.type !== 'item') return;
  const item = finished.item;
  const expected = activeItemId();
  if (item.id !== expected) {
    const target = item.home;
    await tween(item, target, 420, item.homeQuaternion);
    document.querySelector('#action-feedback').value = expected ? '请按当前步骤操作高亮组别的器材；其他器材已自动归位。' : '当前阶段无需移动器材。';
    return;
  }
  const group = item.group;
  const target = worldAnchor(group, 'mouth');
  const itemWorld = item.root.getWorldPosition(new THREE.Vector3());
  const closeEnough = Math.hypot(itemWorld.x - target.x, itemWorld.z - target.z) < 2.25 && Math.abs(itemWorld.y - target.y) < 4.2;
  if (!closeEnough) {
    await tween(item, item.home, 420, item.homeQuaternion);
    document.querySelector('#action-feedback').value = '目标未对准瓶口，请拖到对应保温瓶口附近；器材已自动归位。';
    return;
  }
  if (item.id.startsWith('beaker')) await pourSeeds(group);
  else if (item.id.startsWith('thermometer')) await insertThermometer(group);
  else if (item.id.startsWith('stopper')) await sealThermos(group);
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  view.zoom = THREE.MathUtils.clamp(view.zoom * Math.exp(-event.deltaY * .001), .72, 2.75);
  updateCamera();
}, {passive: false});

stepButtons.forEach(button => button.addEventListener('click', () => {
  if (!started || busy) return;
  applySnapshot(Number(button.dataset.step));
}));
document.querySelector('#previous-step').addEventListener('click', () => { if (started && !busy) applySnapshot(step - 1); });
document.querySelector('#next-step').addEventListener('click', () => { if (started && !busy) applySnapshot(step + 1); });
document.querySelector('#start-experiment').addEventListener('click', transferMaterials);
document.querySelector('#advance-time').addEventListener('click', runTemperatureChange);
document.querySelector('#finish-experiment').addEventListener('click', finishExperiment);
document.querySelector('#reset-experiment').addEventListener('click', resetExperiment);
document.querySelector('#reset-view').addEventListener('click', () => {
  view.eye.copy(initialEye);
  view.focus.copy(initialFocus);
  view.zoom = 1.04;
  updateCamera();
});

function restoreState() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('respiration-experiment-3')); } catch {}
  if (!saved?.started) { resetExperiment(); return; }
  if (saved.finished) {
    resetExperiment();
    localStorage.setItem('respiration-experiment-3', JSON.stringify(saved));
    document.querySelector('#start-experiment').hidden = true;
    document.querySelector('#scene-phase').textContent = '实验三已完成';
    document.querySelector('#scene-hint').textContent = '温差证据已记录，器材已归位。';
    document.querySelector('#action-feedback').value = '实验三已完成，器材已归位。';
    return;
  }
  applySnapshot(Number.isFinite(saved.step) ? saved.step : 1);
}

function updateCamera() {
  camera.position.copy(view.eye);
  camera.lookAt(view.focus);
  camera.zoom = view.zoom;
  camera.updateProjectionMatrix();
}
function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const aspect = width / Math.max(height, 1);
  const span = Math.max(38, 19 * aspect);
  camera.left = -span / 2;
  camera.right = span / 2;
  camera.top = span / aspect / 2;
  camera.bottom = -camera.top;
  renderer.setSize(width, height, false);
  updateCamera();
  resizeDetailViews();
}
setupPageControls({
  detailPanel: detail.panel,
  detailButton: document.querySelector('#energy-detail-expand'),
  onLayoutChange: resize,
});
function updateTweens(now) {
  for (let index = tweens.length - 1; index >= 0; index -= 1) {
    const data = tweens[index];
    const progress = THREE.MathUtils.clamp((now - data.started) / data.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    data.item.root.position.lerpVectors(data.from, data.to, eased);
    data.item.root.quaternion.slerpQuaternions(data.fromQ, data.toQ, eased);
    if (progress >= 1) { tweens.splice(index, 1); data.resolve(); }
  }
}
function animate(now) {
  updateTweens(now);
  if (!detail.panel.hidden) syncTemperatureOutputs();
  renderer.render(scene, camera);
  detail.A.renderer.render(detail.A.scene, detail.A.camera);
  detail.B.renderer.render(detail.B.scene, detail.B.camera);
  requestAnimationFrame(animate);
}

function completedSeriesState() { try { return JSON.parse(localStorage.getItem('respiration-experiment-3'))?.finished === true; } catch { return false; } }
async function parkForSeries(animate = true) {
  if (!completedSeriesState()) saveState();
  experimentRun += 1;
  tweens.splice(0).forEach(data => data.resolve());
  drag = null;
  busy = true;
  detail.panel.hidden = true;
  detachAssembly('A');
  detachAssembly('B');
  if (animate) await Promise.all(items.map((item, index) => tween(item, item.origin, 480 + index * 24, item.originQuaternion)));
  else items.forEach(item => { item.root.position.copy(item.origin); item.root.quaternion.copy(item.originQuaternion); });
  busy = false;
}
async function activateFromSeries() {
  if (completedSeriesState()) return;
  if (!started) { await transferMaterials(); return; }
  const savedStep = step;
  busy = true;
  await Promise.all(items.map((item, index) => tween(item, item.home, 520 + index * 26, item.homeQuaternion)));
  busy = false;
  applySnapshot(savedStep);
}
let seriesPrimed = false;
addEventListener('message', async event => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.type === 'series:set-active' && !seriesPrimed) { seriesPrimed = true; if (message.id !== 'energy') await parkForSeries(false); }
  if (message.type === 'series:deactivate') { await parkForSeries(true); window.seriesBridge?.notify('series:deactivated', {id: 'energy', requestId: message.requestId}); }
  if (message.type === 'series:activate') { await activateFromSeries(); window.seriesBridge?.notify('series:activated', {id: 'energy', requestId: message.requestId}); }
});
addEventListener('pagehide', () => { if (!completedSeriesState()) saveState(); });

new ResizeObserver(resize).observe(canvas);
addEventListener('resize', resize);
resize();
restoreState();
requestAnimationFrame(animate);
