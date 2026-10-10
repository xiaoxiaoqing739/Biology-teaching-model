import * as THREE from '../../shared/vendor/three.module.js';
import {createApprovedFlame} from './approved-flame.js';

function mesh(geometry,material,parent,position){const item=new THREE.Mesh(geometry,material);if(position)item.position.set(...position);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item}
export function createReusedMatchbox(){
  const group=new THREE.Group(),sleeve=new THREE.Group();
  const sleeveMat=new THREE.MeshStandardMaterial({color:0xb6492f,roughness:.86}),card=new THREE.MeshStandardMaterial({color:0xead6aa,roughness:.93}),strikerMat=new THREE.MeshStandardMaterial({color:0x593225,roughness:1}),wood=new THREE.MeshStandardMaterial({color:0xc9a36c,roughness:.9});
  mesh(new THREE.BoxGeometry(.70,.20,.46),sleeveMat,sleeve,[0,.18,0]);mesh(new THREE.BoxGeometry(.60,.009,.36),new THREE.MeshStandardMaterial({color:0xf1ddae,roughness:.9}),sleeve,[0,.285,0]);const striker=mesh(new THREE.BoxGeometry(.55,.11,.012),strikerMat,sleeve,[0,.18,.236]);group.add(sleeve);
  const tray=new THREE.Group();mesh(new THREE.BoxGeometry(.64,.15,.40),card,tray,[0,.14,0]);for(let i=0;i<15;i++){const layer=Math.floor(i/8),slot=i%8,y=.225+layer*.024,z=-.14+slot*.04;mesh(new THREE.BoxGeometry(.34,.012,.012),wood,tray,[0,y,z]);mesh(new THREE.SphereGeometry(.018,12,9),new THREE.MeshStandardMaterial({color:0x8e2f24,roughness:.9}),tray,[.17,y,z])}group.add(tray);
  const activeMatch=new THREE.Group();mesh(new THREE.BoxGeometry(.34,.014,.014),wood,activeMatch);const pickMesh=mesh(new THREE.BoxGeometry(.58,.24,.18),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthTest:false,depthWrite:false}),activeMatch,[.02,0,0]);pickMesh.renderOrder=190;const head=mesh(new THREE.SphereGeometry(.021,16,12),new THREE.MeshStandardMaterial({color:0x9b3025,roughness:.9}),activeMatch,[.17,0,0]),matchFlame=createApprovedFlame({width:.078,height:.21,glow:.62,distance:1.35});matchFlame.position.set(.17,.035,0);activeMatch.add(matchFlame);activeMatch.visible=false;group.add(activeMatch);
  const hit=mesh(new THREE.BoxGeometry(1.08,.48,.72),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}),group,[.10,.18,0]);
  return{group,hit,parts:{sleeve,tray,striker,activeMatch,head,flame:matchFlame}};
}
