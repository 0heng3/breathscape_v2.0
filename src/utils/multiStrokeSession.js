import {
  jitterQuickDrawDrawing,
  normalizeQuickDrawDrawing,
  resampleQuickDrawDrawing,
  simplifyQuickDrawDrawing,
  strokeToQuickDrawStroke,
} from './strokeProcessing';

export const DEFAULT_DRAWING_SETTLE_MS = 1400;

export function createMultiStrokeDrawing(strokes, options = {}) {
  const validStrokes = (strokes || []).filter((stroke) => Array.isArray(stroke?.points) && stroke.points.length);
  if (!validStrokes.length) return null;

  const points = validStrokes.flatMap((stroke) => stroke.points);
  const rawDrawing = validStrokes.map((stroke) => strokeToQuickDrawStroke(stroke));
  const boundingBox = getBoundingBox(points);
  const length = validStrokes.reduce((sum, stroke) => sum + (Number(stroke.length) || getStrokeLength(stroke.points)), 0);
  const duration = Math.max(1, getSessionDuration(validStrokes));
  const normalized = normalizeQuickDrawDrawing(rawDrawing, options.size || 256);
  const resampled = resampleQuickDrawDrawing(normalized.drawing, options.spacing || 1);
  const simplified = simplifyQuickDrawDrawing(resampled.drawing, options.epsilon || 2);
  const drawing = jitterQuickDrawDrawing(
    simplified.drawing,
    options.jitter ?? 0,
    validStrokes.map((stroke) => stroke.id).join(':') || 'multi-stroke',
  ).drawing;
  const vector = getVector(points);
  const density = getDensity(points, boundingBox);
  const closedness = getClosedness(points, boundingBox);

  return {
    id: validStrokes.map((stroke) => stroke.id).join('-'),
    sourceStrokeIds: validStrokes.map((stroke) => stroke.id),
    points,
    rawDrawing,
    normalizedDrawing: normalized.drawing,
    resampledDrawing: resampled.drawing,
    simplifiedDrawing: simplified.drawing,
    drawing,
    boundingBox,
    normalizedBoundingBox: normalized.boundingBox,
    pointCount: points.length,
    strokeCount: validStrokes.length,
    duration,
    length,
    speed: clamp(length / duration / 1.18, 0, 1),
    speedAvg: clamp(length / duration / 1.18, 0, 1),
    density,
    densityLocal: density,
    direction: getDirectionMain(points, boundingBox, vector, closedness),
    directionMain: getDirectionMain(points, boundingBox, vector, closedness),
    vectorX: vector.x,
    vectorY: vector.y,
    rawVectorX: vector.rawX,
    rawVectorY: vector.rawY,
    closedness,
    centerX: boundingBox.x + boundingBox.width / 2,
    centerY: boundingBox.y + boundingBox.height / 2,
    zone: getZone(boundingBox, validStrokes[0]),
    canvasWidth: validStrokes[0].canvasWidth,
    canvasHeight: validStrokes[0].canvasHeight,
    stageRect: validStrokes[0].stageRect,
    createdAt: Date.now(),
    quickdraw: {
      rawDrawing,
      normalizedDrawing: normalized.drawing,
      resampledDrawing: resampled.drawing,
      simplifiedDrawing: simplified.drawing,
      drawing,
      features: {
        strokeCount: validStrokes.length,
        pointCount: points.length,
        duration,
        length,
        density,
        boundingBox,
        closedness,
      },
    },
  };
}

function getBoundingBox(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function getSessionDuration(strokes) {
  const starts = strokes.map((stroke) => stroke.points[0]?.t || 0);
  const ends = strokes.map((stroke) => stroke.points[stroke.points.length - 1]?.t || 0);
  return Math.max(...ends) - Math.min(...starts);
}

function getStrokeLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return length;
}

function getDensity(points, bounds) {
  return clamp(points.length / Math.max((bounds.width * bounds.height) / 220, 1), 0, 1);
}

function getVector(points) {
  if (points.length < 2) return { x: 1, y: 0, rawX: 0, rawY: 0 };
  const first = points[0];
  const last = points[points.length - 1];
  const rawX = last.x - first.x;
  const rawY = last.y - first.y;
  const length = Math.hypot(rawX, rawY) || 1;
  return { x: rawX / length, y: rawY / length, rawX, rawY };
}

function getClosedness(points, bounds) {
  if (points.length < 4) return 0;
  const first = points[0];
  const last = points[points.length - 1];
  return clamp(1 - Math.hypot(last.x - first.x, last.y - first.y) / Math.max(bounds.width, bounds.height, 1), 0, 1);
}

function getDirectionMain(points, bounds, vector, closedness) {
  if (closedness > 0.7) return 'loop';
  if (bounds.width > bounds.height * 1.45) return vector.x >= 0 ? 'right' : 'left';
  if (bounds.height > bounds.width * 1.45) return vector.y >= 0 ? 'down' : 'up';
  if (Math.abs(vector.x) > Math.abs(vector.y) * 1.35) return vector.x >= 0 ? 'right' : 'left';
  if (Math.abs(vector.y) > Math.abs(vector.x) * 1.35) return vector.y >= 0 ? 'down' : 'up';
  return 'mixed';
}

function getZone(bounds, stroke) {
  const height = stroke?.canvasHeight || stroke?.stageRect?.height || 540;
  const centerY = bounds.y + bounds.height / 2;
  if (centerY < height * 0.38) return 'sky';
  if (centerY > height * 0.62) return 'ground';
  return 'middle';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
