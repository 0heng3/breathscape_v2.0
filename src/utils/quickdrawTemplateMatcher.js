import templates from '../data/quickdrawRecognitionTemplates.json';

const defaultPointCount = templates.samplePoints || 32;

export function matchQuickDrawCategories(stroke, categories, options = {}) {
  const signature = strokeToSignature(stroke, options.pointCount || defaultPointCount);
  if (!signature) return [];

  return [...new Set(categories)]
    .filter((category) => templates.categories[category]?.length)
    .map((category) => {
      const categoryTemplates = templates.categories[category];
      const best = getBestTemplateMatch(signature, categoryTemplates);
      return {
        category,
        score: best.score,
        confidence: scoreToConfidence(best.score),
        templateKeyId: best.template?.key_id,
      };
    })
    .sort((a, b) => a.score - b.score);
}

export function strokeToSignature(stroke, pointCount = defaultPointCount) {
  const points = getStrokePoints(stroke);
  if (points.length < 2) return null;
  const normalized = normalizePoints(points);
  const resampled = resamplePoints(normalized, pointCount);
  const bounds = getBounds(normalized);
  const vector = getVector(normalized);
  return {
    points: resampled.map((point) => [round(point.x), round(point.y)]),
    features: {
      aspect: round(bounds.width / Math.max(bounds.height, 0.001)),
      closedness: round(getClosedness(normalized, bounds)),
      directionX: round(vector.x),
      directionY: round(vector.y),
      turnRate: round(getTurnRate(normalized)),
      strokeCount: Array.isArray(stroke?.drawing) ? stroke.drawing.length : 1,
    },
  };
}

function getBestTemplateMatch(signature, categoryTemplates) {
  let best = { score: Number.POSITIVE_INFINITY, template: null };
  for (const template of categoryTemplates) {
    const score = compareSignatures(signature, template);
    if (score < best.score) best = { score, template };
  }
  return best;
}

function compareSignatures(a, b) {
  const count = Math.min(a.points.length, b.points.length);
  if (!count) return Number.POSITIVE_INFINITY;
  let pointDistance = 0;
  for (let index = 0; index < count; index += 1) {
    const ap = a.points[index];
    const bp = b.points[index];
    pointDistance += Math.hypot(ap[0] - bp[0], ap[1] - bp[1]);
  }
  pointDistance /= count;

  const af = a.features;
  const bf = b.features;
  const featureDistance =
    Math.abs(Math.log(clamp(af.aspect, 0.08, 12)) - Math.log(clamp(bf.aspect, 0.08, 12))) * 0.11
    + Math.abs(af.closedness - bf.closedness) * 0.16
    + Math.abs(af.turnRate - bf.turnRate) * 0.13
    + Math.hypot(af.directionX - bf.directionX, af.directionY - bf.directionY) * 0.09
    + Math.min(1, Math.abs((af.strokeCount || 1) - (bf.strokeCount || 1)) / 4) * 0.04;

  return pointDistance * 0.72 + featureDistance;
}

function scoreToConfidence(score) {
  return clamp(1 - score / 0.72, 0, 1);
}

function getStrokePoints(stroke) {
  if (Array.isArray(stroke?.points) && stroke.points.length) {
    return stroke.points.map((point) => ({
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
    }));
  }

  const drawing = stroke?.simplifiedDrawing || stroke?.drawing || stroke?.normalizedDrawing;
  if (Array.isArray(drawing) && drawing.length) {
    return drawing.flatMap((quickStroke) => {
      const xs = quickStroke.x || quickStroke[0] || [];
      const ys = quickStroke.y || quickStroke[1] || [];
      return xs.map((x, index) => ({
        x: Number(x) || 0,
        y: Number(ys[index]) || 0,
      }));
    });
  }

  return [];
}

function normalizePoints(points) {
  const bounds = getBounds(points);
  const scale = 1 / Math.max(bounds.width, bounds.height, 1);
  return points.map((point) => ({
    x: (point.x - bounds.minX) * scale,
    y: (point.y - bounds.minY) * scale,
  }));
}

function resamplePoints(points, targetCount) {
  if (points.length <= 1) return points;
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances[index] = distances[index - 1] + distance(points[index - 1], points[index]);
  }
  const total = distances[distances.length - 1] || 1;
  return Array.from({ length: targetCount }, (_, index) => {
    const target = targetCount === 1 ? total / 2 : (total * index) / Math.max(1, targetCount - 1);
    const segment = findSegment(distances, target);
    const start = points[segment];
    const end = points[Math.min(segment + 1, points.length - 1)];
    const segmentLength = Math.max(0.001, distances[Math.min(segment + 1, distances.length - 1)] - distances[segment]);
    const local = clamp((target - distances[segment]) / segmentLength, 0, 1);
    return {
      x: start.x + (end.x - start.x) * local,
      y: start.y + (end.y - start.y) * local,
    };
  });
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
    width: Math.max(0.001, maxX - minX),
    height: Math.max(0.001, maxY - minY),
  };
}

function getVector(points) {
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function getClosedness(points, bounds) {
  const first = points[0];
  const last = points[points.length - 1];
  return clamp(1 - Math.hypot(last.x - first.x, last.y - first.y) / Math.max(bounds.width, bounds.height, 0.001), 0, 1);
}

function getTurnRate(points) {
  if (points.length < 3) return 0;
  let total = 0;
  for (let index = 2; index < points.length; index += 1) {
    const a = points[index - 2];
    const b = points[index - 1];
    const c = points[index];
    const ab = Math.atan2(b.y - a.y, b.x - a.x);
    const bc = Math.atan2(c.y - b.y, c.x - b.x);
    total += Math.abs(normalizeAngle(bc - ab));
  }
  return clamp(total / Math.max(1, points.length - 2) / Math.PI, 0, 1);
}

function findSegment(distances, target) {
  for (let index = 1; index < distances.length; index += 1) {
    if (target <= distances[index]) return index - 1;
  }
  return Math.max(0, distances.length - 2);
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function normalizeAngle(angle) {
  let next = angle;
  while (next <= -Math.PI) next += Math.PI * 2;
  while (next > Math.PI) next -= Math.PI * 2;
  return next;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number(value.toFixed(4));
}
