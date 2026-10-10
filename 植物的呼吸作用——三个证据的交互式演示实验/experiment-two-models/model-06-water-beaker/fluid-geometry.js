import * as THREE from '../../shared/vendor/three.module.js';

// Adapted from photosynthesis-co2-lab/fluid-geometry.js.
// Builds a closed liquid volume whose free surface stays WORLD-horizontal
// while the tapered beaker rotates around the Z axis.
export function beakerFluid(angle, fraction, bottomRadius, topRadius, bottom, top) {
  const segments = 40;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const samples = [];
  const radiusAt = y => THREE.MathUtils.lerp(bottomRadius, topRadius, (y - bottom) / (top - bottom));
  for (let yIndex = 0; yIndex < 20; yIndex += 1) {
    const y = bottom + (yIndex + .5) / 20 * (top - bottom);
    const radius = radiusAt(y);
    for (let radialIndex = 0; radialIndex < 8; radialIndex += 1) {
      for (let angleIndex = 0; angleIndex < 20; angleIndex += 1) {
        const radial = radius * Math.sqrt((radialIndex + .5) / 8);
        const theta = (angleIndex + .5) / 20 * Math.PI * 2;
        samples.push(sin * radial * Math.cos(theta) + cos * y);
      }
    }
  }
  samples.sort((a, b) => a - b);
  const clampedFraction = THREE.MathUtils.clamp(fraction, .001, .97);
  const level = samples[Math.min(samples.length - 1, Math.floor(clampedFraction * samples.length))];
  const vertices = [];
  const rim = [];
  const value = point => sin * point[0] + cos * point[1] - level;

  function polygon(polygonPoints) {
    const clipped = [];
    for (let index = 0; index < polygonPoints.length; index += 1) {
      const a = polygonPoints[index];
      const b = polygonPoints[(index + 1) % polygonPoints.length];
      const valueA = value(a);
      const valueB = value(b);
      if (valueA <= 0) clipped.push(a);
      if ((valueA <= 0) !== (valueB <= 0)) {
        const mix = valueA / (valueA - valueB);
        const point = a.map((coordinate, axis) => coordinate + (b[axis] - coordinate) * mix);
        clipped.push(point);
        rim.push(point);
      }
    }
    for (let index = 1; index < clipped.length - 1; index += 1) {
      vertices.push(...clipped[0], ...clipped[index], ...clipped[index + 1]);
    }
  }

  const low = [];
  const high = [];
  for (let index = 0; index < segments; index += 1) {
    const theta = index / segments * Math.PI * 2;
    low.push([bottomRadius * Math.cos(theta), bottom, bottomRadius * Math.sin(theta)]);
    high.push([topRadius * Math.cos(theta), top, topRadius * Math.sin(theta)]);
  }
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    polygon([low[index], low[next], high[next], high[index]]);
  }
  polygon([...low].reverse());
  polygon(high);
  if (rim.length >= 3) {
    const center = rim.reduce((sum, point) => sum.map((valueAtAxis, axis) => valueAtAxis + point[axis] / rim.length), [0, 0, 0]);
    rim.sort((a, b) => Math.atan2(a[2] - center[2], cos * (a[0] - center[0]) - sin * (a[1] - center[1]))
      - Math.atan2(b[2] - center[2], cos * (b[0] - center[0]) - sin * (b[1] - center[1])));
    for (let index = 0; index < rim.length; index += 1) {
      vertices.push(...center, ...rim[index], ...rim[(index + 1) % rim.length]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}
