const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hashUnit(...values) {
  let state = 2166136261;
  for (const value of values.join(':')) {
    state ^= value.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return (state >>> 0) / 4294967295;
}

function spatialRandom(seed, row, column, salt = 0) {
  let state = (Math.round(seed) ^ Math.imul(Math.round((row + 1) * 1000), 0x9e3779b1)
    ^ Math.imul(Math.round((column + 1) * 1000), 0x85ebca6b) ^ salt) >>> 0;
  state = Math.imul(state ^ (state >>> 16), 0x7feb352d);
  state = Math.imul(state ^ (state >>> 15), 0x846ca68b);
  state ^= state >>> 16;
  return (state >>> 0) / 4294967295;
}

export function normalizeLayoutMode(value) {
  return value === 'mosaic' ? 'mosaic' : 'regular';
}

export function epidermisDimensions(parameters) {
  const cellDepth = parameters.cellWidth * 0.84;
  return {
    cellDepth,
    width: parameters.columns * parameters.cellWidth + (parameters.columns - 1) * parameters.gap,
    height: parameters.layerThickness,
    depth: parameters.rows * cellDepth + (parameters.rows - 1) * parameters.gap,
  };
}

export function gridCellCenter(parameters, row, column) {
  const size = epidermisDimensions(parameters);
  return {
    x: (column - (parameters.columns - 1) * 0.5) * (parameters.cellWidth + parameters.gap),
    z: (row - (parameters.rows - 1) * 0.5) * (size.cellDepth + parameters.gap),
  };
}

function mosaicPitch(parameters) {
  const size = epidermisDimensions(parameters);
  return {size, pitchX: size.width / parameters.columns, pitchZ: size.depth / parameters.rows};
}

function mosaicVertex(parameters, rowBoundary, columnBoundary) {
  const {size, pitchX, pitchZ} = mosaicPitch(parameters);
  const isTopOrBottom = rowBoundary === 0 || rowBoundary === parameters.rows;
  const isLeftOrRight = columnBoundary === 0 || columnBoundary === parameters.columns;
  let x = -size.width * 0.5 + columnBoundary * pitchX;
  let z = -size.depth * 0.5 + rowBoundary * pitchZ;
  const jitterX = (hashUnit('vertex-x', rowBoundary, columnBoundary) - 0.5) * pitchX * 0.3;
  const jitterZ = (hashUnit('vertex-z', rowBoundary, columnBoundary) - 0.5) * pitchZ * 0.3;
  if (!isLeftOrRight) x += jitterX;
  if (!isTopOrBottom) z += jitterZ;
  return {x, z};
}

function sampleWavyEdge(start, end, edgeKey, boundary = false) {
  const points = [];
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz) || 1;
  const normalX = -dz / length;
  const normalZ = dx / length;
  const amplitude = boundary ? 0 : length * (0.13 + hashUnit(edgeKey, 'amplitude') * 0.055);
  const phase = (hashUnit(edgeKey, 'phase') - 0.5) * Math.PI * 0.7;
  const direction = hashUnit(edgeKey, 'direction') > 0.5 ? 1 : -1;
  const samples = 12;
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const envelope = Math.sin(Math.PI * t);
    const lobe = Math.sin(Math.PI * 4 * t + phase) * 0.72
      + Math.sin(Math.PI * 6 * t - phase * 0.65) * 0.28;
    const offset = amplitude * envelope * lobe * direction;
    points.push({
      x: start.x + dx * t + normalX * offset,
      z: start.z + dz * t + normalZ * offset,
    });
  }
  return points;
}

function horizontalEdge(parameters, rowBoundary, column) {
  return sampleWavyEdge(
    mosaicVertex(parameters, rowBoundary, column),
    mosaicVertex(parameters, rowBoundary, column + 1),
    `horizontal:${rowBoundary}:${column}`,
    rowBoundary === 0 || rowBoundary === parameters.rows,
  );
}

function verticalEdge(parameters, row, columnBoundary) {
  return sampleWavyEdge(
    mosaicVertex(parameters, row, columnBoundary),
    mosaicVertex(parameters, row + 1, columnBoundary),
    `vertical:${row}:${columnBoundary}`,
    columnBoundary === 0 || columnBoundary === parameters.columns,
  );
}

function appendEdge(target, edge, reverse = false) {
  const ordered = reverse ? [...edge].reverse() : edge;
  target.push(...ordered.slice(target.length ? 1 : 0));
}

export function mosaicCellOutline(parameters, row, column) {
  const center = gridCellCenter(parameters, row, column);
  const polygon = [];
  appendEdge(polygon, horizontalEdge(parameters, row, column));
  appendEdge(polygon, verticalEdge(parameters, row, column + 1));
  appendEdge(polygon, horizontalEdge(parameters, row + 1, column), true);
  appendEdge(polygon, verticalEdge(parameters, row, column), true);
  return polygon.map(point => [point.x - center.x, point.z - center.z]);
}

function candidateJunctions(parameters, seed) {
  const candidates = [];
  for (let row = 1; row < parameters.rows; row += 1) {
    for (let column = 1; column < parameters.columns; column += 1) {
      const vertex = mosaicVertex(parameters, row, column);
      candidates.push({
        ...vertex,
        row,
        column,
        rotation: spatialRandom(seed, row, column, 0x57a91e) * Math.PI,
        tieBreaker: spatialRandom(seed, row, column, 0x2634f1),
      });
    }
  }

  if (candidates.length < 10) {
    for (let row = 0; row < parameters.rows; row += 1) {
      for (let column = 1; column < parameters.columns; column += 1) {
        const a = mosaicVertex(parameters, row, column);
        const b = mosaicVertex(parameters, row + 1, column);
        candidates.push({
          x: (a.x + b.x) * 0.5,
          z: (a.z + b.z) * 0.5,
          row: row + 0.5,
          column,
          rotation: spatialRandom(seed, row + 0.5, column, 0x57a91e) * Math.PI,
          tieBreaker: spatialRandom(seed, row + 0.5, column, 0x2634f1),
        });
      }
    }
  }
  return candidates;
}

export function distributedStomaSlots(parameters, count, seed = 1) {
  const requested = Math.max(0, Math.round(Number(count) || 0));
  if (!requested) return [];
  const candidates = candidateJunctions(parameters, seed);
  if (!candidates.length) return [];
  const {size} = mosaicPitch(parameters);
  const selected = [];
  const targetCount = Math.min(requested, candidates.length);
  const available = [...candidates].sort((a, b) => a.tieBreaker - b.tieBreaker);

  // Seeded candidate order gives a natural irregular scatter. The distance
  // gate prevents the random choices from bunching up in one small region.
  for (const candidate of available) {
    const separation = selected.length
      ? Math.min(...selected.map(item => Math.hypot(
        (candidate.x - item.x) / size.width,
        (candidate.z - item.z) / size.depth,
      )))
      : Infinity;
    if (separation >= 0.18) selected.push(candidate);
    if (selected.length === targetCount) return selected;
  }

  const remaining = available.filter(candidate => !selected.includes(candidate));
  while (selected.length < targetCount) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const separation = Math.min(...selected.map(item => Math.hypot(
          (candidate.x - item.x) / size.width,
          (candidate.z - item.z) / size.depth,
      )));
      const score = separation + candidate.tieBreaker * 0.01;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  return selected;
}

export function clampStomaCount(value, min, max, rows, columns) {
  const available = Math.max(1, (rows - 1) * (columns - 1) + rows * Math.max(0, columns - 1));
  return Math.round(clamp(Number(value), min, Math.min(max, available)));
}
