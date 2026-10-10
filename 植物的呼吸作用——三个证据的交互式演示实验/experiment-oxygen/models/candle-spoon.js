import * as THREE from '../../shared/vendor/three.module.js';
import {createApprovedFlame} from './approved-flame.js';

function cylinderBetween(a,b,r,material){const direction=new THREE.Vector3().subVectors(b,a);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,direction.length(),32),material);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return mesh}

export function createCandleInLongSpoon(){
  const root=new THREE.Group();root.name='candle-in-long-spoon';
  const spoonMetal=new THREE.MeshPhysicalMaterial({color:0x8d9a9a,metalness:.78,roughness:.22,clearcoat:.5});
  const spoonInner=new THREE.MeshPhysicalMaterial({color:0xc0d0ca,metalness:.7,roughness:.18,transparent:true,opacity:.88,side:THREE.DoubleSide});
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(.66,64,32,0,Math.PI*2,Math.PI/2,Math.PI/2),spoonMetal);bowl.scale.set(1,.42,.82);bowl.position.y=.38;bowl.castShadow=true;root.add(bowl);
  const inner=new THREE.Mesh(new THREE.SphereGeometry(.54,64,24,0,Math.PI*2,Math.PI/2,Math.PI/2),spoonInner);inner.scale.set(1,.20,.80);inner.position.y=.455;root.add(inner);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.60,.052,16,72),spoonMetal);rim.scale.z=.82;rim.rotation.x=Math.PI/2;rim.position.y=.54;root.add(rim);
  const handleX=-.47,handleZ=0;
  const neck=cylinderBetween(new THREE.Vector3(handleX,.47,handleZ),new THREE.Vector3(handleX,.63,handleZ),.075,spoonMetal);root.add(neck);
  const handle=cylinderBetween(new THREE.Vector3(handleX,.59,handleZ),new THREE.Vector3(handleX,4.05,handleZ),.075,spoonMetal);handle.castShadow=true;root.add(handle);
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.105,.09,.55,32),spoonMetal);grip.position.set(handleX,4.30,handleZ);root.add(grip);

  const wax=new THREE.MeshStandardMaterial({color:0xf1e5c8,roughness:.62});
  const candle=new THREE.Mesh(new THREE.CylinderGeometry(.31,.33,1.18,48),wax);candle.position.y=.91;candle.castShadow=true;root.add(candle);
  const topWax=new THREE.Mesh(new THREE.CylinderGeometry(.30,.30,.035,48),new THREE.MeshStandardMaterial({color:0xfff4dc,roughness:.55}));topWax.position.y=1.505;root.add(topWax);
  const wick=cylinderBetween(new THREE.Vector3(0,1.52,0),new THREE.Vector3(0,1.74,0),.025,new THREE.MeshStandardMaterial({color:0x242728,roughness:.9}));root.add(wick);
  const flame=createApprovedFlame({width:.34,height:.62,glow:2.2,distance:3.5});flame.position.set(0,1.73,.02);flame.userData.type='flame';root.add(flame);
  root.userData={type:'candle-in-long-spoon',flame,flameCore:flame.userData.core,glow:flame.userData.glow,wickY:1.74,lit:false,setFlameStrength:value=>flame.userData.setStrength(value)};
  return root;
}
