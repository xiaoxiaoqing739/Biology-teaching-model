import * as THREE from '../shared/vendor/three.module.js';
import {createRespirationBench, RESPIRATION_BENCH_PLAN} from '../shared/bench/respiration-bench.js';
import {createWideMouthBottle} from '../experiment-oxygen/models/wide-mouth-bottle.js';
import {createGerminatingSeed, createCookedSeed} from '../experiment-oxygen/models/germinating-seed.js';
import {createDoubleHoleStopper} from '../experiment-two-models/model-01-stopper/double-hole-stopper.js';
import {createLongStemFunnel} from '../experiment-two-models/model-02-funnel/long-stem-funnel.js';
import {createDeliveryTube} from '../experiment-two-models/model-03-delivery-tube/delivery-tube.js';
import {createTestTube} from '../experiment-two-models/model-04-test-tube/test-tube.js';
import {createLimewaterSystem} from '../experiment-two-models/model-05-limewater/limewater.js';
import {createWaterBeaker, createWaterStream} from '../experiment-two-models/model-06-water-beaker/water-beaker.js';
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
populateStorageCatalog(scene, bench, 'carbon-dioxide');
function addBenchFrontLabel(text,x,color){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='rgba(6,25,30,.96)';ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(6,6,500,116);ctx.fillStyle='#f4fffc';ctx.font='700 58px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,.70),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));mesh.position.set(x,-.50,14.22);mesh.renderOrder=8;scene.add(mesh)}
addBenchFrontLabel('甲组',-4.55,'#70d6d0');addBenchFrontLabel('乙组',4.55,'#9ca7f3');
const carbonZone = bench.zones.find(zone => zone.id === 'carbon-dioxide');
const carbonPlan = RESPIRATION_BENCH_PLAN.find(zone => zone.id === 'carbon-dioxide');
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const invisible = () => new THREE.MeshBasicMaterial({transparent: true, opacity: .001, depthWrite: false});
const tweens = [];
const items = [];
const itemMap = {};
let started = false;
let busy = false;
let assembled = false;
let step = 0;
let lifecycleToken = 0;
let drag = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const cameraDirection = new THREE.Vector3();
const worldPoint = new THREE.Vector3();

function createSeedBed(group) {
  const bed = new THREE.Group();
  const positions = [];
  const spacing = .31;
  for (let row = -4; row <= 4; row += 1) for (let column = -4; column <= 4; column += 1) {
    const x = column * spacing + (row % 2 ? spacing / 2 : 0);
    const z = row * spacing * .84;
    if (Math.hypot(x, z) <= 1.17) positions.push([x, z]);
  }
  positions.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  for (let layer = 0; layer < 5; layer += 1) positions.slice(0, 44).forEach(([x, z], index) => {
    const seed = group === 'A' ? createGerminatingSeed() : createCookedSeed();
    seed.scale.setScalar(.14);
    seed.position.set(x + (layer % 2 ? .075 : -.045), .22 + layer * .275, z + ((layer + 1) % 3 - 1) * .045);
    seed.rotation.set((layer + index) * .17, index * .31 + layer * .23, (layer + index) * .21);
    bed.add(seed);
  });
  return bed;
}

function bottleAsset(group) {
  const root = new THREE.Group();
  const bottle = createWideMouthBottle();
  bottle.add(createSeedBed(group));
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.20,1.20,1,64),new THREE.MeshPhysicalMaterial({color:0x9ddce8,roughness:.08,transmission:.62,transparent:true,opacity:.42,depthWrite:false}));
  water.name=`bottle-water-${group}`;water.position.y=.10;water.scale.y=.001;water.visible=false;bottle.add(water);
  root.add(bottle);
  return root;
}
function testTubeAsset() {
  const root = new THREE.Group();
  root.add(createTestTube(), createLimewaterSystem());
  return root;
}
function makeAsset(model, scale = .55) {
  const root = new THREE.Group();
  model.scale.setScalar(scale);
  root.add(model);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.4, 1.7), invisible());
  hit.position.y = 1.0;
  root.add(hit);
  return root;
}
const slot = (index, dx = 0, dz = 0) => {
  const data = carbonPlan.slots[index];
  return V(carbonZone.center + data[2] + dx, .03, data[3] + dz);
};
const homes = {
  bottleA: V(-3.05, .03, 10.45), stopperA: V(-4.35, .03, 12.55), funnelA: V(-3.35, .03, 12.55), deliveryA: V(-1.95, .03, 12.45), testTubeA: V(-5.25, .03, 10.45), beakerA: V(-6.20, .03, 10.45),
  bottleB: V(3.05, .03, 10.45), stopperB: V(4.35, .03, 12.55), funnelB: V(3.35, .03, 12.55), deliveryB: V(1.95, .03, 12.45), testTubeB: V(5.25, .03, 10.45), beakerB: V(6.20, .03, 10.45),
};
const origins = {
  bottleA: V(carbonZone.center-3.35,.03,-1.68), bottleB: V(carbonZone.center+1.78,.03,-1.68),
  testTubeA: V(carbonZone.center-1.55,.03,-1.58), testTubeB: V(carbonZone.center+3.63,.03,-1.58),
  deliveryA: V(carbonZone.center-1.18,.03,.36), deliveryB: V(carbonZone.center+1.14,.03,.36),
  stopperA: V(carbonZone.center-3.55,.03,2.30), stopperB: V(carbonZone.center-2.55,.03,2.30),
  funnelA: V(carbonZone.center-.90,.03,2.28), funnelB: V(carbonZone.center+.25,.03,2.28),
  beakerA: V(carbonZone.center+2.70,.03,2.20), beakerB: V(carbonZone.center+3.72,.03,2.20),
};

function register(id, root, group, homeRotation = new THREE.Euler()) {
  root.position.copy(origins[id]);
  root.rotation.copy(homeRotation);
  scene.add(root);
  const item = {id, root, group, origin: origins[id].clone(), originQuaternion: root.quaternion.clone(), home: homes[id].clone(), homeQuaternion: root.quaternion.clone()};
  root.traverse(object => { object.userData.dragItem = item; });
  items.push(item);
  itemMap[id] = item;
  return item;
}
register('bottleA', makeAsset(bottleAsset('A')), 'A');
register('bottleB', makeAsset(bottleAsset('B')), 'B');
register('stopperA', makeAsset(createDoubleHoleStopper()), 'A', new THREE.Euler(0, 0, Math.PI / 2));
register('stopperB', makeAsset(createDoubleHoleStopper()), 'B', new THREE.Euler(0, Math.PI, Math.PI / 2));
register('funnelA', makeAsset(createLongStemFunnel()), 'A', new THREE.Euler(0, 0, Math.PI / 2));
register('funnelB', makeAsset(createLongStemFunnel()), 'B', new THREE.Euler(0, 0, Math.PI / 2));
register('deliveryA', makeAsset(createDeliveryTube({mirrored: true})), 'A', new THREE.Euler(Math.PI / 2, 0, 0));
register('deliveryB', makeAsset(createDeliveryTube()), 'B', new THREE.Euler(Math.PI / 2, 0, 0));
register('testTubeA', makeAsset(testTubeAsset()), 'A', new THREE.Euler(0, 0, Math.PI / 2));
register('testTubeB', makeAsset(testTubeAsset()), 'B', new THREE.Euler(0, 0, -Math.PI / 2));
register('beakerA', makeAsset(createWaterBeaker()), 'A');
register('beakerB', makeAsset(createWaterBeaker()), 'B');
const waterStream = createWaterStream();
scene.add(waterStream);
function createDetailView(canvas){
  const detailRenderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});detailRenderer.setPixelRatio(Math.min(devicePixelRatio,2));detailRenderer.outputColorSpace=THREE.SRGBColorSpace;detailRenderer.toneMapping=THREE.ACESFilmicToneMapping;detailRenderer.toneMappingExposure=renderer.toneMappingExposure;
  const detailScene=new THREE.Scene();detailScene.background=new THREE.Color(0x1b2a31);detailScene.add(new THREE.HemisphereLight(0xf2f8f6,0x34424b,2.65));const light=new THREE.DirectionalLight(0xfff1d9,3.4);light.position.set(-8,16,8);detailScene.add(light);const detailFill=new THREE.DirectionalLight(0xbde9f8,1.75);detailFill.position.set(8,10,-8);detailScene.add(detailFill);
  const apparatus=new THREE.Group(),tube=createTestTube(),lime=createLimewaterSystem();apparatus.add(tube,lime);const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,2.28,20),new THREE.MeshPhysicalMaterial({color:0xc6eeeb,transmission:.7,transparent:true,opacity:.52,depthWrite:false}));pipe.position.y=1.45;apparatus.add(pipe);apparatus.scale.setScalar(1.18);detailScene.add(apparatus);
  const detailCamera=new THREE.PerspectiveCamera(27,1,.1,30);detailCamera.position.set(1.8,1.75,6.5);detailCamera.lookAt(0,1.25,0);
  return {renderer:detailRenderer,scene:detailScene,camera:detailCamera,lime,progress:0,active:false,done:false};
}
const detail={panel:document.querySelector('#co2-detail'),status:document.querySelector('#co2-detail-status'),A:createDetailView(document.querySelector('#co2-detail-a')),B:createDetailView(document.querySelector('#co2-detail-b'))};
function resizeDetailViews(){for(const group of ['A','B']){const data=detail[group],w=Math.max(data.renderer.domElement.clientWidth,220),h=Math.max(data.renderer.domElement.clientHeight,150);data.renderer.setSize(w,h,false);data.camera.aspect=w/h;data.camera.updateProjectionMatrix()}}
function updateDetail(group,progress,active=true){detail.panel.hidden=false;resizeDetailViews();requestAnimationFrame(resizeDetailViews);detail[group].progress=progress;detail[group].active=active;detail.status.textContent=active?`${group==='A'?'甲':'乙'}组正在通气`:'甲乙现象保持对比'}
function enhanceLime(model,group,progress){const reaction=group==='A'?THREE.MathUtils.smoothstep(progress,.08,.88):0,parts=model.userData.components;if(group==='A'){parts.body.material.color.set(0xebe8dc);parts.body.material.opacity=THREE.MathUtils.lerp(.30,.80,reaction);parts.body.material.transmission=THREE.MathUtils.lerp(.74,.12,reaction);parts.surface.material.color.set(0xf0ede2);parts.surface.material.opacity=THREE.MathUtils.lerp(.34,.76,reaction);parts.particles.material.color.set(0xe7e4da);parts.particles.material.opacity=reaction*.74}for(const bubble of parts.bubbles){if(bubble.mesh.visible)bubble.mesh.scale.multiplyScalar(2.4)}}

function tween(item, to, duration, toQ = new THREE.Quaternion()) {
  return new Promise(resolve => tweens.push({item, from: item.root.position.clone(), to: to.clone(), fromQ: item.root.quaternion.clone(), toQ, started: performance.now(), duration, resolve}));
}
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const stepButtons = [...document.querySelectorAll('#co2-step-buttons button')];
const steps = [
  ['材料进入操作台','甲乙两组器材分别进入操作区。','甲乙两组'],
  ['一键组装实验装置','点击“一键组装”，器材依次从上向下完成连接。','甲乙两组'],
  ['在温暖处静置24小时','点击右侧“24小时后”，观察从中午12点到次日中午12点的时间变化。','两组同步'],
  ['向甲组漏斗缓慢注水','拖动甲组烧杯到甲组漏斗上方松手，使瓶内气体进入石灰水。','甲组'],
  ['向乙组漏斗缓慢注水','拖动乙组烧杯到乙组漏斗上方松手，完成相同操作。','乙组'],
  ['比较甲、乙两组现象','甲组石灰水浑浊，乙组仍澄清；现象将持续保留。','现象对比'],
  ['结束实验并归位','点击“结束归位”，全部器材返回后方材料台。','完成实验'],
];
function saveExperimentState(){localStorage.setItem('respiration-experiment-2',JSON.stringify({started,assembled,step,finished:false}))}
function setStep(next) {
  step = next;
  const data = steps[step];
  document.querySelector('#step-number').textContent = `第 ${step + 1} 步 / 7`;
  document.querySelector('#step-title').textContent = data[0];
  document.querySelector('#step-instruction').textContent = data[1];
  document.querySelector('#group-badge').textContent = data[2];
  document.querySelector('#scene-phase').textContent = data[0];
  document.querySelector('#scene-hint').textContent = data[1];
  stepButtons.forEach((button,index)=>{button.classList.toggle('active',index===step);button.classList.toggle('done',index<step);button.disabled=!(index===1&&step===1)&&!(index===6&&step===5)});
  document.querySelector('#advance-day').disabled=step!==2||busy;
  saveExperimentState();
}
function updateTime(hour){const normalized=((hour%24)+24)%24,whole=Math.floor(normalized),minutes=Math.floor((normalized-whole)*60);document.querySelector('#time-output').value=`${String(whole).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;bench.dayNightWindow.setHour(normalized)}
async function runDay(){if(step!==2||busy)return;const token=lifecycleToken;busy=true;document.querySelector('#advance-day').disabled=true;document.querySelector('#action-feedback').value='真实实验需静置24小时；网页正在压缩演示昼夜变化。';const startedAt=performance.now(),duration=8000;await new Promise(resolve=>{const tick=now=>{if(token!==lifecycleToken){resolve();return}const p=THREE.MathUtils.clamp((now-startedAt)/duration,0,1);updateTime(12+p*24);if(p<1)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)});if(token!==lifecycleToken)return;updateTime(12);busy=false;document.querySelector('#action-feedback').value='已到次日中午12:00，请先进行甲组注水排气。';setStep(3)}
function apparatusTarget(group, part) {
  const bottle = itemMap[`bottle${group}`].home;
  const isA = group === 'A';
  const local = {
    stopper: V(0,4.50,0),
    funnel: V(isA ? .34 : -.34,.45,0),
    delivery: V(isA?-.34:.34,3.20,0),
    testTube: V(isA?-3.31:3.31,0,0),
  }[part].multiplyScalar(.55);
  const quaternion = part==='stopper'&&group==='B' ? new THREE.Quaternion().setFromAxisAngle(V(0,1,0),Math.PI) : new THREE.Quaternion();
  return {position:bottle.clone().add(local),quaternion};
}
async function lowerPart(part, clearance, duration) {
  const pair=['A','B'].map(group=>({item:itemMap[`${part}${group}`],target:apparatusTarget(group,part)}));
  await Promise.all(pair.map(({item,target})=>tween(item,target.position.clone().add(V(0,clearance,0)),duration*.42,target.quaternion)));
  await Promise.all(pair.map(({item,target})=>tween(item,target.position,duration*.58,target.quaternion)));
}
async function assembleApparatus() {
  if(!started||assembled||busy||step!==1)return;
  const token=lifecycleToken;
  busy=true;document.querySelector('#action-feedback').value='双孔塞、漏斗、试管和导气管正在依次由上向下组装……';
  await lowerPart('stopper',1.0,700);if(token!==lifecycleToken)return;await lowerPart('funnel',3.4,1050);if(token!==lifecycleToken)return;await lowerPart('testTube',1.0,700);if(token!==lifecycleToken)return;await lowerPart('delivery',1.0,850);if(token!==lifecycleToken)return;
  assembled=true;busy=false;document.querySelector('#action-feedback').value='两套装置组装完成，请先静置24小时。';setStep(2);
}
function findModel(item,name){return item.root.getObjectByName(name)}
function limewater(group){return findModel(itemMap[`testTube${group}`],'experiment-two-limewater-system')}
function beakerModel(group){return findModel(itemMap[`beaker${group}`],'experiment-two-water-beaker')}
function bottleWater(group){return findModel(itemMap[`bottle${group}`],`bottle-water-${group}`)}
function setBottleWater(group,progress){const water=bottleWater(group),height=2.15*THREE.MathUtils.clamp(progress,0,1);water.visible=height>.01;water.scale.y=Math.max(height,.001);water.position.y=.10+height/2}
function funnelTarget(group){const model=findModel(itemMap[`funnel${group}`],'experiment-two-long-stem-funnel');model.updateWorldMatrix(true,true);const target=new THREE.Vector3();model.userData.anchors.waterTarget.getWorldPosition(target);return target}
async function pourGroup(group){
  if(busy||!assembled||step!==(group==='A'?3:4))return;
  const token=lifecycleToken;
  busy=true;const item=itemMap[`beaker${group}`],model=beakerModel(group),target=funnelTarget(group),side=group==='A'?-1:1;
  const pourPosition=target.clone().add(V(side*.84,.72,0));
  document.querySelector('#action-feedback').value=`${group==='A'?'甲':'乙'}组烧杯正在对准漏斗并缓慢注水……`;
  await tween(item,pourPosition,620,new THREE.Quaternion().setFromAxisAngle(V(0,0,1),side<0?-.98:.98));
  if(token!==lifecycleToken)return;
  const start=performance.now(),duration=4800,streamStart=new THREE.Vector3(),direction=new THREE.Vector3();
  limewater(group).userData.start(group,start);
  detail[group].lime.userData.start(group,start);
  updateDetail(group,0,true);
  await new Promise(resolve=>{const frame=now=>{if(token!==lifecycleToken){resolve();return}const p=THREE.MathUtils.clamp((now-start)/duration,0,1),flow=Math.sin(Math.PI*p);model.userData.setPourState((side<0?-1:1)*1.02,p);model.userData.anchors.streamOrigin.getWorldPosition(streamStart);direction.set(side<0?1:-1,0,0).applyQuaternion(item.root.quaternion).normalize();waterStream.userData.update(streamStart,target,flow,now-start,direction);setBottleWater(group,p);updateDetail(group,p,true);if(p<1)requestAnimationFrame(frame);else resolve()};requestAnimationFrame(frame)});if(token!==lifecycleToken){waterStream.userData.hide();return}
  waterStream.userData.hide();model.userData.setFillProgress(1);limewater(group).userData.state.nextSpawn=Infinity;detail[group].lime.userData.state.nextSpawn=Infinity;detail[group].active=false;detail[group].done=true;updateDetail(group,1,false);await tween(item,item.home,620,item.homeQuaternion);busy=false;
  const status=document.querySelector(`#status-${group.toLowerCase()}`);status.classList.add('complete');status.querySelector('span').textContent=group==='A'?'石灰水明显变浑浊':'石灰水保持澄清';
  document.querySelector('#action-feedback').value=group==='A'?'甲组气泡持续产生，澄清石灰水逐渐变浑浊。请继续乙组。':'乙组有气泡产生，但石灰水保持澄清。两组现象将持续保留。';setStep(group==='A'?4:5);
}
async function finishExperiment(){if(step!==5||busy)return;busy=true;step=6;document.querySelector('#action-feedback').value='实验结束，全部器材正在返回后方材料台……';limewater('A').userData.reset();limewater('B').userData.reset();detail.panel.hidden=true;for(const group of ['A','B']){setBottleWater(group,0);detail[group].progress=0;detail[group].active=detail[group].done=false}await Promise.all(items.map((item,index)=>tween(item,item.origin,650+index*28,item.originQuaternion)));started=false;assembled=false;busy=false;localStorage.setItem('respiration-experiment-2',JSON.stringify({started:true,finished:true,step:6}));document.querySelector('#step-number').textContent='完成';document.querySelector('#step-title').textContent='实验二已完成';document.querySelector('#step-instruction').textContent='甲乙两组器材均已回到后方材料台。';document.querySelector('#scene-phase').textContent='实验二已完成';document.querySelector('#scene-hint').textContent='甲乙两组器材已归回后方材料台。';document.querySelector('#action-feedback').value='实验二已完成，器材已归位。';for(const id of ['status-a','status-b']){const element=document.querySelector(`#${id}`);element.classList.remove('complete');element.querySelector('span').textContent='后方材料台'}stepButtons.forEach((button,index)=>{button.disabled=true;button.classList.toggle('done',index<=6);button.classList.remove('active')})}
async function transferMaterials() {
  if (started || busy) return;
  busy = true;
  document.querySelector('#start-experiment').hidden = true;
  document.querySelector('#scene-phase').textContent = '材料转移中';
  document.querySelector('#scene-hint').textContent = '甲乙两组材料正在进入前方对应操作区。';
  document.querySelector('#action-feedback').value = '器材按组别转移，路径互不交叉……';
  await Promise.all(items.map((item, index) => tween(item, item.home, 650 + index * 35)));
  started = true;
  busy = false;
  document.querySelector('#scene-phase').textContent = '实验二材料已就位';
  document.querySelector('#scene-hint').textContent = '甲乙两组器材保持独立，可拖动检查位置；尚未组装。';
  document.querySelector('#step-number').textContent = '第 1 步';
  document.querySelector('#step-title').textContent = '材料进入操作台';
  document.querySelector('#step-instruction').textContent = '两组材料已分区摆放。下一阶段将接入一键组装。';
  document.querySelector('#action-feedback').value = '12件独立器材已转移完成';
  for (const id of ['status-a', 'status-b']) {
    const element = document.querySelector(`#${id}`);
    element.classList.add('complete');
    element.querySelector('span').textContent = '前方操作台';
  }
  setStep(1);
}
function resetExperiment() {
  tweens.splice(0).forEach(data => data.resolve());
  started = busy = assembled = false;step=0;waterStream.userData.hide();
  for(const group of ['A','B']){limewater(group).userData.reset();detail[group].lime.userData.reset();beakerModel(group).userData.setFillProgress(0);setBottleWater(group,0);detail[group].progress=0;detail[group].active=detail[group].done=false}detail.panel.hidden=true;
  items.forEach(item => { item.root.position.copy(item.origin); item.root.quaternion.copy(item.originQuaternion); });
  document.querySelector('#start-experiment').hidden = false;
  document.querySelector('#scene-phase').textContent = '准备实验二';
  document.querySelector('#scene-hint').textContent = '现有材料已摆放在后方实验二材料区。';
  document.querySelector('#action-feedback').value = '现有12件独立器材已摆放在实验二材料区';
  for (const id of ['status-a', 'status-b']) {
    const element = document.querySelector(`#${id}`);
    element.classList.remove('complete');
    element.querySelector('span').textContent = '后方材料区';
  }
  localStorage.removeItem('respiration-experiment-2');
  setStep(0);
}
function rayFrom(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}
canvas.addEventListener('pointerdown', event => {
  rayFrom(event);
  if (started && !busy) {
    const hit = raycaster.intersectObjects(items.map(item => item.root), true).find(result => result.object.userData.dragItem);
    if (hit) {
      const item = hit.object.userData.dragItem;
      const activeBeaker=(step===3?'beakerA':step===4?'beakerB':null);
      if(assembled&&item.id!==activeBeaker){document.querySelector('#action-feedback').value=activeBeaker?'装置已经固定，请只拖动当前组的注水烧杯。':'装置已经固定，当前阶段不需要移动器材。';return}
      camera.getWorldDirection(cameraDirection);
      dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, item.root.position);
      raycaster.ray.intersectPlane(dragPlane, worldPoint);
      drag = {id: event.pointerId, type: 'item', item, offset: item.root.position.clone().sub(worldPoint)};
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
    drag.x = event.clientX; drag.y = event.clientY; updateCamera(); return;
  }
  rayFrom(event);
  if (raycaster.ray.intersectPlane(dragPlane, worldPoint)) drag.item.root.position.copy(worldPoint).add(drag.offset);
});
async function endDrag(event) { if (!drag || drag.id !== event.pointerId) return; const finished=drag;drag = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);if(finished.type!=='item')return;const item=finished.item,near=(group)=>{const target=funnelTarget(group),dx=item.root.position.x-target.x,dz=item.root.position.z-target.z;return Math.hypot(dx,dz)<4.2};if(item.id==='beakerA'&&step===3&&near('A')){await pourGroup('A');return}if(item.id==='beakerB'&&step===4&&near('B')){await pourGroup('B');return}await tween(item,item.home,420,item.homeQuaternion);document.querySelector('#action-feedback').value=step===3?'请将甲组烧杯拖到甲组漏斗正上方。':step===4?'请将乙组烧杯拖到乙组漏斗正上方。':'当前步骤不需要移动该器材。'; }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', event => { event.preventDefault(); view.zoom = THREE.MathUtils.clamp(view.zoom * Math.exp(-event.deltaY * .001), .72, 2.75); updateCamera(); }, {passive: false});
function restoreExperimentState() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('respiration-experiment-2')); } catch {}
  if (!saved?.started) { resetExperiment(); return; }
  if(saved.finished){resetExperiment();localStorage.setItem('respiration-experiment-2',JSON.stringify(saved));document.querySelector('#start-experiment').hidden=true;document.querySelector('#scene-phase').textContent='实验二已完成';document.querySelector('#scene-hint').textContent='甲乙两组器材已归回后方材料台。';document.querySelector('#action-feedback').value='实验二已完成，器材已归位。';stepButtons.forEach(button=>button.disabled=true);return}
  items.forEach(item => { item.root.position.copy(item.home); item.root.quaternion.identity(); });
  started = true;
  document.querySelector('#start-experiment').hidden = true;
  document.querySelector('#scene-phase').textContent = '实验二材料已就位';
  document.querySelector('#scene-hint').textContent = '已恢复实验二的器材状态，可继续操作。';
  document.querySelector('#action-feedback').value = '已恢复上次实验状态';
  for (const id of ['status-a', 'status-b']) { const element = document.querySelector(`#${id}`); element.classList.add('complete'); element.querySelector('span').textContent = '前方操作台'; }
  if(saved.assembled){assembled=true;for(const group of ['A','B'])for(const part of ['stopper','funnel','testTube','delivery']){const target=apparatusTarget(group,part),item=itemMap[`${part}${group}`];item.root.position.copy(target.position);item.root.quaternion.copy(target.quaternion)}}
  if(saved.step>=3)updateTime(12);
  if(saved.step>=4){beakerModel('A').userData.setFillProgress(1);setBottleWater('A',1);limewater('A').userData.start('A',performance.now()-10000);detail.A.lime.userData.start('A',performance.now()-10000);detail.A.progress=1;detail.A.done=true;detail.panel.hidden=false;const status=document.querySelector('#status-a');status.classList.add('complete');status.querySelector('span').textContent='石灰水明显变浑浊'}
  if(saved.step>=5){beakerModel('B').userData.setFillProgress(1);setBottleWater('B',1);limewater('B').userData.start('B',performance.now()-10000);detail.B.lime.userData.start('B',performance.now()-10000);detail.B.progress=1;detail.B.done=true;detail.panel.hidden=false;const status=document.querySelector('#status-b');status.classList.add('complete');status.querySelector('span').textContent='石灰水保持澄清'}
  if(!detail.panel.hidden){detail.status.textContent=saved.step>=5?'甲乙现象保持对比':'甲组反应结果保持';resizeDetailViews();requestAnimationFrame(resizeDetailViews)}
  setStep(saved.step||1);
}
document.querySelector('#start-experiment').addEventListener('click', transferMaterials);
document.querySelector('#assemble-apparatus').addEventListener('click',assembleApparatus);
document.querySelector('#finish-experiment').addEventListener('click',finishExperiment);
document.querySelector('#advance-day').addEventListener('click',runDay);
document.querySelector('#reset-experiment').addEventListener('click', resetExperiment);
document.querySelector('#reset-view').addEventListener('click', () => { view.eye.copy(initialEye); view.focus.copy(initialFocus); view.zoom = 1.04; updateCamera(); });

function updateCamera() { camera.position.copy(view.eye); camera.lookAt(view.focus); camera.zoom = view.zoom; camera.updateProjectionMatrix(); }
function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const aspect = width / Math.max(height, 1);
  const span = Math.max(38, 19 * aspect);
  camera.left = -span / 2; camera.right = span / 2; camera.top = span / aspect / 2; camera.bottom = -camera.top;
  renderer.setSize(width, height, false); updateCamera();
  for(const group of ['A','B']){const data=detail[group],w=Math.max(data.renderer.domElement.clientWidth,1),h=Math.max(data.renderer.domElement.clientHeight,1);data.renderer.setSize(w,h,false);data.camera.aspect=w/h;data.camera.updateProjectionMatrix()}
}
setupPageControls({detailPanel:detail.panel,detailButton:document.querySelector('#co2-detail-expand'),onLayoutChange:()=>{resize();resizeDetailViews()}});
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
function animate(now) { updateTweens(now);for(const group of ['A','B']){const main=limewater(group),data=detail[group];main.userData.update(now);data.lime.userData.update(now);enhanceLime(main,group,data.progress);enhanceLime(data.lime,group,data.progress);data.renderer.render(data.scene,data.camera)}renderer.render(scene, camera); requestAnimationFrame(animate); }
function completedSeriesState(){try{return JSON.parse(localStorage.getItem('respiration-experiment-2'))?.finished===true}catch{return false}}
async function parkForSeries(animate=true){if(!completedSeriesState())saveExperimentState();lifecycleToken++;tweens.splice(0).forEach(data=>data.resolve());drag=null;busy=true;waterStream.userData.hide();detail.panel.hidden=true;if(animate)await Promise.all(items.map((item,index)=>tween(item,item.origin,480+index*20,item.originQuaternion)));else items.forEach(item=>{item.root.position.copy(item.origin);item.root.quaternion.copy(item.originQuaternion)});busy=false}
async function activateFromSeries(){if(completedSeriesState())return;if(!started){await transferMaterials();return}await Promise.all(items.map((item,index)=>tween(item,item.home,520+index*22,item.homeQuaternion)));restoreExperimentState()}
let seriesPrimed=false;
addEventListener('message',async event=>{const message=event.data;if(!message||typeof message!=='object')return;if(message.type==='series:set-active'&&!seriesPrimed){seriesPrimed=true;if(message.id!=='carbon-dioxide')await parkForSeries(false)}if(message.type==='series:deactivate'){await parkForSeries(true);window.seriesBridge?.notify('series:deactivated',{id:'carbon-dioxide',requestId:message.requestId})}if(message.type==='series:activate'){await activateFromSeries();window.seriesBridge?.notify('series:activated',{id:'carbon-dioxide',requestId:message.requestId})}});
addEventListener('pagehide',()=>{if(!completedSeriesState())saveExperimentState()});
new ResizeObserver(resize).observe(canvas);
addEventListener('resize', resize);
resize();
restoreExperimentState();
requestAnimationFrame(animate);
