import assert from 'node:assert/strict';
import {createLeafVein} from '../js/leaf-vein-model.js';

for (const parameters of [
  {veinSize: 0.72, xylemCount: 2, phloemCount: 3},
  {veinSize: 1, xylemCount: 4, phloemCount: 6},
  {veinSize: 1.32, xylemCount: 7, phloemCount: 7},
  {veinSize: 1.42, xylemCount: 8, phloemCount: 10},
]) {
  const vein = createLeafVein(parameters);
  const current = vein.getParameters();
  assert.equal(vein.getXylemTubes().length, current.xylemCount);
  assert.equal(vein.getPhloemTubes().length, current.phloemCount);
  assert(vein.getXylemTubes().every((tube) => tube.userData.tissueRole === 'xylem'));
  assert(vein.getPhloemTubes().every((tube) => tube.userData.tissueRole === 'phloem'));
  assert(vein.getXylemTubes().every((tube) => tube.userData.conduitShape === 'cylinder'));
  assert(vein.getPhloemTubes().every((tube) => tube.userData.conduitShape === 'cylinder'));
  assert(vein.getXylemTubes().every((tube) => tube.getObjectByName(`${tube.name}_Body`).geometry.type === 'CylinderGeometry'));
  assert(vein.getPhloemTubes().every((tube) => tube.getObjectByName(`${tube.name}_Body`).geometry.type === 'CylinderGeometry'));
  assert(vein.getXylemTubes().every((tube) => tube.position.y > 0), 'Xylem cylinders stay in the upper half');
  assert(vein.getPhloemTubes().every((tube) => tube.position.y < 0), 'Phloem cylinders stay in the lower half');
  assert(vein.getBundleSheath());
  assert.equal(vein.root.getObjectByName('BundleSheath_Cap'), undefined, 'Transparent bundle sheath must not create protruding end caps');
  assert.equal(vein.root.getObjectByName('BundleSheath_Body').geometry.parameters.openEnded, true, 'Transparent sheath ends remain open');
  assert.equal(vein.root.getObjectByName('CambiumBoundary'), undefined, 'No rectangular divider remains inside the bundle');
  assert.equal(vein.root.userData.crossSectionShape, 'elliptical');
  assert(vein.root.getObjectByName('InteractionHitbox'));
  assert.equal(vein.root.userData.orientation.upper, 'xylem');
  assert.equal(vein.root.userData.orientation.lower, 'phloem');
  const bounds = vein.getLocalBounds();
  assert(bounds.max.x > bounds.min.x);
  assert(bounds.max.y > bounds.min.y);
  assert(bounds.max.z > bounds.min.z);

  const serialized = vein.serialize();
  assert.deepEqual(serialized.parameters, current);
  assert.deepEqual(serialized.orientation, {upper: 'xylem', lower: 'phloem'});
  const clone = vein.clone();
  assert.deepEqual(clone.getParameters(), current);
  assert.notEqual(clone.root, vein.root);
  clone.dispose();
  vein.dispose();
}

console.log('PASS: leaf vein sheath, xylem, phloem, orientation, anchors, clone, and serialization.');

const packedVein = createLeafVein();
assert.equal(packedVein.getXylemTubes().length, 7);
assert.equal(packedVein.getPhloemTubes().length, 7);
for (const tubes of [packedVein.getXylemTubes(), packedVein.getPhloemTubes()]) {
  const roundedRows = new Map();
  for (const tube of tubes) {
    const rowKey = tube.position.y.toFixed(4);
    roundedRows.set(rowKey, (roundedRows.get(rowKey) || 0) + 1);
  }
  assert.deepEqual([...roundedRows.values()].sort(), [2, 2, 3], 'Seven tubes use a 2–3–2 close-packed cross-section');
}
const lowestXylem = Math.min(...packedVein.getXylemTubes().map(tube => tube.position.y - 0.14 * packedVein.getParameters().veinSize));
const highestPhloem = Math.max(...packedVein.getPhloemTubes().map(tube => tube.position.y + 0.115 * packedVein.getParameters().veinSize));
assert(lowestXylem > highestPhloem && lowestXylem - highestPhloem < 0.08, 'Xylem and phloem are close without overlap');
packedVein.dispose();
