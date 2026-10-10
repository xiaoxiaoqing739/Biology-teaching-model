import * as THREE from '../../shared/vendor/three.module.js';
import {createWideMouthBottle} from '../../experiment-oxygen/models/wide-mouth-bottle.js';
import {createGerminatingSeed, createCookedSeed} from '../../experiment-oxygen/models/germinating-seed.js';
import {createDoubleHoleStopper} from '../model-01-stopper/double-hole-stopper.js';
import {createLongStemFunnel} from '../model-02-funnel/long-stem-funnel.js';
import {createDeliveryTube} from '../model-03-delivery-tube/delivery-tube.js';
import {createTestTube} from '../model-04-test-tube/test-tube.js';
import {createLimewaterSystem} from '../model-05-limewater/limewater.js';
import {createWaterBeaker} from '../model-06-water-beaker/water-beaker.js';

const canvas = document.querySelector('#model-canvas');
const status = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x183038);
scene.add(new THREE.HemisphereLight(0xf4ffff, 0x17343a, 2.8));
const key = new THREE.DirectionalLight(0xffffff, 4.3);
key.position.set(-6, 10, 7);
key.castShadow = true;
scene.add(key);
const edge = new THREE.DirectionalLight(0x69eee5, 3.0);
edge.position.set(7, 6, -5);
scene.add(edge);
const table = new THREE.Mesh(new THREE.BoxGeometry(16, .32, 6.5), new THREE.MeshStandardMaterial({color: 0x385f61, roughness: .64, metalness: .12}));
table.position.y = -.18;
table.receiveShadow = true;
scene.add(table);

function createSeedBed(group) {
  const bed = new THREE.Group();
  const positions = [];
  const spacing = .31;
  for (let row = -4; row <= 4; row += 1) {
    for (let column = -4; column <= 4; column += 1) {
      const x = column * spacing + (row % 2 ? spacing / 2 : 0);
      const z = row * spacing * .84;
      if (Math.hypot(x, z) <= 1.17) positions.push([x, z]);
    }
  }
  positions.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  const layerPositions = positions.slice(0, 44);
  for (let layer = 0; layer < 5; layer += 1) {
    layerPositions.forEach(([x, z], index) => {
      const seed = group === 'A' ? createGerminatingSeed() : createCookedSeed();
      seed.scale.setScalar(.14);
      const layerOffsetX = (layer % 2 ? .075 : -.045);
      const layerOffsetZ = ((layer + 1) % 3 - 1) * .045;
      seed.position.set(x + layerOffsetX, .22 + layer * .275, z + layerOffsetZ);
      seed.rotation.set((layer + index) * .17, index * .31 + layer * .23, (layer + index) * .21);
      bed.add(seed);
    });
  }
  bed.name = group === 'A' ? 'germinating-seed-bed' : 'cooked-seed-bed';
  bed.userData = {seedCount: layerPositions.length * 5, layers: 5, layout: 'hexagonal-full-cross-section'};
  return bed;
}

function createLabel(text, color) {
  const element = document.createElement('canvas');
  element.width = 512;
  element.height = 128;
  const context = element.getContext('2d');
  context.fillStyle = 'rgba(8,28,33,.86)';
  context.fillRect(0, 0, 512, 128);
  context.strokeStyle = color;
  context.lineWidth = 7;
  context.strokeRect(5, 5, 502, 118);
  context.fillStyle = '#f1fbf8';
  context.font = '700 48px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, transparent: true, depthWrite: false}));
  sprite.scale.set(2.5, .63, 1);
  return sprite;
}

function createApparatus(group) {
  const root = new THREE.Group();
  root.scale.setScalar(.55);
  const bottle = createWideMouthBottle();
  bottle.add(createSeedBed(group));
  root.add(bottle);

  const stopper = createDoubleHoleStopper();
  const funnel = createLongStemFunnel();
  const mirrored = group === 'A';
  const delivery = createDeliveryTube({mirrored});
  const testTubeGroup = new THREE.Group();
  const testTube = createTestTube();
  const limewater = createLimewaterSystem();
  testTubeGroup.add(testTube, limewater);
  const beaker = createWaterBeaker();
  root.add(stopper, funnel, delivery, testTubeGroup, beaker);

  const direction = mirrored ? -1 : 1;
  const stopperRotation = group === 'B'
    ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
    : new THREE.Quaternion();
  const funnelX = group === 'B' ? -.34 : .34;
  const gasHoleX = group === 'B' ? .34 : -.34;
  const targets = {
    stopper: {position: new THREE.Vector3(0, 4.50, 0), quaternion: stopperRotation},
    funnel: {position: new THREE.Vector3(funnelX, .45, 0), quaternion: new THREE.Quaternion()},
    testTube: {position: new THREE.Vector3(gasHoleX + direction * 2.97, 0, 0), quaternion: new THREE.Quaternion()},
    delivery: {position: new THREE.Vector3(gasHoleX, 3.20, 0), quaternion: new THREE.Quaternion()},
  };
  const homes = {
    stopper: {position: new THREE.Vector3(-1.35, .48, 1.55), quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)},
    funnel: {position: new THREE.Vector3(.20, .20, 1.72), quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)},
    testTube: {position: new THREE.Vector3(direction * 2.15, .31, 1.55), quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -direction * Math.PI / 2)},
    delivery: {position: new THREE.Vector3(direction * .45, .28, 2.0), quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)},
    beaker: {position: new THREE.Vector3(direction * 4.80, 0, 0), quaternion: new THREE.Quaternion()},
  };
  const parts = {stopper, funnel, testTube: testTubeGroup, delivery, beaker};
  for (const [name, object] of Object.entries(parts)) {
    object.position.copy(homes[name].position);
    object.quaternion.copy(homes[name].quaternion);
  }
  return {root, parts, homes, targets};
}

const apparatus = {A: createApparatus('A'), B: createApparatus('B')};
apparatus.A.root.position.x = -3.35;
apparatus.B.root.position.x = 3.35;
scene.add(apparatus.A.root, apparatus.B.root);
const labelA = createLabel('甲组 · 萌发种子', '#6edbd1');
const labelB = createLabel('乙组 · 煮熟种子', '#e4bb62');
labelA.position.set(-3.35, 4.25, 0);
labelB.position.set(3.35, 4.25, 0);
scene.add(labelA, labelB);

const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
const view = {target: new THREE.Vector3(0, 1.55, 0), distance: 13.8, panX: 0};
let activeTweens = [];
let assembling = false;
let assembled = false;

function tweenObject(object, target, duration) {
  return new Promise(resolve => activeTweens.push({object, fromPosition: object.position.clone(), fromQuaternion: object.quaternion.clone(), target, duration, started: performance.now(), resolve}));
}
function tweenBoth(part, duration) {
  return Promise.all(Object.values(apparatus).map(item => tweenObject(item.parts[part], item.targets[part], duration)));
}
async function placeBothFromAbove(part, duration, clearance) {
  const alignDuration = Math.round(duration * .46);
  const lowerDuration = duration - alignDuration;
  await Promise.all(Object.values(apparatus).map(item => {
    const target = item.targets[part];
    return tweenObject(item.parts[part], {
      position: target.position.clone().add(new THREE.Vector3(0, clearance, 0)),
      quaternion: target.quaternion,
    }, alignDuration);
  }));
  await tweenBoth(part, lowerDuration);
}
async function placeFunnelsFromAbove(duration) {
  const liftDuration = Math.round(duration * .28);
  const alignDuration = Math.round(duration * .25);
  const lowerDuration = duration - liftDuration - alignDuration;
  await Promise.all(Object.values(apparatus).map(item => {
    const object = item.parts.funnel;
    return tweenObject(object, {
      position: new THREE.Vector3(object.position.x, item.targets.funnel.position.y + 6.20, object.position.z),
      quaternion: object.quaternion.clone(),
    }, liftDuration);
  }));
  await Promise.all(Object.values(apparatus).map(item => tweenObject(item.parts.funnel, {
    position: item.targets.funnel.position.clone().add(new THREE.Vector3(0, 6.20, 0)),
    quaternion: item.targets.funnel.quaternion,
  }, alignDuration)));
  await tweenBoth('funnel', lowerDuration);
}
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function assemble() {
  if (assembling || assembled) return;
  assembling = true;
  status.textContent = '阶段 1/6：双孔橡胶塞正在压入甲、乙瓶口。';
  await placeBothFromAbove('stopper', 450, 1.10);
  status.textContent = '阶段 2/6：长颈漏斗正在转为竖直并穿过漏斗孔。';
  await placeFunnelsFromAbove(900);
  status.textContent = '阶段 3/6：两支试管正在升起并转为竖直。';
  await placeBothFromAbove('testTube', 500, 1.15);
  status.textContent = '阶段 4/6：弯曲导气管正在升起并校正两端。';
  await placeBothFromAbove('delivery', 550, 1.00);
  status.textContent = '阶段 5/6：导气管两端已分别进入瓶塞孔和试管。';
  await wait(450);
  status.textContent = '阶段 6/6：正在检查器材间距，注水烧杯仍在材料位置。';
  await wait(200);
  assembling = false;
  assembled = true;
  status.textContent = '两套装置组装完成。尚未注水，石灰水保持澄清且没有气泡。';
}
function reset() {
  activeTweens.splice(0).forEach(tween => tween.resolve());
  assembling = assembled = false;
  for (const item of Object.values(apparatus)) {
    for (const [name, object] of Object.entries(item.parts)) {
      object.position.copy(item.homes[name].position);
      object.quaternion.copy(item.homes[name].quaternion);
    }
  }
  status.textContent = '两组瓶内种子已经准备好。点击“一键组装”只完成装置连接，不自动注水。';
}
document.querySelector('#assemble').addEventListener('click', assemble);
document.querySelector('#reset').addEventListener('click', reset);
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  view.distance = THREE.MathUtils.clamp(view.distance + event.deltaY * .008, 10.5, 20);
}, {passive: false});
let pan = null;
canvas.addEventListener('pointerdown', event => { if (event.target === canvas) { pan = {id: event.pointerId, x: event.clientX, start: view.panX}; canvas.setPointerCapture(event.pointerId); } });
canvas.addEventListener('pointermove', event => { if (pan?.id === event.pointerId) view.panX = THREE.MathUtils.clamp(pan.start - (event.clientX - pan.x) * .012, -3, 3); });
canvas.addEventListener('pointerup', event => { if (pan?.id === event.pointerId) pan = null; });
function resize() {
  const width = canvas.clientWidth;
  const height = Math.max(canvas.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

function render(now) {
  const target = view.target.clone();
  target.x += view.panX;
  const minimum = 10.5 / Math.max(camera.aspect, .42);
  const distance = Math.max(view.distance, minimum);
  camera.position.set(target.x + distance * .22, target.y + distance * .18, distance * .98);
  camera.lookAt(target);
  activeTweens = activeTweens.filter(tween => {
    const progress = THREE.MathUtils.clamp((now - tween.started) / tween.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    tween.object.position.lerpVectors(tween.fromPosition, tween.target.position, eased);
    tween.object.quaternion.slerpQuaternions(tween.fromQuaternion, tween.target.quaternion, eased);
    if (progress >= 1) { tween.resolve(); return false; }
    return true;
  });
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
