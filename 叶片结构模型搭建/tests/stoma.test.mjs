import assert from 'node:assert/strict';
import {createStoma} from '../js/stoma-model.js';

for (const parameters of [
  {aperture: 0, guardCellSize: 0.72, chloroplastCount: 0},
  {aperture: 0.42, guardCellSize: 1, chloroplastCount: 8},
  {aperture: 1, guardCellSize: 1.35, chloroplastCount: 20},
]) {
  const stoma = createStoma(parameters);
  const current = stoma.getParameters();
  assert.equal(stoma.getGuardCells().length, 2);
  assert.equal(stoma.getGuardCells()[0].userData.cellRole, 'guard-cell');
  assert.equal(stoma.getGuardCells()[1].userData.cellRole, 'guard-cell');
  assert(stoma.getPore());
  assert(stoma.root.getObjectByName('InteractionHitbox'));
  assert.equal(stoma.root.userData.compatibleAnchorType, 'stoma-slot');
  assert.equal(stoma.anchors.mount.userData.anchorType, 'mount');
  assert(stoma.getMountFootprint().width > 0);
  assert(stoma.getMountFootprint().depth > 0);
  const bounds = stoma.getLocalBounds();
  assert(bounds.max.x > bounds.min.x);
  assert(bounds.max.y > bounds.min.y);
  assert(bounds.max.z > bounds.min.z);

  const serialized = stoma.serialize();
  assert.deepEqual(serialized.parameters, current);
  assert.equal(serialized.compatibleAnchorType, 'stoma-slot');
  const clone = stoma.clone();
  assert.deepEqual(clone.getParameters(), current);
  assert.notEqual(clone.root, stoma.root);
  clone.dispose();
  stoma.dispose();
}

const animated = createStoma();
const closedWidth = animated.getMountFootprint().width;
animated.getPore().geometry.computeBoundingBox();
const closedPoreWidth = animated.getPore().geometry.boundingBox.max.x - animated.getPore().geometry.boundingBox.min.x;
animated.setAperture(1);
assert.equal(animated.getParameters().aperture, 1);
animated.getPore().geometry.computeBoundingBox();
const openPoreWidth = animated.getPore().geometry.boundingBox.max.x - animated.getPore().geometry.boundingBox.min.x;
assert.equal(animated.getMountFootprint().width, closedWidth);
assert(openPoreWidth > closedPoreWidth);
animated.dispose();

console.log('PASS: guard-cell pair, stomatal aperture, chloroplasts, mount interface, clone, and serialization.');
