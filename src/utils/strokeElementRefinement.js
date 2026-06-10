import { clamp, clampPlacementToStage } from './coordinateUtils';

const directionalTools = new Set([
  'bridge',
  'constellationLine',
  'rainbow',
  'shadow',
  'signpost',
  'snailTrail',
  'soilLine',
  'softWind',
  'waterLine',
  'wind',
  'windBell',
  'windLine',
]);

const uprightTools = new Set([
  'bud',
  'firstFlower',
  'flower',
  'grass',
  'lantern',
  'memorySeed',
  'moss',
  'mushroom',
  'quietFlower',
  'reed',
  'seed',
  'smallTree',
  'sprout',
]);

const skyScatterTools = new Set([
  'cloud',
  'dew',
  'firefly',
  'moon',
  'moonbeam',
  'rain',
  'rainDrop',
  'star',
  'sun',
  'sunlight',
]);

export function refinePlacementFromStroke(placement, stroke, toolConfig, stageRectInput, context = {}) {
  const stageRect = normalizeStageRect(stageRectInput);
  const toolId = placement.tool || toolConfig?.id || stroke.tool || 'seed';
  const points = normalizePoints(stroke.points || [], stageRect);
  const bounds = normalizeBounds(stroke.boundingBox, points);
  const count = Math.max(1, Number(context.count || 1));
  const index = Number(context.index || 0);
  const profile = getRefinementProfile(toolId, toolConfig?.placementRule);
  const strokeSpan = Math.max(bounds.width, bounds.height, Number(stroke.length || 0) * 0.22, 18);
  const density = clamp(Number(stroke.densityLocal ?? stroke.density ?? 0), 0, 1);
  const speed = clamp(Number(stroke.speedAvg ?? stroke.speed ?? 0.35), 0, 1);
  const baseSize = Number(placement.size || 56);
  const multiFactor = count > 1 ? clamp(1 / Math.sqrt(count) + 0.18, 0.52, 0.86) : 1;
  const strokeSize = clamp(strokeSpan * profile.strokeScale * multiFactor, profile.minSize, profile.maxSize);
  const size = blend(baseSize, strokeSize, profile.fitStrength);
  const aspect = getSafeAspect(bounds, profile);
  const aspectFactor = Math.sqrt(aspect);
  const sizeX = clamp(size * aspectFactor * profile.widthBias, profile.minSize, profile.maxSize * profile.maxWidthMultiplier);
  const sizeY = clamp(size / aspectFactor * profile.heightBias, profile.minSize, profile.maxSize * profile.maxHeightMultiplier);
  const childAngle = getStrokeAngle(points);
  const targetRotation = getRefinedRotation(toolId, placement.rotation, childAngle, profile);
  const targetPoint = getRefinedAnchor(placement, bounds, profile, count, index);
  const opacityPenalty = density > 0.82 ? (density - 0.82) * 0.45 : 0;
  const opacity = clamp((placement.opacity ?? 1) - opacityPenalty, 0.68, 1);
  const next = {
    ...placement,
    x: targetPoint.x,
    y: targetPoint.y,
    size,
    sizeX,
    sizeY,
    rotation: targetRotation,
    opacity,
    scale: clamp((placement.scale || 1) * (1 - density * 0.08 + speed * 0.05), 0.82, 1.16),
    refinementMode: 'guided-stroke-fit',
    childStrokeInfluence: profile.fitStrength,
    childStrokeMetrics: {
      bbox: bounds,
      aspect,
      density,
      speed,
      angle: childAngle,
      count,
    },
  };

  return clampPlacementToStage(next, stageRect);
}

function getRefinementProfile(toolId, placementRule) {
  if (directionalTools.has(toolId)) {
    return {
      fitStrength: 0.72,
      strokeScale: 0.9,
      minSize: 28,
      maxSize: 132,
      minAspect: 1.2,
      maxAspect: 3.6,
      widthBias: 1.18,
      heightBias: 0.86,
      maxWidthMultiplier: 1.35,
      maxHeightMultiplier: 0.9,
      anchor: 'stroke',
      rotation: 'follow',
    };
  }

  if (uprightTools.has(toolId)) {
    return {
      fitStrength: 0.62,
      strokeScale: 0.82,
      minSize: 26,
      maxSize: 104,
      minAspect: 0.72,
      maxAspect: 1.55,
      widthBias: toolId === 'grass' || toolId === 'reed' ? 0.86 : 1,
      heightBias: toolId === 'grass' || toolId === 'reed' ? 1.18 : 1,
      maxWidthMultiplier: 1.12,
      maxHeightMultiplier: 1.28,
      anchor: 'stroke',
      rotation: 'upright',
    };
  }

  if (skyScatterTools.has(toolId)) {
    return {
      fitStrength: 0.58,
      strokeScale: 0.78,
      minSize: 24,
      maxSize: 116,
      minAspect: 0.78,
      maxAspect: 1.8,
      widthBias: 1,
      heightBias: 1,
      maxWidthMultiplier: 1.18,
      maxHeightMultiplier: 1.18,
      anchor: placementRule === 'radialSky' ? 'bboxCenter' : 'stroke',
      rotation: toolId === 'rain' || toolId === 'rainDrop' || toolId === 'dew' ? 'soft-follow' : 'soft',
    };
  }

  return {
    fitStrength: 0.58,
    strokeScale: 0.82,
    minSize: 26,
    maxSize: 112,
    minAspect: 0.75,
    maxAspect: 2.4,
    widthBias: 1,
    heightBias: 1,
    maxWidthMultiplier: 1.2,
    maxHeightMultiplier: 1.2,
    anchor: 'stroke',
    rotation: 'soft',
  };
}

function getRefinedAnchor(placement, bounds, profile, count, index) {
  if (profile.anchor !== 'bboxCenter' || count > 2) {
    return { x: placement.x, y: placement.y };
  }
  const drift = count === 1 ? 0 : (index - 0.5) * Math.max(18, Math.min(bounds.width, bounds.height) * 0.28);
  return {
    x: bounds.x + bounds.width / 2 + drift,
    y: bounds.y + bounds.height / 2,
  };
}

function getRefinedRotation(toolId, currentRotation, strokeAngle, profile) {
  const base = Number.isFinite(currentRotation) ? currentRotation : 0;
  if (!Number.isFinite(strokeAngle)) return base;
  if (profile.rotation === 'follow') return blend(base, strokeAngle, 0.82);
  if (profile.rotation === 'soft-follow') return blend(base, strokeAngle, 0.34);
  if (profile.rotation === 'upright') {
    if (toolId === 'grass' || toolId === 'reed' || toolId === 'sprout') return clamp(base, -22, 22);
    return clamp(base * 0.36, -14, 14);
  }
  return blend(base, strokeAngle, 0.18);
}

function getSafeAspect(bounds, profile) {
  const raw = bounds.height > 0 ? bounds.width / bounds.height : 1;
  return clamp(raw || 1, profile.minAspect, profile.maxAspect);
}

function getStrokeAngle(points) {
  if (points.length < 2) return 0;
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  if (Math.hypot(dx, dy) < 4) return 0;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function normalizeBounds(bounds, points) {
  if (bounds && Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
    return {
      x: Number(bounds.x),
      y: Number(bounds.y),
      width: Math.max(1, Number(bounds.width || 1)),
      height: Math.max(1, Number(bounds.height || 1)),
    };
  }
  if (!points.length) return { x: 0, y: 0, width: 1, height: 1 };
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

function normalizePoints(points, stageRect) {
  return points.map((point) => ({
    x: clamp(Number(point.x) || 0, 0, stageRect.width),
    y: clamp(Number(point.y) || 0, 0, stageRect.height),
  }));
}

function normalizeStageRect(rect) {
  return {
    width: Math.max(1, Number(rect?.width) || 720),
    height: Math.max(1, Number(rect?.height) || 540),
  };
}

function blend(a, b, amount) {
  return a * (1 - amount) + b * amount;
}
