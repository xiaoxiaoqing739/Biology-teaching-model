import * as THREE from './vendor/three.module.js';

// 来自已确认的“不透光黑纸”和“回形针”模型，仅抽离模型构造，不改变几何结构。
export function createPaperCoverModels(){
  const paperMat=new THREE.MeshStandardMaterial({color:0x0b0d0e,roughness:.98,side:THREE.DoubleSide});
  const metal=new THREE.MeshPhysicalMaterial({color:0xb9c1c1,roughness:.25,metalness:.9,clearcoat:.25});
  const papers=new THREE.Group();papers.name='paperSheets';
  const sheets=[];
  for(let i=0;i<2;i++){
    const geo=new THREE.BoxGeometry(.46,.006,.26,12,1,8),p=geo.attributes.position;
    for(let j=0;j<p.count;j++){const x=p.getX(j),z=p.getZ(j);p.setY(j,p.getY(j)+.006*Math.sin(x*9)*Math.cos(z*10))}
    geo.computeVertexNormals();
    const sheet=new THREE.Mesh(geo,paperMat);sheet.castShadow=sheet.receiveShadow=true;sheet.position.set(0,.006+i*.009,0);papers.add(sheet);sheets.push(sheet);
  }
  const paperHit=new THREE.Mesh(new THREE.BoxGeometry(1.05,.32,.72));paperHit.position.y=.08;papers.add(paperHit);
  const cueMat=new THREE.MeshBasicMaterial({color:0x4af2ff,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false});
  const paperCue=new THREE.Mesh(new THREE.RingGeometry(.34,.43,48),cueMat);paperCue.rotation.x=-Math.PI/2;paperCue.position.y=.025;paperCue.visible=false;papers.add(paperCue);

  const clip=new THREE.Group();clip.name='paperclip';
  const raw=[[-.04,-.14],[-.04,.11],[-.02,.17],[.035,.205],[.085,.18],[.11,.12],[.11,-.15],[.085,-.22],[.025,-.265],[-.075,-.27],[-.145,-.225],[-.18,-.14],[-.18,.17],[-.15,.26],[-.08,.325],[.045,.33],[.125,.285],[.17,.19],[.17,-.13]];
  const curve=new THREE.CatmullRomCurve3(raw.map(([x,y])=>new THREE.Vector3(x*.42,(y+.28)*.42,0)));
  const wire=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.009,12,false),metal);wire.castShadow=true;clip.add(wire);
  const clipHit=new THREE.Mesh(new THREE.BoxGeometry(.58,.58,.30));clipHit.position.y=.12;clip.add(clipHit);
  const clipCue=new THREE.Mesh(new THREE.RingGeometry(.18,.25,40),cueMat.clone());clipCue.position.y=.12;clipCue.visible=false;clip.add(clipCue);
  return {papers,sheets,paperHit,paperCue,clip,wire,clipHit,clipCue};
}
