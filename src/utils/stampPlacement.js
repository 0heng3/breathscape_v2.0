import { getQuickDrawAsset, getQuickDrawAssetVariant } from '../data/quickdrawAssets';
import { getToolElement } from '../data/toolElementMap';
import { clamp, clampPlacementToStage } from './coordinateUtils';
import { refinePlacementFromStroke } from './strokeElementRefinement';

export function buildStampPlacements(stroke, toolId, options = {}) {
  const tool = getToolElement(toolId);
  const asset = getQuickDrawAsset(toolId);
  const stageRect = normalizeStageRect(options.stageRect || stroke.stageRect || {
    width: Number(options.canvasWidth) || stroke.canvasWidth || 720,
    height: Number(options.canvasHeight) || stroke.canvasHeight || 540,
  });
  const basePlacements = computePlacementsAlongStroke(stroke, { ...tool, id: toolId }, stageRect);
  const count = basePlacements.length;
  const placements = basePlacements.map((placement, index) => {
    const variantCount = Math.max(1, asset.assetVariants.length || 1);
    const variantIndex = pickVariantIndex(stroke, toolId, index, variantCount);
    return {
      ...placement,
      id: `${stroke.id || 'stroke'}-${index}`,
      tool: toolId,
      toolMeta: tool,
      assetKey: toolId,
      assetVariantIndex: variantIndex,
      variantIndex,
      variant: getQuickDrawAssetVariant(toolId, variantIndex),
      assetPath: getQuickDrawAssetVariant(toolId, variantIndex)?.assetPath,
      canvasWidth: stageRect.width,
      canvasHeight: stageRect.height,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
      live: false,
      toneFamily: tool.soundEffect,
      stateEffect: tool.stateEffect,
      tone: tool.color,
      quickdrawPlacement: {
        count,
        length: Number(stroke.length || 0),
        speed: Number(stroke.speedAvg ?? stroke.speed ?? 0),
        zone: placement.zone,
        actualZone: placement.actualZone,
        index,
        placementRule: tool.placementRule,
      },
      asset,
    };
  });

  return {
    placements,
    asset,
    tool,
    count,
    projectedZone: placements[0]?.zone || tool.fallbackIfWrongZone || 'ground',
    actualZone: placements[0]?.actualZone || getStrokeZone(stroke, stageRect),
  };
}

export function computePlacementsAlongStroke(stroke, toolConfig, stageRectInput) {
  const stageRect = normalizeStageRect(stageRectInput);
  const points = normalizePoints(stroke.points || [], stageRect);
  if (!points.length) return [];

  const length = Number.isFinite(stroke.length) ? stroke.length : getPolylineLength(points);
  const speed = clamp(Number(stroke.speedAvg ?? stroke.speed ?? 0.35), 0, 1);
  const rule = toolConfig.placementRule || 'scatterAlongStroke';
  const maxCount = Math.min(clamp(Number(toolConfig.maxCountPerStroke || 4), 1, 8), getRuleMaxCount(rule));
  const baseCount = getStrokeStampCount(length, speed);
  const count = clamp(baseCount, 1, maxCount);
  const actualZone = getStrokeZone({ ...stroke, points }, stageRect);
  const zone = projectZone(actualZone, toolConfig.allowedZones || ['any'], toolConfig.fallbackIfWrongZone || 'ground');
  const samples = resamplePolyline(points, count);

  const placements = samples.map((sample, index) => {
    const placement = createPlacement({
      stroke,
      tool: toolConfig,
      sample,
      index,
      count,
      length,
      speed,
      stageRect,
      zone,
      actualZone,
    });
    return refinePlacementFromStroke(
      clampPlacementToStage(placement, stageRect),
      stroke,
      toolConfig,
      stageRect,
      { index, count },
    );
  });
  return resolvePlacementOverlaps(placements, stageRect);
}

function createPlacement({ tool, sample, index, count, length, speed, stageRect, zone, actualZone }) {
  const rule = tool.placementRule || 'scatterAlongStroke';
  const normalizedIndex = count <= 1 ? 0.5 : index / Math.max(1, count - 1);
  const wave = Math.sin((normalizedIndex + 0.13) * Math.PI * 2);
  const cluster = wave * (8 + speed * 8);
  const groundY = stageRect.height * 0.78;
  const waterY = stageRect.height * 0.62;
  const skyY = stageRect.height * 0.25;
  const tangent = sample.tangent || { angle: 0 };
  const tangentDeg = radiansToDegrees(tangent.angle);

  let x = sample.point.x;
  let y = sample.point.y;
  let size = clamp(40 + length * 0.05 + speed * 18 + index * 1.5, 28, 136);
  let rotation = tangentDeg + (index % 2 === 0 ? -1 : 1) * (3 + speed * 5);
  let scale = clamp(0.92 + speed * 0.16, 0.9, 1.14);
  let opacity = zone === 'sky' ? 0.96 : 0.98;
  let strokeWidth = clamp(3.4 + speed * 0.9, 3.2, 5.8);
  let animationType = 'draw';

  switch (rule) {
    case 'tileGround':
      x += cluster * 0.45;
      y += cluster * 0.12;
      size = clamp(34 + length * 0.028 + speed * 14 + index, 28, 88);
      rotation = cluster * 0.35 + (index % 2 === 0 ? -6 : 6);
      opacity = 0.94;
      animationType = 'sway';
      break;
    case 'radialSky':
      x += cluster * 0.24;
      y += cluster * 0.08;
      size = clamp(42 + length * 0.038 + speed * 14, 30, 104);
      rotation = tangentDeg * 0.3 + cluster * 0.5;
      animationType = 'glow';
      break;
    case 'scatterToGround':
      x += cluster * 0.28;
      y += cluster * 0.1;
      size = clamp(28 + length * 0.025 + speed * 10, 22, 66);
      strokeWidth = clamp(2.8 + speed * 0.4, 2.4, 4.2);
      animationType = 'sparkle';
      break;
    case 'groundTexture':
      x += cluster * 0.34;
      y += cluster * 0.08;
      size = clamp(28 + length * 0.026 + index, 22, 76);
      opacity = 0.86;
      strokeWidth = clamp(2.6 + speed * 0.3, 2.2, 3.8);
      scale = clamp(0.92 + speed * 0.08, 0.9, 1.04);
      break;
    case 'scatterBloom':
      x += Math.cos(index * 2.3) * (10 + speed * 7);
      y += Math.sin(index * 2.1) * (6 + speed * 5);
      size = clamp(38 + length * 0.038 + speed * 14, 30, 100);
      rotation = tangentDeg + (index % 2 === 0 ? -10 : 10);
      animationType = 'bloom';
      break;
    case 'skyDrift':
      x += cluster * 0.38;
      y -= index * 1.4;
      size = clamp(42 + length * 0.035 + speed * 14, 32, 110);
      rotation = tangentDeg * 0.45 + cluster * 0.42;
      animationType = 'drift';
      break;
    case 'driftPath':
      x += index * 8 + cluster * 0.24;
      y += Math.sin(index * 0.8) * 10;
      size = clamp(44 + length * 0.048 + speed * 16, 32, 118);
      rotation = tangentDeg + cluster * 0.24;
      animationType = 'drift';
      break;
    case 'dropToGround':
      x += cluster * 0.18;
      y += index * 4;
      size = clamp(24 + length * 0.018 + speed * 10, 20, 58);
      rotation = 90 + cluster * 0.2;
      strokeWidth = clamp(2.6 + speed * 0.3, 2.2, 3.4);
      animationType = 'sparkle';
      break;
    case 'rainFromSky':
      x += cluster * 0.18;
      y += index * 3;
      size = clamp(40 + length * 0.026 + speed * 12, 32, 86);
      rotation = tangentDeg * 0.12 + cluster * 0.08;
      strokeWidth = 8;
      animationType = 'drift';
      break;
    case 'flowAlongStroke':
      x += index * 7;
      y += cluster * 0.12;
      size = clamp(42 + length * 0.04 + speed * 16, 30, 104);
      rotation = tangentDeg * 0.55;
      animationType = 'flow';
      break;
    case 'scatterSky':
      x += cluster * 0.32;
      y -= index * 2;
      size = clamp(24 + speed * 10 + index * 1.3, 20, 68);
      rotation = tangentDeg * 0.2 + index * 11;
      strokeWidth = clamp(2.8 + speed * 0.25, 2.4, 4.0);
      animationType = 'twinkle';
      break;
    case 'hangOrGround':
      x += cluster * 0.22;
      y += zone === 'sky' ? -index * 1.5 : index * 1.5;
      size = clamp(38 + length * 0.03 + speed * 12, 30, 104);
      rotation = tangentDeg * 0.28 + (index % 2 === 0 ? -4 : 4);
      animationType = 'glow';
      break;
    case 'groundSprout':
      x += cluster * 0.2;
      y += cluster * 0.08;
      size = clamp(34 + length * 0.028 + speed * 9, 26, 88);
      rotation = tangentDeg * 0.2;
      strokeWidth = clamp(3.1 + speed * 0.25, 2.8, 4.4);
      animationType = 'bloom';
      break;
    case 'spanGroundGap':
      x += (index - (count - 1) / 2) * 34 + cluster * 0.08;
      y += cluster * 0.04;
      size = clamp(50 + length * 0.035 + speed * 9, 34, 122);
      rotation = -1.5 + index * 1.2;
      animationType = 'draw';
      break;
    default:
      break;
  }

  return {
    x,
    y,
    size,
    rotation,
    scale,
    opacity,
    strokeWidth,
    zone,
    actualZone,
    appearDelay: index * 48,
    animationType,
  };
}

function getStrokeStampCount(length, speed) {
  if (length < 56) return 1;
  if (length < 150) return speed > 0.72 ? 3 : 2;
  if (length < 300) return speed > 0.72 ? 4 : 3;
  return speed > 0.78 ? 6 : 5;
}

function resolvePlacementOverlaps(placements, stageRect) {
  const resolved = [];
  placements.forEach((placement, index) => {
    let next = { ...placement };
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const collision = resolved.find((item) => {
        const minDistance = Math.max(26, Math.min(item.size || 56, next.size || 56) * 0.58);
        return distance(item, next) < minDistance;
      });
      if (!collision) break;
      const angle = (index * 2.399 + attempt * 0.9) % (Math.PI * 2);
      const push = Math.max(10, Math.min(collision.size || 56, next.size || 56) * (0.28 + attempt * 0.06));
      next = clampPlacementToStage({
        ...next,
        x: next.x + Math.cos(angle) * push,
        y: next.y + Math.sin(angle) * push * 0.55,
      }, stageRect);
    }
    resolved.push(next);
  });
  return resolved;
}

function pickVariantIndex(stroke, toolId, index, variantCount) {
  if (variantCount <= 1) return 0;
  const seed = stableOffset(`${toolId}:${stroke.id || ''}:${stroke.createdAt || ''}:${Math.round(stroke.length || 0)}`);
  const stride = getCoprimeStride(variantCount);
  return (seed + index * stride + Math.floor(index / Math.max(1, variantCount)) * 3) % variantCount;
}

function getCoprimeStride(count) {
  const preferred = [7, 11, 13, 5, 3];
  return preferred.find((step) => count % step !== 0) || 1;
}

function getRuleMaxCount(rule) {
  return {
    scatterToGround: 6,
    dropToGround: 7,
    rainFromSky: 6,
    tileGround: 6,
    groundTexture: 5,
    flowAlongStroke: 6,
    driftPath: 4,
    scatterSky: 5,
    scatterBloom: 4,
    radialSky: 4,
    skyDrift: 3,
    hangOrGround: 3,
    groundSprout: 4,
    spanGroundGap: 2,
  }[rule] || 4;
}

function normalizePoints(points, stageRect) {
  return points
    .map((point) => ({
      x: clamp(Number(point.x) || 0, 0, stageRect.width),
      y: clamp(Number(point.y) || 0, 0, stageRect.height),
      t: Number(point.t) || 0,
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function normalizeStageRect(rect) {
  return {
    left: 0,
    top: 0,
    width: Math.max(1, Number(rect?.width) || 720),
    height: Math.max(1, Number(rect?.height) || 540),
  };
}

function resamplePolyline(points, count) {
  if (points.length === 1) {
    return Array.from({ length: count }, () => ({ point: points[0], tangent: { angle: 0 } }));
  }

  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances[index] = distances[index - 1] + distance(points[index - 1], points[index]);
  }

  const total = distances[distances.length - 1] || 1;
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const target = count === 1 ? total / 2 : (total * (index + 0.5)) / count;
    const segmentIndex = findSegment(distances, target);
    const start = points[segmentIndex];
    const end = points[Math.min(segmentIndex + 1, points.length - 1)];
    const startDistance = distances[segmentIndex];
    const segmentLength = Math.max(1, distances[Math.min(segmentIndex + 1, distances.length - 1)] - startDistance);
    const local = clamp((target - startDistance) / segmentLength, 0, 1);
    const x = start.x + (end.x - start.x) * local;
    const y = start.y + (end.y - start.y) * local;
    samples.push({
      point: { x, y },
      tangent: { angle: Math.atan2(end.y - start.y, end.x - start.x) },
      segmentIndex,
      local,
    });
  }
  return samples;
}

function getStrokeZone(stroke, stageRect) {
  if (stroke.zone && stroke.zone !== 'middle') return stroke.zone;
  const points = normalizePoints(stroke.points || [], stageRect);
  const centerY = points.length
    ? points.reduce((sum, point) => sum + point.y, 0) / points.length
    : Number(stroke.centerY ?? stroke.boundingBox?.y ?? 0);
  if (centerY < stageRect.height * 0.38) return 'sky';
  if (centerY > stageRect.height * 0.62) return 'ground';
  return 'middle';
}

function projectZone(actualZone, allowedZones, fallbackZone) {
  if (allowedZones.includes('any') || allowedZones.includes(actualZone)) return actualZone;
  if (allowedZones.includes('ground')) return 'ground';
  if (allowedZones.includes('sky')) return 'sky';
  if (allowedZones.includes('water')) return 'water';
  if (fallbackZone === 'snapToGround') return 'ground';
  return fallbackZone || 'ground';
}

function projectPointYForZone(y, zone, stageRect) {
  if (zone === 'sky') return clamp(y, stageRect.height * 0.12, stageRect.height * 0.38);
  if (zone === 'water') return clamp(y, stageRect.height * 0.52, stageRect.height * 0.78);
  if (zone === 'ground') return clamp(y, stageRect.height * 0.66, stageRect.height * 0.9);
  return clamp(y, stageRect.height * 0.18, stageRect.height * 0.86);
}

function getPolylineLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distance(points[index - 1], points[index]);
  }
  return length;
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function findSegment(distances, target) {
  for (let index = 1; index < distances.length; index += 1) {
    if (target <= distances[index]) return index - 1;
  }
  return Math.max(0, distances.length - 2);
}

function radiansToDegrees(value) {
  return Number.isFinite(value) ? (value * 180) / Math.PI : 0;
}

function stableOffset(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
