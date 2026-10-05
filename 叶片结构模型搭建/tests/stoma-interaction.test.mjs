import assert from 'node:assert/strict';
import {
  advanceGasParticleProgress,
  apertureLabel,
  apertureToRelativeFlux,
  gasParticleIsActive,
  poreLaneOffset,
} from '../js/stoma-interaction.js';

assert.equal(apertureLabel(0), '完全关闭');
assert.equal(apertureLabel(0.5), '打开一半');
assert.equal(apertureLabel(1), '完全打开');
assert.equal(apertureToRelativeFlux(0), 0);
assert(Math.abs(apertureToRelativeFlux(0.5) - 0.55) < 0.02);
assert.equal(apertureToRelativeFlux(1), 1);
assert.equal(gasParticleIsActive(0, 0.16), false);
assert.equal(gasParticleIsActive(0.55, 0.16), true);
assert.equal(gasParticleIsActive(0.55, 0.66), false);
assert.equal(gasParticleIsActive(1, 0.66), true);
const firstStep = advanceGasParticleProgress(0.1, 0.25, 1);
const slowerStep = advanceGasParticleProgress(0.1, 0.25, 0.5);
assert(firstStep.progress > slowerStep.progress);
const beforeSwitch = advanceGasParticleProgress(0.4, 0.016, 1).progress;
const afterSwitch = advanceGasParticleProgress(beforeSwitch, 0.016, 0).progress;
assert(afterSwitch > beforeSwitch);
assert(afterSwitch - beforeSwitch < 0.01);
const wrappedStep = advanceGasParticleProgress(0.99, 0.1, 1);
assert.equal(wrappedStep.wrapped, true);
assert(wrappedStep.progress < 0.1);
const fullWidth = 0.88 * 0.72 * 0.37;
for (const aperture of [0, 0.5, 1]) {
  for (const lane of [-1, -0.42, 0, 0.42, 1]) {
    const offset = poreLaneOffset(aperture, lane, fullWidth);
    assert(Math.abs(offset) <= fullWidth * aperture * 0.5);
  }
}

console.log('PASS: stomatal aperture states, nonlinear relative flux, and particle gating.');
