export const clamp01 = value => Math.min(1, Math.max(0, Number(value) || 0));

// 气孔开度与相对通量并非严格线性。该曲线用于定性教学演示：
// 半开时约为全开的 55%，完全关闭时气孔通道为 0。
export function apertureToRelativeFlux(aperture) {
  const normalized = clamp01(aperture);
  if (normalized <= 0.01) return 0;
  return Math.pow(normalized, 0.86);
}

export function apertureLabel(aperture) {
  const normalized = clamp01(aperture);
  if (normalized <= 0.01) return '完全关闭';
  if (Math.abs(normalized - 0.5) <= 0.01) return '打开一半';
  if (normalized >= 0.99) return '完全打开';
  return `打开 ${Math.round(normalized * 100)}%`;
}

export function gasParticleIsActive(relativeFlux, activationThreshold) {
  return clamp01(relativeFlux) >= clamp01(activationThreshold);
}

export function advanceGasParticleProgress(progress, deltaSeconds, relativeFlux, playbackSpeed = 1) {
  const current = clamp01(progress);
  const speed = 0.16 + 0.06 * clamp01(relativeFlux);
  const distance = Math.max(0, Number(deltaSeconds) || 0) * Math.max(0, Number(playbackSpeed) || 0) * speed;
  const unwrapped = current + distance;
  return {progress: unwrapped % 1, wrapped: unwrapped >= 1};
}

export function poreLaneOffset(aperture, lane, maximumPoreWidth) {
  const safeLane = Math.min(0.9, Math.max(-0.9, Number(lane) || 0));
  return safeLane * Math.max(0, Number(maximumPoreWidth) || 0) * clamp01(aperture) * 0.5;
}
