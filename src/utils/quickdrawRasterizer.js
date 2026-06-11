export function extractQuickDrawStrokes(drawing) {
  const rawDrawing = drawing?.rawDrawing || drawing?.quickdraw?.rawDrawing || drawing?.drawing || drawing;
  if (!Array.isArray(rawDrawing)) return [];
  return rawDrawing
    .map((stroke) => {
      const xs = stroke?.x || stroke?.[0] || [];
      const ys = stroke?.y || stroke?.[1] || [];
      return xs
        .map((x, index) => ({ x: Number(x), y: Number(ys[index]) }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    })
    .filter((stroke) => stroke.length >= 2);
}

export function rasterizeQuickDrawDrawing(drawing, size = 32, options = {}) {
  const strokes = extractQuickDrawStrokes(drawing);
  const points = strokes.flat();
  if (points.length < 2) return null;

  const bounds = getBounds(points);
  const padding = Number(options.padding ?? 3);
  const drawableSize = Math.max(1, size - padding * 2);
  const scale = drawableSize / Math.max(bounds.width, bounds.height, 1);
  const offsetX = padding + (drawableSize - bounds.width * scale) / 2;
  const offsetY = padding + (drawableSize - bounds.height * scale) / 2;
  const grid = new Float32Array(size * size);
  const brushRadius = Number(options.brushRadius ?? 0.85);

  for (const stroke of strokes) {
    for (let index = 1; index < stroke.length; index += 1) {
      const a = normalizePoint(stroke[index - 1], bounds, scale, offsetX, offsetY);
      const b = normalizePoint(stroke[index], bounds, scale, offsetX, offsetY);
      drawSoftLine(grid, size, a, b, brushRadius);
    }
  }

  return grid;
}

export function rasterToDataUrl(raster, size = 64, options = {}) {
  if (!raster || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const background = options.background || '#fff8ea';
  const ink = options.ink || [45, 43, 39];
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  for (let index = 0; index < raster.length; index += 1) {
    const value = Math.max(0, Math.min(1, Number(raster[index]) || 0));
    const offset = index * 4;
    const shade = 1 - value;
    imageData.data[offset] = Math.round(ink[0] * value + 255 * shade);
    imageData.data[offset + 1] = Math.round(ink[1] * value + 248 * shade);
    imageData.data[offset + 2] = Math.round(ink[2] * value + 234 * shade);
    imageData.data[offset + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function normalizePoint(point, bounds, scale, offsetX, offsetY) {
  return {
    x: (point.x - bounds.minX) * scale + offsetX,
    y: (point.y - bounds.minY) * scale + offsetY,
  };
}

function drawSoftLine(grid, size, a, b, radius) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2.4));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    stampBrush(grid, size, x, y, radius);
  }
}

function stampBrush(grid, size, x, y, radius) {
  const minX = Math.max(0, Math.floor(x - radius - 1));
  const maxX = Math.min(size - 1, Math.ceil(x + radius + 1));
  const minY = Math.max(0, Math.floor(y - radius - 1));
  const maxY = Math.min(size - 1, Math.ceil(y + radius + 1));
  for (let yy = minY; yy <= maxY; yy += 1) {
    for (let xx = minX; xx <= maxX; xx += 1) {
      const distance = Math.hypot(xx - x, yy - y);
      const value = Math.max(0, 1 - distance / Math.max(radius + 1, 1));
      const index = yy * size + xx;
      if (value > grid[index]) grid[index] = value;
    }
  }
}

function getBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}
