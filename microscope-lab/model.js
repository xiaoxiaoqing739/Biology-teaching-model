import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp } from './physics.mjs';

const TAU = Math.PI * 2;
const outlineMaterial = new THREE.MeshBasicMaterial({color:0x79ffc0,side:THREE.BackSide,depthWrite:false,toneMapped:false});
outlineMaterial.onBeforeCompile = shader => { shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed = position + normal * 0.028;'); };

export function createMicroscope({canvas,state,onSelect,onChange,onPanel,onToast}){
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x172126);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const camera=new THREE.PerspectiveCamera(34,1,.1,100); camera.position.set(8.8,6.4,12.5);
  const controls=new OrbitControls(camera,canvas); controls.target.set(0,3.35,0); controls.enableDamping=true; controls.dampingFactor=.08; controls.minDistance=.65; controls.maxDistance=45; controls.maxPolarAngle=.86*Math.PI;
  controls.touches.ONE=THREE.TOUCH.ROTATE; controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  const pmrem=new THREE.PMREMGenerator(renderer); scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture; scene.environmentIntensity=.65; pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf5f4e5,0x5d786a,2.1));
  const key=new THREE.DirectionalLight(0xfff5dd,4.2); key.position.set(5,11,6); key.castShadow=true; key.shadow.mapSize.set(2048,2048); key.shadow.bias=-.0002; key.shadow.normalBias=.02; scene.add(key);
  const fill=new THREE.DirectionalLight(0xd8e9ff,2); fill.position.set(-5,6,-3); scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,2.4); rim.position.set(0,7,-6); scene.add(rim);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.15})); ground.rotation.x=-Math.PI/2; ground.position.y=.06; ground.receiveShadow=true; scene.add(ground);

  const M={
    white:new THREE.MeshStandardMaterial({color:0xe1e3df,metalness:.24,roughness:.30,transparent:false,opacity:1,depthWrite:true}),black:new THREE.MeshStandardMaterial({color:0x202a2c,metalness:.32,roughness:.29}),
    rubber:new THREE.MeshStandardMaterial({color:0x101b1d,metalness:.03,roughness:.65}),metal:new THREE.MeshStandardMaterial({color:0xadb9bb,metalness:.82,roughness:.23}),
    dark:new THREE.MeshStandardMaterial({color:0x52666a,metalness:.70,roughness:.32}),brass:new THREE.MeshStandardMaterial({color:0xc4a362,metalness:.70,roughness:.30}),
    glass:new THREE.MeshPhysicalMaterial({color:0xa8d7d5,transparent:true,opacity:.35,roughness:.05,side:THREE.DoubleSide,depthWrite:false}),
    lens:new THREE.MeshStandardMaterial({color:0x184a50,metalness:.6,roughness:.08}),green:new THREE.MeshStandardMaterial({color:0x285c49,metalness:.35,roughness:.35})
  };
  const root=new THREE.Group(); root.position.y=.08; scene.add(root);
  const parts=new Map(),pickables=[],dimMaterials=[],outlines=[];
  const group=(parent,pos=[0,0,0])=>{const g=new THREE.Group();g.position.set(...pos);parent.add(g);return g};
  const mesh=(geometry,material,parent,pos=[0,0,0])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
  const cyl=(r,h,mat,parent,pos=[0,0,0],r2=r)=>mesh(new THREE.CylinderGeometry(r,r2,h,64),mat,parent,pos);
  const box=(x,y,z,mat,parent,pos=[0,0,0])=>mesh(new THREE.BoxGeometry(x,y,z,3,3,3),mat,parent,pos);
  const ring=(r,t,mat,parent,pos=[0,0,0])=>{const m=mesh(new THREE.TorusGeometry(r,t,12,72),mat,parent,pos);m.rotation.x=Math.PI/2;return m};
  const lathe=(profile,mat,parent,pos=[0,0,0])=>{const body=mesh(new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),80),mat,parent,pos);const [bottom,top]=[profile[0],profile[profile.length-1]];if(bottom[0]>0){const c=mesh(new THREE.CircleGeometry(bottom[0],80),mat,body,[0,bottom[1],0]);c.rotation.x=Math.PI/2}if(top[0]>0){const c=mesh(new THREE.CircleGeometry(top[0],80),mat,body,[0,top[1],0]);c.rotation.x=-Math.PI/2}return body};
  const screw=(parent,pos,axis='y',r=.055)=>{const g=group(parent,pos),s=cyl(r,.035,M.metal,g);if(axis==='x')s.rotation.z=Math.PI/2;if(axis==='z')s.rotation.x=Math.PI/2;const slot=box(r*1.4,.012,r*.18,M.black,g,[0,.022,0]);return g};
  const label=(text,parent,pos,w=.7,h=.18,rotation=[-Math.PI/2,0,0],color='#18382d')=>{const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,512,128);x.fillStyle=color;x.font='800 58px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,64);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const p=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,toneMapped:false}),parent,pos);p.rotation.set(...rotation);p.userData.labelCanvas=c;p.userData.labelTexture=tex;return p};
  const cast=(points,depth,parent,pos,id,bevel=.08)=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3});g.center();const m=mesh(g,M.white,parent,pos);m.userData.part=id;return m};
  const knurl=(parent,r,count=28,depth=.16,tooth=.035,axial=.10,material=M.rubber)=>{for(let i=0;i<count;i++){const a=i/count*TAU,q=box(tooth,axial,depth,material,parent,[Math.cos(a)*r,0,Math.sin(a)*r]);q.rotation.y=-a;}};
  function tag(obj,id){parts.set(id,obj);const found=[];obj.traverse(o=>{if(!o.isMesh||o.userData.outline)return;o.userData.part=id;pickables.push(o);o.material=o.material.clone();const mat=o.material;mat.userData.focus={value:1};mat.onBeforeCompile=shader=>{shader.uniforms.focusDim=mat.userData.focus;shader.fragmentShader=`uniform float focusDim;\n${shader.fragmentShader}`.replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb *= focusDim;');};mat.customProgramCacheKey=()=>`focus-${id}`;dimMaterials.push({mat,id});found.push(o)});found.forEach(o=>{const edge=new THREE.Mesh(o.geometry,outlineMaterial);edge.userData.outline=true;edge.visible=false;edge.renderOrder=5;o.add(edge);outlines.push({edge,id})});return obj;}

  // 镜座与电光源：固定在 root，避免继承镜座局部偏移。
  const base=group(root,[0,.49,0]);cast([[-1.5,-1.9],[1.5,-1.9],[1.72,1.15],[1.48,1.45],[-1.48,1.45],[-1.72,1.15]],.34,base,[0,0,0],'base',.13).rotation.x=Math.PI/2;
  [-1.23,1.23].forEach(x=>[-1.4,1.08].forEach(z=>cyl(.20,.13,M.rubber,base,[x,-.22,z])));label('BIO · BINOCULAR',base,[0,.20,1.33],1.45,.23);
  for(let i=-3;i<=3;i++)box(.12,.10,.028,M.dark,base,[-.8+i*.27,-.02,-1.84]);tag(base,'base');
  const lamp=group(root,[0,.57,.30]);lathe([[.36,0],[.58,0],[.58,.12],[.43,.18],[.36,.18]],M.rubber,lamp,[0,.20,0]);[.225,.275,.325].forEach(y=>ring(.595,.015,M.dark,lamp,[0,y,0]));const bulb=cyl(.18,.16,new THREE.MeshStandardMaterial({color:0xdce6d4,emissive:0xdfffc4,emissiveIntensity:0}),lamp,[0,.26,0]);cyl(.29,.025,M.glass,lamp,[0,.36,0]);const lampLensMat=new THREE.MeshStandardMaterial({color:'#9db8cc',emissive:'#bfe0ff',emissiveIntensity:0,transparent:true,opacity:.92});cyl(.265,.018,lampLensMat,lamp,[0,.378,0]);tag(lamp,'lamp');
  const beamMaterial=()=>new THREE.MeshBasicMaterial({color:'#cfe8ff',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
  const incidentConeMat=beamMaterial(),coneMat=beamMaterial();
  const incidentCone=mesh(new THREE.CylinderGeometry(.15,.20,1.14,32,1,true),incidentConeMat,root,[0,1.52,.30]);
  const lightCone=mesh(new THREE.CylinderGeometry(.12,.16,.60,32,1,true),coneMat,root,[0,2.40,.30]);
  [incidentCone,lightCone].forEach(o=>{o.castShadow=false;o.receiveShadow=false});
  const lampLight=new THREE.PointLight('#dff2ff',0,3.2,1.6);lampLight.position.set(0,2.48,.30);root.add(lampLight);
  const power=group(root,[.93,.83,1.08]);const switchPlate=box(.64,.06,.34,M.black,power);const rocker=box(.30,.09,.20,M.green,power,[0,.065,0]);rocker.userData.control='power';label('I   O',power,[0,.125,.14],.42,.12);const ledMat=new THREE.MeshStandardMaterial({color:0x22553b,emissive:0x36ff97,emissiveIntensity:0});const led=cyl(.045,.04,ledMat,power,[.25,.07,0]);const bright=lathe([[.12,-.07],[.14,-.04],[.14,.07],[.11,.09]],M.rubber,power,[.50,.08,0]);bright.userData.control='brightness';tag(power,'power');

  // 白色粗壮矩形镜臂：后部立柱经两级前移台阶承托分光头，中心线统一为 X=0。
  const arm=group(root,[0,0,0]);cast([[-.38,.55],[.38,.55],[.38,3.95],[-.38,3.95]],.72,arm,[0,2.25,-1.32],'arm',.07);cast([[-.45,3.90],[.45,3.90],[.45,4.55],[-.45,4.55]],.62,arm,[0,4.225,-1.08],'arm',.07);cast([[-.47,4.54],[.47,4.54],[.47,4.90],[-.47,4.90]],.42,arm,[0,4.72,-1.00],'arm',.07);box(.88,.28,.50,M.white,arm,[0,4.76,-.54]);box(.86,.30,.95,M.white,arm,[0,.70,-.92]);tag(arm,'arm');

  // 固定导轨、外壳与调焦小齿轮。
  const carriage=group(root);[-.25,.25].forEach(x=>box(.06,2.06,.08,M.metal,carriage,[x,2.8,-1.70]));
  const coverFrontMat=new THREE.MeshStandardMaterial({color:0xe1e3df,metalness:.14,roughness:.34,transparent:true,opacity:.46,depthWrite:false});
  const coverBackMat=coverFrontMat.clone();coverBackMat.opacity=.32;
  const covers=group(carriage);box(.68,1.95,.08,coverFrontMat,covers,[0,2.8,-1.31]);box(.68,1.95,.06,coverBackMat,covers,[0,2.8,-1.91]);tag(carriage,'carriage');
  const pinion=group(root,[0,2.20,-1.48]);const pg=cyl(.275,.25,M.brass,pinion);pg.rotation.z=Math.PI/2;for(let i=0;i<30;i++){const a=i/30*TAU,q=box(.055,.055,.27,M.brass,pinion,[0,Math.cos(a)*.30,Math.sin(a)*.30]);q.rotation.x=a;}tag(pinion,'carriage');

  // moving 下的所有部件共同升降，齿条只归属这里。
  const moving=group(root,[0,0,0]);const rack=group(moving,[0,2.82,-1.70]);box(.32,1.75,.09,M.brass,rack);for(let i=0;i<27;i++)box(.32,.025,.08,M.brass,rack,[0,-.82+i*.062,-.08]);tag(rack,'carriage');
  const stage=group(moving,[0,2.74,.30]);const shape=new THREE.Shape();shape.moveTo(-1.5,-1);shape.lineTo(1.5,-1);shape.lineTo(1.5,1);shape.lineTo(-1.5,1);shape.closePath();const holePath=new THREE.Path();holePath.absarc(0,0,.34,0,TAU);shape.holes.push(holePath);const stageGeo=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.05,bevelThickness:.04,bevelSegments:2});stageGeo.center();const stageMesh=mesh(stageGeo,M.black,stage);stageMesh.rotation.x=Math.PI/2;[[-1.25,.10,-.72],[1.25,.10,-.72],[-1.25,.10,.72],[1.25,.10,.72]].forEach(p=>screw(stage,p));tag(stage,'stage');
  const hole=group(stage,[0,.10,0]);ring(.345,.016,M.metal,hole);tag(hole,'hole');
  // 机械移动台完全使用 stage 局部坐标。yRail 的局部 -0.30 补偿 animate() 中固定的 +0.30 基准。
  const xy=group(stage);const yRail=group(xy,[0,0,0]);box(.10,.11,1.65,M.dark,yRail,[-1.31,0,-.32]);const xRail=group(yRail,[0,0,-.30]);box(2.55,.12,.16,M.black,xRail,[0,.01,-.47]);for(let i=-13;i<=13;i++)box(.018,i%5===0?.10:.065,.09,M.metal,xRail,[i*.09,.12,-.46]);
  const slide=group(xRail,[0,.10,0]);const slideGlassMat=new THREE.MeshPhysicalMaterial({color:0xcfe4e4,transparent:true,opacity:.5,roughness:.08,metalness:0,side:THREE.DoubleSide,depthWrite:true});const specimenMat=new THREE.MeshStandardMaterial({color:0x6b5a9e,transparent:true,opacity:.72,roughness:.6,depthWrite:true});const slideGlass=box(1.9,.035,.68,slideGlassMat,slide);box(.5,.010,.5,slideGlassMat,slide,[0,.022,0]);box(.34,.012,.30,specimenMat,slide,[0,.014,0]);box(.43,.012,.60,new THREE.MeshStandardMaterial({color:0xf2efe0,roughness:.8}),slide,[-.68,.026,0]);label('SPECIMEN',slide,[-.68,.034,0],.38,.10);tag(slide,'slide');
  // 压片夹与 slide 同级，共同继承 xRail 的 X 位移和 yRail 的 Z 位移。
  const clips=group(xRail);const clipPieces=[];[-.82,.82].forEach(x=>{const g=group(clips,[x,.11,-.02]);cyl(.085,.12,M.dark,g,[0,-.05,0]);const q=box(.12,.025,.95,M.metal,g,[0,.015,.07]);q.rotation.y=x<0?-.18:.18;clipPieces.push(g)});tag(clips,'clips');

  // 右前下方同轴横纵手轮：两轮沿 Y 轴上下叠放，共用一根垂直金属轴。
  box(.36,.17,.38,M.black,xy,[1.35,-.01,-.45]);cyl(.08,.64,M.metal,xy,[1.40,-.30,-.45]);
  const upperLongitudinalFrame=group(xy,[1.40,-.14,-.45]);upperLongitudinalFrame.rotation.z=Math.PI/2;const upperLongitudinalSpin=group(upperLongitudinalFrame);const upperLongitudinalVisual=group(upperLongitudinalSpin);upperLongitudinalVisual.rotation.z=-Math.PI/2;cyl(.24,.18,M.rubber,upperLongitudinalVisual);knurl(upperLongitudinalVisual,.255,32,.10,.05,.18);
  const lowerTransverseFrame=group(xy,[1.40,-.34,-.45]);lowerTransverseFrame.rotation.z=Math.PI/2;const lowerTransverseSpin=group(lowerTransverseFrame);const lowerTransverseVisual=group(lowerTransverseSpin);lowerTransverseVisual.rotation.z=-Math.PI/2;cyl(.14,.16,M.rubber,lowerTransverseVisual);knurl(lowerTransverseVisual,.152,28,.08,.042,.16);tag(xy,'xy');

  // 聚光镜固定在最高位，不设高度手轮和升降交互。
  const condenser=group(moving,[0,2.68,.30]);const condenserBody=group(condenser,[0,-.24,0]);
  // 聚光镜保留中空光路，不使用会自动封住上下端面的 lathe() 辅助函数。
  mesh(new THREE.LatheGeometry([[.26,.14],[.42,.14],[.47,.04],[.47,-.18],[.34,-.23],[.26,-.23]].map(([x,y])=>new THREE.Vector2(x,y)),80),M.dark,condenserBody);
  cyl(.29,.025,M.glass,condenserBody,[0,.15,0]);box(.12,.42,.12,M.metal,condenserBody,[.58,-.04,0]);tag(condenser,'condenser');

  // 封闭式虹膜光圈盒：上下中央开窗，叶片根部与运动轨迹藏在黑色壳体内。
  const diaphragm=group(condenser,[0,-.42,0]);
  const IRIS_N=10,IRIS_ROOT_R=.36,IRIS_MAX_ROT=THREE.MathUtils.degToRad(48),IRIS_LEVER_SWING=THREE.MathUtils.degToRad(68);
  const irisHousingMat=new THREE.MeshStandardMaterial({color:0x111719,metalness:.10,roughness:.78,side:THREE.DoubleSide});
  const irisLeafMat=new THREE.MeshStandardMaterial({color:0x171b1c,metalness:.28,roughness:.68,side:THREE.DoubleSide});
  const housingShape=new THREE.Shape();housingShape.absarc(0,0,.50,0,TAU,false);const housingHole=new THREE.Path();housingHole.absarc(0,0,.355,0,TAU,true);housingShape.holes.push(housingHole);
  const housingGeo=new THREE.ExtrudeGeometry(housingShape,{depth:.10,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:64});housingGeo.center();
  const housing=mesh(housingGeo,irisHousingMat,diaphragm);housing.rotation.x=Math.PI/2;
  // 两侧薄压圈勾勒观察窗口，但不遮挡中央光路。
  ring(.357,.012,M.dark,diaphragm,[0,.058,0]);ring(.357,.012,M.dark,diaphragm,[0,-.058,0]);

  const leafShape=new THREE.Shape();leafShape.moveTo(-.025,-.065);leafShape.bezierCurveTo(.12,-.12,.34,-.12,.455,-.035);leafShape.quadraticCurveTo(.485,0,.455,.035);leafShape.bezierCurveTo(.31,.15,.10,.115,-.025,.065);leafShape.quadraticCurveTo(.015,0,-.025,-.065);leafShape.closePath();
  const leafGeo=new THREE.ShapeGeometry(leafShape,32),irisPivots=[],irisBase=[];
  for(let i=0;i<IRIS_N;i++){
    const a=i/IRIS_N*TAU,x=Math.cos(a)*IRIS_ROOT_R,z=Math.sin(a)*IRIS_ROOT_R;
    const pivot=group(diaphragm,[x,(i-(IRIS_N-1)/2)*.003,z]);
    irisBase.push(Math.PI-a);pivot.rotation.y=irisBase[i];
    const leaf=mesh(leafGeo,irisLeafMat,pivot);leaf.rotation.x=-Math.PI/2;irisPivots.push(pivot);
  }
  // 拨杆绕光圈盒中心摆动；叶片仅作较小角度旋转，二者使用不同传动比。
  const lever=group(diaphragm);box(.50,.028,.065,M.metal,lever,[.68,0,0]);cyl(.07,.055,M.rubber,lever,[.95,0,0]);tag(diaphragm,'diaphragm');

  // 双目头与目镜装在镜臂顶部。
  const binocularWhite=M.white.clone();binocularWhite.transparent=false;binocularWhite.opacity=1;binocularWhite.depthWrite=true;
  const tube=group(root,[0,4.93,.10]);const prism=cast([[-.68,-.32],[.68,-.32],[.68,.40],[-.68,.40]],.76,tube,[0,0,0],'tube',.09);prism.material=binocularWhite;cyl(.53,.18,M.dark,tube,[0,-.50,0],.46);cyl(.46,.16,binocularWhite,tube,[0,-.66,0],.38);const bridge=group(tube,[0,.28,.24]);bridge.rotation.x=Math.PI/4;box(1.18,.17,.36,M.dark,bridge,[0,-.02,0]);label('55 · 64 · 75',bridge,[0,.10,.19],.72,.12,[0,0,0],'#e7eadf');tag(tube,'tube');
  const eyeRoot=group(bridge);const eyeGroups=[],eyeLabels=[];[-1,1].forEach(side=>{const e=group(eyeRoot,[side*.52,0,0]);lathe([[0,0],[.29,0],[.29,.52],[.24,.57],[.24,.66],[0,.66]],binocularWhite,e);lathe([[.20,0],[.235,0],[.235,.35],[.30,.39],[.31,.52],[.22,.55],[.195,.50]],M.rubber,e,[0,.52,0]);cyl(.193,.016,M.lens,e,[0,1.035,0]);eyeLabels.push(label('10×',e,[0,.20,.239],.30,.10,[0,0,0],'#eef2e8'));eyeGroups.push(e)});tag(eyeRoot,'eyepiece');
  const leftDiopter=group(eyeGroups[0],[0,.54,0]);ring(.29,.035,M.metal,leftDiopter);knurl(leftDiopter,.29,40,.08,.025,.07,M.metal);leftDiopter.userData.diopterRing=true;tag(leftDiopter,'diopter');
  const rightDiopter=group(eyeGroups[1],[0,.54,0]);ring(.29,.035,M.metal,rightDiopter);knurl(rightDiopter,.29,40,.08,.025,.07,M.metal);tag(rightDiopter,'eyepiece');parts.set('eyepiece',eyeRoot);
  const ipdPick=box(.28,.20,.38,M.dark,bridge,[0,0,0]);tag(ipdPick,'ipd');

  // 转换器倾斜后，局部 z=.40 正好补偿到世界光轴 z≈.30。
  const turretMount=group(root,[0,4.26,.016]);turretMount.rotation.x=.35;const turret=group(turretMount);const disc=cyl(.67,.18,M.black,turret);ring(.62,.055,M.metal,turret,[0,.10,0]);for(let i=0;i<48;i++){const a=i/48*TAU,q=box(.055,.08,.10,M.rubber,turret,[Math.cos(a)*.70,0,Math.sin(a)*.70]);q.rotation.y=-a}tag(turret,'turret');
  const objectiveRoot=group(turret);const objectiveGroups=[];[[4,.65,0xc14d47,'0.10'],[10,.85,0xe0b943,'0.25'],[40,1.02,0x408bc8,'0.65']].forEach(([powerValue,len,color,na],i)=>{const a=i*TAU/3;const g=group(objectiveRoot,[Math.sin(a)*.4,-.15,Math.cos(a)*.4]);g.rotation.order='YXZ';g.rotation.y=a;g.rotation.x=-.35;lathe([[.20,0],[.23,-.08],[.23,-.22],[.18,-.26],[.16,-len+.15],[.12,-len],[.06,-len]],M.metal,g);cyl(.234,.05,new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.32}),g,[0,-.19,0]);cyl(.155,.10,M.black,g,[0,-len+.12,0]);cyl(.066,.012,M.lens,g,[0,-len,0]);ring(.18,.025,M.rubber,g,[0,-.26,0]);label(`${powerValue}× / ${na}`,g,[0,-.40,.181],.43,.09,[0,0,0],'#f5f7ee');g.userData.power=powerValue;objectiveGroups.push(g)});tag(objectiveRoot,'objective');

  // 同轴调焦传动：厚实黑色粗调大轮包住紧贴外侧的细调小轮。
  const coarse=group(root,[0,2.20,-1.48]);const axle=cyl(.12,1.92,M.metal,coarse);axle.rotation.z=Math.PI/2;const coarseWheels=[],fineWheels=[];
  [-1,1].forEach(side=>{const cw=group(coarse,[side*.58,0,0]);const visual=group(cw);visual.rotation.z=Math.PI/2;cyl(.49,.34,M.rubber,visual);knurl(visual,.515,36,.13,.055,.32);coarseWheels.push(cw)});tag(coarse,'coarse');
  const fineRoot=group(coarse);[-1,1].forEach(side=>{const fw=group(fineRoot,[side*.84,0,0]);const visual=group(fw);visual.rotation.z=Math.PI/2;cyl(.245,.18,M.rubber,visual);knurl(visual,.258,30,.095,.045,.18);fineWheels.push(fw)});tag(fineRoot,'fine');

  let selected=null,clipPulse=0,lastTime=performance.now(),cameraTween=null,manual=false,turretAngle=0;
  function setSelection(id){selected=id;outlines.forEach(x=>x.edge.visible=state.mode==='explore'&&x.id===id);dimMaterials.forEach(x=>x.mat.userData.focus.value=state.mode==='explore'&&id&&x.id!==id?.43:1);covers.visible=!(id==='carriage'&&state.mode==='explore');onSelect(id);}
  function updateMode(){if(state.mode==='experiment'){selected=null;outlines.forEach(x=>x.edge.visible=false);dimMaterials.forEach(x=>x.mat.userData.focus.value=1);covers.visible=true;onSelect(null);return}setSelection(selected);}
  function setCamera(pos,target){cameraTween={fromP:camera.position.clone(),toP:new THREE.Vector3(...pos),fromT:controls.target.clone(),toT:new THREE.Vector3(...target),t:0};}
  function fitBounds(object,direction=new THREE.Vector3(-10,3.5,13).normalize(),padding=1.16){const b=new THREE.Box3().setFromObject(object);const s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());const dist=Math.max(s.y/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))),s.x/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect))*padding;setCamera(c.clone().add(direction.clone().multiplyScalar(dist)).toArray(),c.toArray());}
  function view(name){if(name==='front')setCamera([0,5.3,17],[0,3.3,0]);else if(name==='back')setCamera([0,5.3,-17],[0,3.3,0]);else if(name==='side')setCamera([16,5.6,.4],[0,3.3,0]);else if(name==='aperture')setCamera([4,.4,4.6],[0,2.8,.3]);else if(name==='focus'){setSelection('carriage');setCamera([-5.8,6.1,-3.2],[0,2.8,-.45])}else fitBounds(root);}
  function focusSelected(){if(selected&&parts.get(selected))fitBounds(parts.get(selected),new THREE.Vector3(-6,3,9).normalize(),1.45)}
  function zoom(f){const d=camera.position.clone().sub(controls.target);const n=clamp(d.length()*f,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(d.normalize().multiplyScalar(n))}
  function nudge(dir){const dist=camera.position.distanceTo(controls.target)*.06;const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);const v=(dir==='left'?right.multiplyScalar(-1):dir==='right'?right:dir==='down'?up.multiplyScalar(-1):up).multiplyScalar(dist);camera.position.add(v);controls.target.add(v)}
  controls.addEventListener('start',()=>{cameraTween=null;manual=true});

  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let drag=null,down=null;
  function hit(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(pickables,false).filter(x=>{let p=x.object;while(p){if(!p.visible)return false;p=p.parent}return true});if(state.mode==='experiment'){const active=new Set(['coarse','fine','slide','power','turret','objective','eyepiece','diaphragm','stage','clips','xy','lamp','condenser','ipd','diopter']);const controlHit=hits.find(x=>active.has(x.object.userData.part));if(controlHit)return controlHit}return hits[0]}
  canvas.addEventListener('pointerdown',e=>{const h=hit(e);if(!h)return;let obj=h.object,id=obj.userData.part;down={x:e.clientX,y:e.clientY,id};if(state.mode==='explore'){setSelection(id);return}if(e.pointerType!=='touch'&&['coarse','fine','slide','power'].includes(id)){const control=obj.userData.control;drag={id:control==='brightness'?'brightness':id,x:e.clientX,y:e.clientY};controls.enabled=false;canvas.setPointerCapture(e.pointerId)}});
  canvas.addEventListener('pointermove',e=>{const h=hit(e);canvas.style.cursor=h?'pointer':'grab';if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;if(drag.id==='coarse')state.coarse=clamp(state.coarse-dy*.024,0,10);else if(drag.id==='fine')state.fine=clamp(state.fine-dy*.002,-.5,.5);else if(drag.id==='slide'){state.slideX=clamp(state.slideX+dx*.003,-.8,.8);state.slideY=clamp(state.slideY+dy*.003,-.8,.8)}else state.intensity=clamp(state.intensity-dy,0,100);onChange(`3d:${drag.id}`)});
  canvas.addEventListener('pointerup',e=>{if(drag){drag=null;controls.enabled=true}if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);const id=down.id;down=null;if(moved>=5||state.mode!=='experiment')return;if(id==='power'){state.power=!state.power;onChange('3d:power')}else if(id==='turret'||id==='objective')onChange('3d:turret');else if(id==='eyepiece')onChange('3d:eyepiece');else if(id==='diaphragm'){state.aperture=(state.aperture+1)%5;onChange('3d:aperture')}else if(['stage','slide','clips','xy'].includes(id))onPanel('slide');else if(id==='lamp')onPanel('light');else if(['ipd','diopter','coarse','fine'].includes(id))onPanel('focus')});
  canvas.addEventListener('pointercancel',()=>{drag=null;controls.enabled=true});canvas.addEventListener('touchstart',e=>{if(e.touches.length>1){drag=null;controls.enabled=true}},{passive:true});

  function resize(){const r=canvas.getBoundingClientRect();if(canvas.width!==Math.round(r.width*renderer.getPixelRatio())||canvas.height!==Math.round(r.height*renderer.getPixelRatio())){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}}
  function shortest(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a))}
  function animate(now){requestAnimationFrame(animate);resize();const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;const l=1-Math.exp(-dt*10);
    const my=-(state.coarse+state.fine-5)*.12;moving.position.y=THREE.MathUtils.lerp(moving.position.y,my,l);pinion.rotation.x=-moving.position.y/.30;
    xRail.position.x=THREE.MathUtils.lerp(xRail.position.x,state.slideX*.9,l);yRail.position.z=THREE.MathUtils.lerp(yRail.position.z,state.slideY*.9,l);upperLongitudinalSpin.rotation.x=state.slideY*8;lowerTransverseSpin.rotation.x=state.slideX*8;
    const condenserTarget=2.68;condenser.position.y=THREE.MathUtils.lerp(condenser.position.y,condenserTarget,l);
    const lampBeamY=.95,diaphragmY=moving.position.y+condenser.position.y+diaphragm.position.y,stageBottomY=moving.position.y+stage.position.y-.135;
    const incidentHeight=Math.max(.02,diaphragmY-lampBeamY),transmittedHeight=Math.max(.02,stageBottomY-diaphragmY);
    incidentCone.position.y=(lampBeamY+diaphragmY)/2;incidentCone.scale.y=incidentHeight/1.14;lightCone.position.y=(diaphragmY+stageBottomY)/2;lightCone.scale.y=transmittedHeight/.60;lampLight.position.y=diaphragmY+transmittedHeight*.72;
    const apertureOpen=THREE.MathUtils.clamp(state.aperture/4,0,1),theta=apertureOpen*IRIS_MAX_ROT;irisPivots.forEach((p,i)=>{p.rotation.y=irisBase[i]+theta});lever.rotation.y=IRIS_LEVER_SWING*(.5-apertureOpen);
    eyeGroups.forEach((e,i)=>{e.position.x=(i?1:-1)*(state.ipd/64)*.52;e.scale.y=THREE.MathUtils.lerp(e.scale.y,1+(state.eyepiece-10)*.018,l)});const dio=parts.get('diopter');if(dio){dio.rotation.y=state.diopter*.35;dio.position.y=.54+state.diopter*.012}
    const idx=[4,10,40].indexOf(state.objective),target=-idx*TAU/3;turretAngle+=shortest(turretAngle,target)*.25;turret.rotation.y=turretAngle;
    coarseWheels.forEach((w,i)=>w.rotation.x=state.coarse*.9*(i?1:-1));fineWheels.forEach((w,i)=>w.rotation.x=state.fine*10*(i?1:-1));
    bulb.material.emissiveIntensity=state.power?state.intensity/100*1.4:0;const lampLevel=state.power?state.intensity/100:0,transmission=apertureOpen*apertureOpen;lampLensMat.emissiveIntensity=THREE.MathUtils.lerp(lampLensMat.emissiveIntensity,lampLevel*2.6,l);incidentConeMat.opacity=THREE.MathUtils.lerp(incidentConeMat.opacity,state.power?.03+lampLevel*.11:0,l);const transmittedOpacity=state.power?(.04+lampLevel*.16)*transmission:0,transmittedLight=lampLevel*2.5*transmission;coneMat.opacity=apertureOpen===0?0:THREE.MathUtils.lerp(coneMat.opacity,transmittedOpacity,l);const beamWidth=.12+.88*apertureOpen;lightCone.scale.x=THREE.MathUtils.lerp(lightCone.scale.x,beamWidth,l);lightCone.scale.z=THREE.MathUtils.lerp(lightCone.scale.z,beamWidth,l);lampLight.intensity=apertureOpen===0?0:THREE.MathUtils.lerp(lampLight.intensity,transmittedLight,l);rocker.rotation.x=state.power?.16:-.16;led.material.emissiveIntensity=state.power?1.8:0;
    slide.visible=state.specimen!=='none';if(clipPulse>0){clipPulse=Math.max(0,clipPulse-dt*1.7);clipPieces.forEach((g,i)=>g.rotation.z=(i?1:-1)*-Math.sin(clipPulse*Math.PI)*.22)}
    if(cameraTween){cameraTween.t=Math.min(1,cameraTween.t+dt*1.8);const k=1-Math.pow(1-cameraTween.t,3);camera.position.lerpVectors(cameraTween.fromP,cameraTween.toP,k);controls.target.lerpVectors(cameraTween.fromT,cameraTween.toT,k);if(cameraTween.t>=1)cameraTween=null}
    controls.update();renderer.render(scene,camera)
  }
  requestAnimationFrame(animate);
  return {view,focusSelected,zoom,nudge,updateMode,setSelection,toggleCameraMode(){const pan=controls.mouseButtons.LEFT===THREE.MOUSE.PAN;controls.mouseButtons.LEFT=pan?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;return pan?'旋转':'平移'},setSpecimenPulse(){clipPulse=1},updateEyepieceLabels(){eyeLabels.forEach(p=>{const c=p.userData.labelCanvas,x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='#eef2e8';x.font='800 58px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(`${state.eyepiece}×`,256,64);p.userData.labelTexture.needsUpdate=true})},getSelectedScreenBox(){if(!selected||!parts.get(selected))return null;const b=new THREE.Box3().setFromObject(parts.get(selected));if(b.isEmpty())return null;const pts=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).project(camera),r=canvas.getBoundingClientRect();pts.push({x:r.left+(p.x+1)*r.width/2,y:r.top+(-p.y+1)*r.height/2})}return {left:Math.min(...pts.map(p=>p.x)),right:Math.max(...pts.map(p=>p.x)),top:Math.min(...pts.map(p=>p.y)),bottom:Math.max(...pts.map(p=>p.y))}},dispose(){renderer.dispose()}};
}
