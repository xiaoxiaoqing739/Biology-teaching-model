import * as THREE from './vendor/three.module.js';
import {createWideMouthBottle, createBottleStopper} from '../experiment-oxygen/models/wide-mouth-bottle.js';
import {createSmallBeaker} from '../experiment-oxygen/models/small-beaker.js';
import {createCandleInLongSpoon} from '../experiment-oxygen/models/candle-spoon.js';
import {createReusedMatchbox} from '../experiment-oxygen/models/matchbox-reused.js';
import {createDoubleHoleStopper} from '../experiment-two-models/model-01-stopper/double-hole-stopper.js';
import {createLongStemFunnel} from '../experiment-two-models/model-02-funnel/long-stem-funnel.js';
import {createDeliveryTube} from '../experiment-two-models/model-03-delivery-tube/delivery-tube.js';
import {createTestTube} from '../experiment-two-models/model-04-test-tube/test-tube.js';
import {createLimewaterSystem} from '../experiment-two-models/model-05-limewater/limewater.js';
import {createWaterBeaker} from '../experiment-two-models/model-06-water-beaker/water-beaker.js';
import {createThermosFlask} from '../experiment-three-models/thermos-flask.js';
import {createThermometer} from '../experiment-three-models/thermometer.js';
import {createPerforatedStopper} from '../experiment-three-models/perforated-stopper.js';
import {createSeedBed as createThermosSeedBed} from '../experiment-three-models/seed-bed.js';

function seedFill(group, radius = 1.05, layers = 6) {
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  const material = new THREE.MeshStandardMaterial({color: group === 'A' ? 0xc99648 : 0x8f644f, roughness: .82});
  const points = [];
  for (let layer = 0; layer < layers; layer += 1) {
    for (let row = -3; row <= 3; row += 1) {
      for (let column = -3; column <= 3; column += 1) {
        const x = column * .31 + ((row + layer) % 2 ? .15 : 0);
        const z = row * .26;
        if (Math.hypot(x, z) <= radius) points.push([x, .38 + layer * .25, z]);
      }
    }
  }
  const mesh = new THREE.InstancedMesh(geometry, material, points.length);
  const dummy = new THREE.Object3D();
  points.forEach(([x, y, z], index) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(index * .11, index * .43, index * .17);
    dummy.scale.set(.16, .105, .13);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

function bottleWithSeeds(group) {
  const bottle = createWideMouthBottle();
  bottle.add(seedFill(group));
  return bottle;
}

function seedBeaker(group) {
  const beaker = createSmallBeaker();
  const fill = seedFill(group, .70, 3);
  fill.scale.setScalar(.82);
  beaker.add(fill);
  return beaker;
}

function limeTube() {
  const root = new THREE.Group();
  root.add(createTestTube(), createLimewaterSystem());
  return root;
}

function thermos(group) {
  const root = createThermosFlask();
  const bed = createThermosSeedBed({group});
  bed.userData.setFillProgress(1);
  root.add(bed);
  return root;
}

function add(root, model, x, z, scale, rotation = [0, 0, 0]) {
  model.position.set(x, .03, z);
  model.scale.setScalar(scale);
  model.rotation.set(...rotation);
  model.traverse(object => { object.userData.storageDisplay = true; });
  root.add(model);
  return model;
}

function oxygenCatalog(root, center) {
  add(root, bottleWithSeeds('A'), center - 2.10, -1.70, .40);
  add(root, bottleWithSeeds('B'), center - .45, -1.70, .40);
  add(root, seedBeaker('A'), center - 2.45, .72, .38);
  add(root, seedBeaker('B'), center - 1.15, .72, .38);
  add(root, createCandleInLongSpoon(), center + .32, -.70, .31);
  add(root, createCandleInLongSpoon(), center + 1.12, -.70, .31);
  add(root, createBottleStopper(), center + .20, 2.28, .38);
  add(root, createBottleStopper(), center + 1.14, 2.28, .38);
  const matchbox = createReusedMatchbox();
  add(root, matchbox.group, center + 2.43, 2.22, .82);
}

function carbonCatalog(root, center) {
  add(root, bottleWithSeeds('A'), center - 3.35, -1.68, .36);
  add(root, bottleWithSeeds('B'), center + 1.78, -1.68, .36);
  add(root, limeTube(), center - 1.55, -1.58, .40);
  add(root, limeTube(), center + 3.63, -1.58, .40);
  add(root, createDeliveryTube({mirrored: true}), center - 1.18, .36, .25, [Math.PI / 2, 0, 0]);
  add(root, createDeliveryTube(), center + 1.14, .36, .25, [Math.PI / 2, 0, 0]);
  add(root, createDoubleHoleStopper(), center - 3.55, 2.30, .34);
  add(root, createDoubleHoleStopper(), center - 2.55, 2.30, .34);
  add(root, createLongStemFunnel(), center - .90, 2.28, .25, [0, 0, Math.PI / 2]);
  add(root, createLongStemFunnel(), center + .25, 2.28, .25, [0, 0, Math.PI / 2]);
  add(root, createWaterBeaker(), center + 2.70, 2.20, .36);
  add(root, createWaterBeaker(), center + 3.72, 2.20, .36);
}

function energyCatalog(root, center) {
  add(root, thermos('A'), center - 1.70, -1.62, .40);
  add(root, thermos('B'), center + 1.70, -1.62, .40);
  add(root, createThermometer(), center - 1.62, .62, .31, [0, 0, Math.PI / 2]);
  add(root, createThermometer(), center + 1.62, .62, .31, [0, 0, Math.PI / 2]);
  add(root, seedBeaker('A'), center - 2.28, 2.28, .36);
  add(root, seedBeaker('B'), center + 2.28, 2.28, .36);
  add(root, createPerforatedStopper(), center - .58, 2.28, .40);
  add(root, createPerforatedStopper(), center + .58, 2.28, .40);
}

export function populateStorageCatalog(scene, bench, activeId) {
  const root = new THREE.Group();
  root.name = `shared-storage-catalog-without-${activeId}`;
  const centers = Object.fromEntries(bench.zones.map(zone => [zone.id, zone.center]));
  if (activeId !== 'oxygen') oxygenCatalog(root, centers.oxygen);
  if (activeId !== 'carbon-dioxide') carbonCatalog(root, centers['carbon-dioxide']);
  if (activeId !== 'energy') energyCatalog(root, centers.energy);
  scene.add(root);
  return root;
}
