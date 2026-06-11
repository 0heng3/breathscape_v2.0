let modelPromise = null;

export function loadQuickDrawSketchModel(url = '/quickdraw-model/model.json') {
  if (!modelPromise) {
    modelPromise = fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }
  return modelPromise;
}

export function classifyWithQuickDrawModel(drawing, model) {
  if (!model?.weights?.length || !model?.labels?.length) return null;
  const features = drawingToFeatures(drawing, model.gridSize || 16);
  if (!features || features.length !== model.inputSize) return null;
  const logits = model.weights.map((row, index) => dot(row, features) + (model.bias?.[index] || 0));
  const probs = softmax(logits);
  const ranked = probs
    .map((confidence, index) => ({
      category: model.labels[index],
      toolId: model.categoryToTool?.[model.labels[index]],
      confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence);
  return {
    ...ranked[0],
    alternatives: ranked.slice(0, 5),
  };
}

function drawingToFeatures(drawing, size) {
  const rawDrawing = drawing.rawDrawing || drawing.quickdraw?.rawDrawing || drawing.drawing;
  const strokes = Array.isArray(rawDrawing)
    ? rawDrawing
      .map((stroke) => {
        const xs = stroke.x || stroke[0] || [];
        const ys = stroke.y || stroke[1] || [];
        return xs.map((x, index) => ({ x: Number(x), y: Number(ys[index]) })).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
      })
      .filter((stroke) => stroke.length >= 2)
    : [];
  const points = strokes.flat();
  if (points.length < 2) return null;
  const bounds = getBounds(points);
  const scale = (size - 1) / Math.max(bounds.width, bounds.height, 1);
  const grid = Array(size * size).fill(0);
  for (const stroke of strokes) {
    for (let index = 1; index < stroke.length; index += 1) {
      const a = normalizePoint(stroke[index - 1], bounds, scale);
      const b = normalizePoint(stroke[index], bounds, scale);
      drawGridLine(grid, size, a, b);
    }
  }
  const length = getLength(points);
  const diagonal = Math.hypot(bounds.width, bounds.height) || 1;
  const vector = {
    x: (points[points.length - 1].x - points[0].x) / diagonal,
    y: (points[points.length - 1].y - points[0].y) / diagonal,
  };
  return [
    ...grid,
    clamp(bounds.width / Math.max(bounds.height, 1), 0, 8) / 8,
    clamp(bounds.height / Math.max(bounds.width, 1), 0, 8) / 8,
    clamp(strokes.length / 12, 0, 1),
    clamp(points.length / 240, 0, 1),
    clamp(length / Math.max(diagonal * 8, 1), 0, 1),
    clamp(getClosedness(points, bounds), 0, 1),
    clamp((vector.x + 1) / 2, 0, 1),
    clamp((vector.y + 1) / 2, 0, 1),
  ].map((value) => Number(value) || 0);
}

function normalizePoint(point, bounds, scale) {
  return {
    x: (point.x - bounds.minX) * scale,
    y: (point.y - bounds.minY) * scale,
  };
}

function drawGridLine(grid, size, a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t);
    if (x >= 0 && x < size && y >= 0 && y < size) grid[y * size + x] = 1;
  }
}

function getBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function getLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return length;
}

function getClosedness(points, bounds) {
  return 1 - Math.hypot(points.at(-1).x - points[0].x, points.at(-1).y - points[0].y) / Math.max(bounds.width, bounds.height, 1);
}

function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0) || 1;
  return exps.map((value) => value / sum);
}

function dot(a, b) {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += a[index] * b[index];
  return sum;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
