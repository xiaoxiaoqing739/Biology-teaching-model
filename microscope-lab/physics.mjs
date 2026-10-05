export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const CONDENSER_FIXED_FACTOR = 0.75;

export function objectiveIndex(objective) {
  return [4, 10, 40].indexOf(Number(objective));
}

export function opticalState(state) {
  const index = Math.max(0, objectiveIndex(state.objective));
  const target = 5 + [0, 0.025, 0.07][index];
  const tolerance = [0.7, 0.32, 0.10][index];
  const error = Math.abs(state.coarse + state.fine - target);
  const clear = error < tolerance * 0.28;
  const blur = clamp(error / tolerance * 6, 0, 30);
  const magnification = state.objective * state.eyepiece;
  const scale = state.objective / 10 * state.eyepiece / 10;
  const apertureFactor = [0.13, 0.28, 0.48, 0.73, 1][state.aperture];
  const brightness = clamp(
    (state.power ? 1 : 0) *
    (0.55 + 0.45 * CONDENSER_FIXED_FACTOR) *
    state.intensity / 70 *
    apertureFactor / 0.73 *
    [1.15, 1, 0.65][index], 0, 1.8
  );
  return {
    index, target, tolerance, error, clear, blur, magnification, scale, brightness,
    imageX: -state.slideX * 640 * scale,
    imageY: -state.slideY * 640 * scale
  };
}

export function applyMechanicalLimit(state) {
  const minimum = state.objective === 40 ? 4 : state.objective === 10 ? 2.6 : 0;
  const sum = state.coarse + state.fine;
  if (sum < minimum) {
    state.coarse = clamp(minimum - state.fine, 0, 10);
    return true;
  }
  return false;
}

export function canRotateTurret(state) {
  return state.coarse + state.fine >= 4.25;
}

export function moveSlide(state, dx, dy) {
  state.slideX = clamp(state.slideX + dx, -0.8, 0.8);
  state.slideY = clamp(state.slideY + dy, -0.8, 0.8);
}
