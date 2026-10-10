import * as THREE from '../../shared/vendor/three.module.js';
export function createSeed(color=0xc99345){const root=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({color,roughness:.78}));body.scale.set(1.20,.72,.90);body.castShadow=true;root.add(body);root.userData.type='seed';return root}
export function createGerminatingSeed(){return createSeed(0xc99648)}
export function createCookedSeed(){return createSeed(0x8f644f)}
