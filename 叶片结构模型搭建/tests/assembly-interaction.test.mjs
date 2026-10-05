import assert from 'node:assert/strict';
import {serializeAssemblyItem, offsetCopyRecord} from '../js/assembly-interaction.js';

const fakeItem = {
  type: 'cell',
  parameters: {shape: 'column', width: 2, height: 4, chloroplastCount: 18},
  root: {
    position: {toArray: () => [1, 2, 3]},
    quaternion: {toArray: () => [0, 0, 0, 1]},
    scale: {toArray: () => [1, 1, 1]},
  },
};
const serialized = serializeAssemblyItem(fakeItem);
assert.deepEqual(serialized.transform.position, [1, 2, 3]);
assert.deepEqual(serialized.parameters, fakeItem.parameters);

const copy = offsetCopyRecord(serialized);
assert.deepEqual(copy.transform.position, [1.45, 2.25, 3.35]);
assert.deepEqual(copy.transform.quaternion, [0, 0, 0, 1]);
assert.notEqual(copy.parameters, serialized.parameters);

console.log('PASS: free 3D assembly serialization and independent-copy offset.');
