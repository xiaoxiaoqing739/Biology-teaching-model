import { createMicroscope } from './model.js?v=20260922-2320';
import { opticalState, applyMechanicalLimit, canRotateTurret, moveSlide, clamp } from './physics.mjs';

export const state={mode:'explore',power:false,objective:10,eyepiece:10,coarse:5,fine:0,aperture:3,intensity:50,condenser:75,ipd:64,diopter:0,specimen:'none',slideX:0,slideY:0};
const initial={...state};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const info={
  base:['镜座','承托整台显微镜，内部容纳电光源。','搬运时一手握镜臂，另一手托住镜座。'],
  arm:['镜臂','连接镜座与镜筒，是显微镜的主要支撑结构。','搬运时握住此处，保持镜身直立。'],
  tube:['双目镜筒','将物镜形成的光路分配到左右目镜。','观察时双眼同时睁开，保持自然坐姿。'],
  eyepiece:['目镜','进一步放大物镜形成的实像。','点击可循环切换 5×、10×、16×。'],
  ipd:['瞳距调节','使左右目镜间距适合观察者双眼。','调到两个圆形视野完全重合。'],
  diopter:['视度环','补偿左右眼屈光差异，使双眼同时清晰。','先单眼调焦，再转动左目视度环。'],
  turret:['转换器','安装并切换不同倍率的物镜。','握转换器边缘转动，听到定位声后停止。'],
  objective:['物镜','形成标本的放大实像，是主要放大部件。','先低倍找像并居中，再换高倍观察。'],
  coarse:['粗准焦螺旋','使载物台较大幅度升降，快速寻找物像。','高倍观察时通常不再使用粗准焦。'],
  fine:['细准焦螺旋','使载物台小幅升降，精细调节清晰度。','换高倍后用它获得最清晰物像。'],
  stage:['机械载物台','承放玻片，并配合机械装置移动标本。','玻片应平放，标本正对通光孔。'],
  hole:['通光孔','让下方光线穿过玻片标本。','装片时把观察材料对准孔中央。'],
  clips:['压片夹','固定玻片，防止观察时滑动。','放片时轻抬夹头，避免玻片崩裂。'],
  xy:['横纵手轮','精确控制玻片前后、左右移动。','玻片移动方向与视野中物像方向相反。'],
  condenser:['聚光镜','汇聚光线并照明标本。','固定在最顶端，不可调节。'],
  diaphragm:['光圈','控制进入物镜的光线量和对比度。','低倍可适当缩小，高倍通常需要更大光圈。'],
  carriage:['升降机构','通过齿条与小齿轮带动载物台升降。','调焦轮转动时可观察内部齿轮联动。'],
  slide:['玻片标本','承载待观察的薄而透明的生物材料。','材料过厚会导致透光不足、难以成像。'],
  lamp:['光源','从下方提供稳定的透射照明。','先开电源，再调节亮度和光圈。'],
  power:['电源开关','控制内置电光源通断，并可调节亮度。','观察结束后关闭电源。']
};
const ids=Object.keys(info);let selected=null,toastTimer,model;

// 原生全屏优先；iOS 等不支持页面全屏的环境使用动态视口沉浸式回退。
let fallbackFullscreen=false;
const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
function syncViewport(){document.documentElement.style.setProperty('--app-height',`${Math.round(window.visualViewport?.height||window.innerHeight)}px`)}
function syncFullscreenUI(){const active=Boolean(fullscreenElement()||fallbackFullscreen);document.body.classList.toggle('is-fullscreen',active);$('#fullscreenBtn').textContent=active?'退出全屏':'全屏';$('#fullscreenBtn').setAttribute('aria-pressed',String(active));syncViewport()}
async function toggleFullscreen(){
  if(fullscreenElement()){
    if(document.exitFullscreen)await document.exitFullscreen();else if(document.webkitExitFullscreen)document.webkitExitFullscreen();
    return;
  }
  if(fallbackFullscreen){fallbackFullscreen=false;syncFullscreenUI();return}
  try{
    if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});
    else if(document.documentElement.webkitRequestFullscreen)document.documentElement.webkitRequestFullscreen();
    else{fallbackFullscreen=true;syncFullscreenUI()}
  }catch{fallbackFullscreen=true;syncFullscreenUI()}
}

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800)}
function selectPart(id){if(state.mode!=='explore'||!info[id]){selected=null;$('#infoCard').hidden=true;$('#partLabel').hidden=true;return}selected=id;const [name,desc,tip]=info[id];$('#partCount').textContent=`部件 ${ids.indexOf(id)+1} / ${ids.length}`;$('#partName').textContent=name;$('#partDesc').textContent=desc;$('#partTip').textContent=tip;$('#infoCard').hidden=false;$('#partLabel').textContent=name;$('#partLabel').hidden=false}
function switchPanel(name){$$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));$$('[data-panel]').forEach(x=>x.classList.toggle('active',x.dataset.panel===name));if(name==='focus'&&['ipd','diopter'].includes(selected))$('.binocular-settings').open=true}

function changeObjective(value,reason='objective'){
  value=Number(value);if(value===state.objective)return true;
  if(!canRotateTurret(state)){toast('载物台过高，物镜转动可能碰到玻片，请先降低载物台');return false}
  state.objective=value;
  if(value===40)toast('换高倍前先在低倍下找清并居中；换镜后优先用细准焦螺旋');
  update(reason);return true;
}
function cycleObjective(){const seq=[4,10,40],i=seq.indexOf(state.objective);changeObjective(seq[(i+1)%3],'3d:turret')}
function cycleEyepiece(){const seq=[5,10,16],i=seq.indexOf(state.eyepiece);state.eyepiece=seq[(i+1)%3];model.updateEyepieceLabels();update('3d:eyepiece')}

function update(reason='ui'){
  if(reason.includes('coarse')&&state.objective===40)toast('高倍观察通常只用细准焦螺旋，避免物镜压坏玻片');
  if(applyMechanicalLimit(state))toast('物镜已接近玻片，模拟机械限位阻止继续下压');
  const values=['aperture','intensity','specimen','slideX','slideY','eyepiece','coarse','fine','ipd','diopter'];
  values.forEach(id=>{const el=$(`#${id}`);if(el&&String(el.value)!==String(state[id]))el.value=state[id]});
  $('#apertureOut').value=state.aperture;$('#intensityOut').value=`${Math.round(state.intensity)}%`;
  $('#slideXOut').value=state.slideX.toFixed(2);$('#slideYOut').value=state.slideY.toFixed(2);$('#coarseOut').value=`台高刻度 ${(10-state.coarse-state.fine).toFixed(3)}`;$('#fineOut').value=state.fine.toFixed(3);
  $('#ipdOut').value=`${state.ipd} mm`;$('#diopterOut').value=`${state.diopter>0?'+':''}${Number(state.diopter).toFixed(1)} D`;
  $('#powerButton').classList.toggle('on',state.power);$('#powerButton b').textContent=state.power?'关闭电源':'打开电源';
  $$('[data-objective]').forEach(x=>x.classList.toggle('active',Number(x.dataset.objective)===state.objective));
  $$('[data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.mode===state.mode));
  if(model)model.updateMode();drawOptics();
}

const scope=$('#scopeCanvas'),sctx=scope.getContext('2d'),expandedScope=$('#expandedScopeCanvas'),expandedCtx=expandedScope.getContext('2d'),slideCtx=$('#slideCanvas').getContext('2d');
const expandedView={zoom:1};
const specimenCanvas=document.createElement('canvas');specimenCanvas.width=specimenCanvas.height=640;const sp=specimenCanvas.getContext('2d');
function makeSpecimen(type){sp.clearRect(0,0,640,640);sp.save();sp.translate(320,320);
  // 「上」字装片：楷体"上"字。倒像后上下颠倒为"⺧"形（仍可识别），直观演示显微镜成倒立像。
  if(type==='shang'){sp.fillStyle='#f4ecd4';sp.fillRect(-400,-400,800,800);sp.strokeStyle='#d8c89a';sp.lineWidth=2;sp.strokeRect(-360,-360,720,720);sp.fillStyle='#1a2820';sp.textAlign='center';sp.textBaseline='middle';sp.font='700 380px "KaiTi","楷体","STKaiti","SimSun",serif';sp.fillText('上',0,0);sp.fillStyle='rgba(80,60,30,.6)';sp.font='20px "PingFang SC",sans-serif';sp.fillText('shang·slide',0,300)}
  // 「e」字装片：粗黑衬线"e"。倒像后呈镜像"ɘ"——开口从右变左，最直观展示"上下左右都反转"。
  else if(type==='e'){sp.fillStyle='#f4ecd4';sp.fillRect(-400,-400,800,800);sp.strokeStyle='#d8c89a';sp.lineWidth=2;sp.strokeRect(-360,-360,720,720);sp.fillStyle='#1a2820';sp.textAlign='center';sp.textBaseline='middle';sp.font='900 360px Georgia,"Times New Roman",serif';sp.fillText('e',0,30);sp.fillStyle='rgba(80,60,30,.6)';sp.font='20px "PingFang SC",sans-serif';sp.fillText('e·slide',0,300)}
  sp.restore()}
// 实拍装片：每张均为「10×目镜+4×物镜」(总倍率40×) 手机实拍原图，映射到装片世界中央 1600×1600 区域。
// 4×物镜(10×目镜)时视野恰好覆盖整图；10×/40×物镜通过缩小裁切范围模拟放大；切换物镜观察中心不变。
const PHOTO_SPECIMENS={
  kouqiang:{src:'./assets/specimens/kouqiangshangpi.jpg',name:'口腔上皮细胞'},
  genjian:{src:'./assets/specimens/genjianxibao.jpg',name:'根尖细胞'},
  shangpi:{src:'./assets/specimens/shangpizuzhi.jpg',name:'上皮组织'},
  jiedi:{src:'./assets/specimens/jiedizuzhi.jpg',name:'结缔组织'},
  jirou:{src:'./assets/specimens/jirouzuzhi.jpg',name:'肌肉组织'},
  shenjing:{src:'./assets/specimens/shenjingzuzhi.jpg',name:'神经组织'},
  candou:{src:'./assets/specimens/candouyexiabiaopi.jpg',name:'蚕豆叶下表皮'},
  yingchun:{src:'./assets/specimens/yingchunyehengqie.jpg',name:'迎春叶横切'},
  nangua:{src:'./assets/specimens/nanguajingzongqie.jpg',name:'南瓜茎纵切'}
};
const PHOTO_WORLD=1600,PHOTO_HALF=PHOTO_WORLD/2,photoCache=new Map();
function getPhotoSpecimen(key){
  const conf=PHOTO_SPECIMENS[key];
  if(!conf)return null;
  let entry=photoCache.get(key);
  if(!entry){
    const img=new Image();
    entry={img,ready:false,failed:false};
    img.onload=()=>{entry.ready=true;update('photo-ready')};
    img.onerror=()=>{entry.failed=true;update('photo-ready')};
    img.src=conf.src;
    photoCache.set(key,entry);
  }
  return entry;
}
// 在装片世界坐标系中绘制当前装片：矢量装片（上/e）画 ±320 窗口；实拍装片画 ±800 图片区域，图片外为空白载玻片。
function paintSpecimenWorld(ctx,o,extraZoom){
  const key=state.specimen;
  if(!PHOTO_SPECIMENS[key]){ctx.filter=`blur(${o.blur}px) contrast(${1+state.aperture*.05})`;makeSpecimen(key);ctx.drawImage(specimenCanvas,-320,-320);return}
  const entry=getPhotoSpecimen(key);
  ctx.fillStyle='#f4f1e4';ctx.fillRect(-4096,-4096,8192,8192);
  if(!entry.ready)return;
  if(entry.failed){ctx.fillStyle='#8a8272';ctx.textAlign='center';ctx.font=`${28/o.scale}px "PingFang SC",sans-serif`;ctx.fillText('装片图像加载失败',0,0);return}
  const view=640/(o.scale*extraZoom);
  const cx=-state.slideX*640,cy=-state.slideY*640;
  const ix0=Math.max(cx-view/2,-PHOTO_HALF),ix1=Math.min(cx+view/2,PHOTO_HALF);
  const iy0=Math.max(cy-view/2,-PHOTO_HALF),iy1=Math.min(cy+view/2,PHOTO_HALF);
  if(ix1<=ix0||iy1<=iy0)return;
  const img=entry.img,kx=img.naturalWidth/PHOTO_WORLD,ky=img.naturalHeight/PHOTO_WORLD;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.filter=`blur(${o.blur}px) saturate(1.06) contrast(${1+state.aperture*.05})`;
  ctx.drawImage(img,(ix0+PHOTO_HALF)*kx,(iy0+PHOTO_HALF)*ky,(ix1-ix0)*kx,(iy1-iy0)*ky,ix0,iy0,ix1-ix0,iy1-iy0);
}
const TAU=Math.PI*2;
function drawOptics(){const o=opticalState(state);$('#magnification').textContent=`${o.magnification}×`;sctx.save();sctx.clearRect(0,0,640,640);sctx.beginPath();sctx.arc(320,320,315,0,TAU);sctx.clip();sctx.fillStyle='#dadfc5';sctx.fillRect(0,0,640,640);
  if(state.specimen!=='none'){sctx.save();sctx.translate(320+o.imageX,320+o.imageY);sctx.rotate(Math.PI);sctx.scale(o.scale,o.scale);paintSpecimenWorld(sctx,o,1);sctx.restore()}
  if(o.brightness<1){sctx.fillStyle=`rgba(0,8,3,${1-o.brightness})`;sctx.fillRect(0,0,640,640)}else{sctx.fillStyle=`rgba(255,253,226,${Math.min(.42,(o.brightness-1)*.42)})`;sctx.fillRect(0,0,640,640)}
  const v=sctx.createRadialGradient(320,320,190,320,320,325);v.addColorStop(0,'transparent');v.addColorStop(1,'rgba(5,18,10,.55)');sctx.fillStyle=v;sctx.fillRect(0,0,640,640);sctx.restore();sctx.strokeStyle='#233b31';sctx.lineWidth=10;sctx.beginPath();sctx.arc(320,320,313,0,TAU);sctx.stroke();
  let focusText='物像清晰',quality='清晰';if(state.specimen==='none'){focusText='等待放片';quality='等待放片'}else if(o.brightness<.12){focusText='光线不足';quality='需对光'}else if(!o.clear){focusText=o.blur<9?'接近焦点':'尚未合焦';quality=o.blur<9?'接近':'模糊'}
  let lightText=!state.power?'光源未开启':o.brightness<.35?'视野过暗':o.brightness<.75?'偏暗':o.brightness<=1.25?'明亮':'偏强';$('#focusStatus').textContent=focusText;$('#lightStatus').textContent=lightText;$('#qualityBadge').textContent=quality;
  drawSlidePreview();drawExpandedScope();
}
function drawSlidePreview(){const c=slideCtx.canvas,w=c.width,h=c.height;slideCtx.clearRect(0,0,w,h);const frameX=w*.025,frameY=h*.10,frameW=w*.95,frameH=h*.80;slideCtx.fillStyle='#273a32';slideCtx.fillRect(frameX,frameY,frameW,frameH);const slideW=w*.72,slideH=h*.42,moveX=state.slideX*w*.13,moveY=state.slideY*h*.18,slideX=(w-slideW)/2+moveX,slideY=(h-slideH)/2+moveY;slideCtx.fillStyle='#bdd7d2dd';slideCtx.fillRect(slideX,slideY,slideW,slideH);slideCtx.strokeStyle='#d8efea';slideCtx.lineWidth=2;slideCtx.strokeRect(slideX,slideY,slideW,slideH);slideCtx.fillStyle='#f1eee0';slideCtx.fillRect(slideX+slideW*.05,slideY+slideH*.08,slideW*.22,slideH*.84);slideCtx.strokeStyle='#e9fff4';slideCtx.lineWidth=2;slideCtx.beginPath();slideCtx.arc(w/2,h/2,7,0,TAU);slideCtx.stroke()}
function drawExpandedScope(){const overlay=$('#scopeOverlay');if(overlay.hidden)return;const c=expandedScope,size=c.width,center=size/2,o=opticalState(state),ratio=size/640;expandedCtx.save();expandedCtx.clearRect(0,0,size,size);expandedCtx.beginPath();expandedCtx.arc(center,center,center-8,0,TAU);expandedCtx.clip();expandedCtx.fillStyle='#dadfc5';expandedCtx.fillRect(0,0,size,size);if(state.specimen!=='none'){expandedCtx.save();expandedCtx.translate(center+o.imageX*ratio,center+o.imageY*ratio);expandedCtx.rotate(Math.PI);expandedCtx.scale(o.scale*ratio*expandedView.zoom,o.scale*ratio*expandedView.zoom);paintSpecimenWorld(expandedCtx,o,ratio*expandedView.zoom);expandedCtx.restore()}if(o.brightness<1){expandedCtx.fillStyle=`rgba(0,8,3,${1-o.brightness})`;expandedCtx.fillRect(0,0,size,size)}else{expandedCtx.fillStyle=`rgba(255,253,226,${Math.min(.42,(o.brightness-1)*.42)})`;expandedCtx.fillRect(0,0,size,size)}const v=expandedCtx.createRadialGradient(center,center,size*.30,center,center,size*.50);v.addColorStop(0,'transparent');v.addColorStop(1,'rgba(5,18,10,.55)');expandedCtx.fillStyle=v;expandedCtx.fillRect(0,0,size,size);expandedCtx.restore();expandedCtx.strokeStyle='#233b31';expandedCtx.lineWidth=16;expandedCtx.beginPath();expandedCtx.arc(center,center,center-8,0,TAU);expandedCtx.stroke();$('#overlayMagnification').textContent=`${o.magnification}× · ${expandedView.zoom.toFixed(1)}×画面`}

model=createMicroscope({canvas:$('#threeCanvas'),state,onSelect:selectPart,onPanel:switchPanel,onToast:toast,onChange:reason=>{if(reason==='3d:turret')cycleObjective();else if(reason==='3d:eyepiece')cycleEyepiece();else update(reason)}});
ids.forEach((id,i)=>{const b=document.createElement('button');b.textContent=`${String(i+1).padStart(2,'0')}  ${info[id][0]}`;b.onclick=()=>{model.setSelection(id);selectPart(id)};$('#structureList').append(b)});

$$('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;model.updateMode();update('mode');toast(state.mode==='explore'?'点击模型部件，认识结构与功能':'实验模式：可操作手轮、转换器、电源和玻片')});
$$('[data-tab]').forEach(b=>b.onclick=()=>switchPanel(b.dataset.tab));$$('[data-view]').forEach(b=>b.onclick=()=>model.view(b.dataset.view));
$$('[data-camera]').forEach(b=>b.onclick=()=>{if(b.dataset.camera==='zoomIn')model.zoom(.8);else if(b.dataset.camera==='zoomOut')model.zoom(1.25);else if(b.dataset.camera==='focus')model.focusSelected();else b.textContent=model.toggleCameraMode()});
$$('[data-nudge]').forEach(b=>b.onclick=()=>model.nudge(b.dataset.nudge));
$('#powerButton').onclick=()=>{state.power=!state.power;update('power')};
['aperture','intensity','slideX','slideY','coarse','fine','ipd','diopter'].forEach(id=>{$(`#${id}`).addEventListener('input',e=>{state[id]=Number(e.target.value);update(id)})});
$('#specimen').onchange=e=>{state.specimen=e.target.value;model.setSpecimenPulse();const conf=PHOTO_SPECIMENS[state.specimen];if(conf){const entry=getPhotoSpecimen(state.specimen);if(!entry.ready&&!entry.failed)toast(`正在载入「${conf.name}」实拍装片…`)}update('specimen')};
$('#eyepiece').onchange=e=>{state.eyepiece=Number(e.target.value);model.updateEyepieceLabels();update('eyepiece')};
$$('[data-objective]').forEach(b=>b.onclick=()=>changeObjective(b.dataset.objective));
$$('[data-fine]').forEach(b=>b.onclick=()=>{const v=Number(b.dataset.fine);state.fine=v===0?0:clamp(state.fine+v,-.5,.5);update('fine')});
$$('[data-slide]').forEach(b=>b.onclick=()=>{const d=b.dataset.slide;if(d==='center'){state.slideX=state.slideY=0}else moveSlide(state,d==='left'?-.05:d==='right'?.05:0,d==='up'?-.05:d==='down'?.05:0);update('slide-buttons')});
$('#resetButton').onclick=()=>{Object.assign(state,initial);model.updateEyepieceLabels();model.view('home');model.setSelection(null);selected=null;update('reset');toast('已恢复初始状态')};
$('#closeInfo').onclick=()=>{$('#infoCard').hidden=true;$('#partLabel').hidden=true};$('#fullscreenBtn').onclick=toggleFullscreen;$('#helpBtn').onclick=()=>$('#helpDialog').showModal();$('#layoutBtn').onclick=()=>$('#layoutDialog').showModal();
$$('[data-layout]').forEach(b=>b.onclick=()=>{const value={model:'76%',balanced:'64%',control:'52%'}[b.dataset.layout];document.documentElement.style.setProperty('--model-width',value);localStorage.setItem('microscope-layout',value)});const saved=localStorage.getItem('microscope-layout');if(saved)document.documentElement.style.setProperty('--model-width',saved);

let split=false;$('#splitter').addEventListener('pointerdown',e=>{split=true;e.target.setPointerCapture(e.pointerId)});$('#splitter').addEventListener('pointermove',e=>{if(!split)return;const p=clamp(e.clientX/innerWidth*100,48,80);document.documentElement.style.setProperty('--model-width',`${p}%`)});$('#splitter').addEventListener('pointerup',()=>{split=false;localStorage.setItem('microscope-layout',getComputedStyle(document.documentElement).getPropertyValue('--model-width').trim())});
['fullscreenchange','webkitfullscreenchange'].forEach(name=>document.addEventListener(name,()=>{if(fullscreenElement())fallbackFullscreen=false;syncFullscreenUI()}));window.addEventListener('resize',syncViewport);window.addEventListener('orientationchange',syncViewport);window.visualViewport?.addEventListener('resize',syncViewport);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fallbackFullscreen){fallbackFullscreen=false;syncFullscreenUI()}});syncViewport();
let scopeDrag=null;scope.addEventListener('pointerdown',e=>{scopeDrag={x:e.clientX,y:e.clientY};scope.setPointerCapture(e.pointerId)});scope.addEventListener('pointermove',e=>{if(!scopeDrag)return;const r=scope.getBoundingClientRect(),dx=e.clientX-scopeDrag.x,dy=e.clientY-scopeDrag.y;scopeDrag={x:e.clientX,y:e.clientY};moveSlide(state,dx*.65/r.width,dy*.65/r.width);update('scope-drag')});scope.addEventListener('pointerup',()=>scopeDrag=null);scope.addEventListener('pointercancel',()=>scopeDrag=null);
function openScopeOverlay(){expandedView.zoom=1;$('#scopeOverlay').hidden=false;drawExpandedScope()}
function closeScopeOverlay(){$('#scopeOverlay').hidden=true;expandedPointers.clear()}
function zoomExpanded(next){expandedView.zoom=clamp(next,1,8);drawExpandedScope()}
$('#expandScopeBtn').onclick=openScopeOverlay;$('#closeScopeOverlay').onclick=closeScopeOverlay;
expandedScope.addEventListener('wheel',e=>{e.preventDefault();zoomExpanded(expandedView.zoom*Math.exp(-e.deltaY*.0015))},{passive:false});
const expandedPointers=new Map();expandedScope.addEventListener('pointerdown',e=>{expandedPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});expandedScope.setPointerCapture(e.pointerId)});expandedScope.addEventListener('pointermove',e=>{if(!expandedPointers.has(e.pointerId))return;e.preventDefault();const previous=new Map(expandedPointers),oldPoint=expandedPointers.get(e.pointerId);expandedPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(expandedPointers.size===1){const r=expandedScope.getBoundingClientRect(),factor=.65/(r.width*expandedView.zoom);moveSlide(state,(e.clientX-oldPoint.x)*factor,(e.clientY-oldPoint.y)*factor);update('expanded-scope-drag');return}const ids=[...expandedPointers.keys()].slice(0,2),a0=previous.get(ids[0]),b0=previous.get(ids[1]),a1=expandedPointers.get(ids[0]),b1=expandedPointers.get(ids[1]),d0=Math.hypot(a0.x-b0.x,a0.y-b0.y),d1=Math.hypot(a1.x-b1.x,a1.y-b1.y);if(d0>0)zoomExpanded(expandedView.zoom*d1/d0)});
const releaseExpandedPointer=e=>expandedPointers.delete(e.pointerId);expandedScope.addEventListener('pointerup',releaseExpandedPointer);expandedScope.addEventListener('pointercancel',releaseExpandedPointer);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#scopeOverlay').hidden)closeScopeOverlay()});
function placePartLabel(){requestAnimationFrame(placePartLabel);const el=$('#partLabel');if(el.hidden||state.mode!=='explore')return;const b=model.getSelectedScreenBox();if(!b)return;const w=el.offsetWidth,h=el.offsetHeight,g=12,candidates=[{x:b.right+g,y:(b.top+b.bottom-h)/2},{x:b.left-w-g,y:(b.top+b.bottom-h)/2},{x:(b.left+b.right-w)/2,y:b.top-h-g},{x:(b.left+b.right-w)/2,y:b.bottom+g}];const blockers=[$('.topbar'),$('#infoCard'),$('.view-presets'),$('.camera-tools'),$('#controlPane')].filter(Boolean).map(x=>x.getBoundingClientRect());const overlap=(a,r)=>Math.max(0,Math.min(a.x+w,r.right)-Math.max(a.x,r.left))*Math.max(0,Math.min(a.y+h,r.bottom)-Math.max(a.y,r.top));const valid=candidates.map(c=>({...c,x:clamp(c.x,5,innerWidth-w-5),y:clamp(c.y,5,innerHeight-h-5)})).sort((a,b)=>blockers.reduce((s,r)=>s+overlap(a,r),0)-blockers.reduce((s,r)=>s+overlap(b,r),0))[0];el.style.left=`${valid.x}px`;el.style.top=`${valid.y}px`}requestAnimationFrame(placePartLabel);
update('init');
