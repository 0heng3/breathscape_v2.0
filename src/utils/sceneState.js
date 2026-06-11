import { emptyElements } from '../data/tools';

export const initialSceneState = {
  windEnergy: 0,
  windDirectionX: 1,
  windDirectionY: 0,
  windSwaySpeed: 0,
  windSwayStrength: 0,
  rainDensity: 0,
  soilWetness: 0,
  seedCount: 0,
  growthLevel: 0,
  groundGreen: 0,
  plantGlow: 0,
  soilTexture: 0,
  grassCoverage: 0,
  flowerBloom: 0,
  flowerCount: 0,
  sunlightWarmth: 0,
  waterFlow: 0,
  waterRipple: 0,
  pathCompletion: 0,
  nightSparkle: 0,
  localWarmth: 0,
  memoryConnection: 0,
  visualClutter: 0,
  calmLevel: 0.2,
  brightness: 0.72,
  saturation: 0.78,
  soundIntensity: 0.15,
  fogOpacity: 0,
  animationSpeed: 1,
  lastTool: null,
  totalStrokeCount: 0,
  toolCounts: { ...emptyElements },
};

export function createInitialSceneState(sceneId, day = 1) {
  const state = structuredClone(initialSceneState);
  return applyMoodScene(sceneId, applyGardenDay(day, state));
}

export function applyGardenDay(day, state) {
  const next = { ...state, toolCounts: { ...state.toolCounts } };
  const boosts = {
    1: { soilWetness: 0.2, brightness: 0.45, grassCoverage: 0.05, flowerBloom: 0.02 },
    2: { soilWetness: 0.35, waterFlow: 0.15, pathCompletion: 0.15, brightness: 0.52 },
    3: { windEnergy: 0.08, grassCoverage: 0.28, soundIntensity: 0.18, brightness: 0.56 },
    4: { pathCompletion: 0.2, calmLevel: 0.4, brightness: 0.5 },
    5: { soilWetness: 0.45, grassCoverage: 0.12, rainDensity: 0.12, brightness: 0.48 },
    6: { brightness: 0.28, sunlightWarmth: 0.22, nightSparkle: 0.18, flowerBloom: 0.08 },
    7: { brightness: 0.5, nightSparkle: 0.25, memoryConnection: 0.12, flowerBloom: 0.12 },
  }[day] || {};
  Object.assign(next, boosts);
  return next;
}

export function applyMoodScene(sceneId, state) {
  const next = { ...state, toolCounts: { ...state.toolCounts } };
  switch (sceneId) {
    case 'bright_inside':
    case 'color_path':
      next.brightness = clamp(next.brightness + 0.08, 0, 1);
      next.sunlightWarmth = clamp(next.sunlightWarmth + 0.1, 0, 1);
      break;
    case 'fast_inside':
    case 'leaf_swirl':
      next.windEnergy = clamp(next.windEnergy + 0.18, 0, 1);
      next.visualClutter = clamp(next.visualClutter + 0.12, 0, 1);
      break;
    case 'messy_inside':
    case 'warm_balloon':
      next.sunlightWarmth = clamp(next.sunlightWarmth + 0.16, 0, 1);
      next.saturation = clamp(next.saturation + 0.04, 0, 1);
      break;
    case 'heavy_inside':
    case 'little_stone':
      next.brightness = clamp(next.brightness - 0.04, 0, 1);
      next.calmLevel = clamp(next.calmLevel + 0.08, 0, 1);
      break;
    case 'snail_shell':
      next.calmLevel = clamp(next.calmLevel + 0.16, 0, 1);
      next.animationSpeed = 0.9;
      break;
    case 'tired_inside':
    case 'dim_lamp':
      next.brightness = clamp(next.brightness - 0.08, 0, 1);
      next.sunlightWarmth = clamp(next.sunlightWarmth - 0.04, 0, 1);
      break;
    case 'unclear_inside':
    case 'fog_glass':
      next.fogOpacity = 0.28;
      next.brightness = clamp(next.brightness - 0.02, 0, 1);
      break;
    default:
      break;
  }
  return next;
}

export function updateSceneState(tool, stroke, state) {
  const count = Math.max(1, Number(stroke.elementCount || stroke.stampCount || 1));
  const scale = clamp(0.8 + count * 0.14, 0.8, 1.8);
  const next = {
    ...state,
    toolCounts: {
      ...state.toolCounts,
      [tool]: (state.toolCounts[tool] || 0) + count,
    },
    totalStrokeCount: state.totalStrokeCount + count,
    lastTool: tool,
  };
  const speed = clamp(stroke.speedAvg || 0, 0, 1);

  switch (tool) {
    case 'wind':
    case 'windLine':
    case 'softWind':
    case 'ribbon':
    case 'cloud':
    case 'floatingLeaf':
    case 'windBell':
      next.windEnergy = clamp(next.windEnergy + (0.1 + speed * 0.1) * scale, 0, 1);
      next.windDirectionX = normalizeWindAxis(stroke.vectorX, state.windDirectionX || 1);
      next.windDirectionY = clamp(stroke.vectorY || 0, -1, 1);
      next.windSwaySpeed = speed;
      next.windSwayStrength = clamp((0.3 + speed * 0.46 + next.windEnergy * 0.26) * scale, 0, 0.92);
      next.animationSpeed = clamp(0.84 + speed * 0.34 * scale, 0.72, 1.2);
      break;
    case 'rain':
    case 'rainDrop':
    case 'dew':
    case 'waterLine':
    case 'ripple':
    case 'puddle':
    case 'leafBoat':
    case 'snail':
    case 'snailTrail':
      next.rainDensity = clamp(next.rainDensity + (tool === 'rainDrop' ? 0.08 : 0.14 + speed * 0.08) * scale, 0, 1);
      next.soilWetness = clamp(next.soilWetness + (0.14 + (stroke.densityLocal || 0) * 0.24) * scale, 0, 1);
      next.waterFlow = clamp((next.waterFlow || 0) + (0.08 + speed * 0.05) * scale, 0, 1);
      next.waterRipple = clamp((next.waterRipple || 0) + (tool === 'puddle' ? 0.18 : 0.08 + speed * 0.08) * scale, 0, 1);
      next.plantGlow = clamp((next.plantGlow || 0) + 0.04 * scale, 0, 1);
      next.brightness = clamp(next.brightness + 0.01 * scale, 0.65, 0.96);
      if (next.soilWetness > 0.28) next.grassCoverage = clamp(next.grassCoverage + 0.05, 0, 1);
      if (tool === 'snail') next.calmLevel = clamp(next.calmLevel + 0.08 * scale, 0, 1);
      break;
    case 'grass':
    case 'seed':
    case 'reed':
    case 'moss':
    case 'smallTree':
    case 'sprout':
    case 'memorySeed':
      next.grassCoverage = clamp(next.grassCoverage + 0.11 * scale, 0, 1);
      next.groundGreen = clamp((next.groundGreen || 0) + 0.12 * scale, 0, 1);
      next.growthLevel = clamp((next.growthLevel || 0) + 0.1 * scale, 0, 1);
      if (tool === 'seed') next.seedCount = clamp((next.seedCount || 0) + count, 0, 999);
      next.calmLevel = clamp(next.calmLevel + 0.03 * scale, 0, 1);
      if (tool === 'memorySeed') next.memoryConnection = clamp((next.memoryConnection || 0) + 0.12 * scale, 0, 1);
      break;
    case 'flower':
    case 'firstFlower':
    case 'bud':
    case 'quietFlower':
    case 'mushroom':
      next.flowerBloom = clamp(next.flowerBloom + (0.1 + (stroke.closedness || 0) * 0.05) * scale, 0, 1);
      next.flowerCount = clamp((next.flowerCount || 0) + count, 0, 999);
      next.saturation = clamp(next.saturation + 0.03 * scale, 0.7, 0.92);
      next.brightness = clamp(next.brightness + 0.012 * scale, 0.65, 0.96);
      break;
    case 'sun':
    case 'sunlight':
    case 'lantern':
    case 'firefly':
    case 'moon':
    case 'windowLight':
    case 'breathLight':
    case 'star':
    case 'moonbeam':
      next.sunlightWarmth = clamp(next.sunlightWarmth + (0.1 + speed * 0.05) * scale, 0, 1);
      next.localWarmth = clamp((next.localWarmth || 0) + 0.08 * scale, 0, 1);
      next.brightness = clamp(next.brightness + 0.05 * scale, 0.65, 0.96);
      next.nightSparkle = clamp((next.nightSparkle || 0) + (['firefly', 'star'].includes(tool) ? 0.14 : 0.05) * scale, 0, 1);
      next.fogOpacity = clamp((next.fogOpacity || 0) - 0.08, 0, 0.35);
      break;
    case 'stone':
    case 'bridge':
    case 'signpost':
    case 'soilLine':
    case 'shadow':
      next.pathCompletion = clamp((next.pathCompletion || 0) + 0.16 * scale, 0, 1);
      if (tool === 'soilLine') {
        next.soilTexture = clamp((next.soilTexture || 0) + 0.24 * scale, 0, 1);
        next.soilWetness = clamp((next.soilWetness || 0) + 0.03 * scale, 0, 1);
      }
      if (tool === 'shadow') next.soilTexture = clamp((next.soilTexture || 0) + 0.08 * scale, 0, 1);
      next.calmLevel = clamp(next.calmLevel + 0.04 * scale, 0, 1);
      break;
    case 'constellationLine':
    case 'rainbow':
      next.memoryConnection = clamp((next.memoryConnection || 0) + 0.18 * scale, 0, 1);
      next.nightSparkle = clamp((next.nightSparkle || 0) + 0.12 * scale, 0, 1);
      next.sunlightWarmth = clamp(next.sunlightWarmth + 0.05 * scale, 0, 1);
      break;
    default:
      break;
  }

  next.visualClutter = clamp(next.visualClutter + estimateClutter(stroke), 0, 1);
  next.soundIntensity = clamp(0.12 + next.totalStrokeCount * 0.02, 0.12, 0.34);
  syncFamilyCounts(next, tool, count);
  return next;
}

function syncFamilyCounts(state, tool, count) {
  const family = getToolFamily(tool);
  const target = {
    wind: 'wind',
    rain: 'rain',
    grass: 'grass',
    flower: 'flower',
    sun: 'sun',
    stone: 'stone',
    memory: 'star',
  }[family];
  if (target && target !== tool) {
    state.toolCounts[target] = (state.toolCounts[target] || 0) + count;
  }
}

function normalizeWindAxis(value, fallback) {
  const axis = Number.isFinite(value) ? value : fallback;
  if (Math.abs(axis) < 0.12) return fallback >= 0 ? 1 : -1;
  return clamp(axis, -1, 1);
}

export function applyBreathCalming(state) {
  return {
    ...state,
    windEnergy: state.windEnergy * 0.86,
    rainDensity: state.rainDensity * 0.9,
    soundIntensity: state.soundIntensity * 0.62,
    brightness: clamp(state.brightness + 0.02, 0.65, 0.92),
    calmLevel: clamp(state.calmLevel + 0.24, 0, 1),
    visualClutter: clamp(state.visualClutter - 0.12, 0, 1),
    fogOpacity: clamp((state.fogOpacity || 0) + 0.02, 0, 0.24),
  };
}

export function applyGestureSettling(state, gesture) {
  const hold = clamp(gesture.hold || 0, 0, 1);
  const slow = clamp(gesture.slow || 0, 0, 1);
  const glow = clamp(gesture.glow || 0, 0, 1);
  const wind = clamp(gesture.wind || 0, -1, 1);
  const windAmount = Math.abs(wind);
  const confirmed = Boolean(gesture.confirmed);
  const action = gesture.action || state.gestureAction || 'still_stand';
  const pulseTarget = confirmed ? 1 : 0;
  const actionBoosts = {
    cup_light: { light: 0.032, bright: 0.018, hold: 0.012, wind: 0 },
    raise_soft: { light: 0.026, bright: 0.014, hold: 0.006, wind: 0.004 },
    one_hand_wind: { light: 0.004, bright: 0.004, hold: 0.002, wind: 0.08 },
    still_stand: { light: 0.006, bright: 0.003, hold: 0.028, wind: -0.018 },
  }[action] || { light: 0.01, bright: 0.004, hold: 0.01, wind: 0 };

  return {
    ...state,
    windEnergy: clamp(state.windEnergy * (0.976 + Math.min(0, actionBoosts.wind)) + windAmount * (0.022 + Math.max(0, actionBoosts.wind)), 0, 1),
    rainDensity: clamp(state.rainDensity * (0.988 - hold * 0.04), 0, 1),
    sunlightWarmth: clamp(state.sunlightWarmth + glow * actionBoosts.light + hold * 0.009, 0, 1),
    brightness: clamp(state.brightness + glow * actionBoosts.bright, 0.65, 0.96),
    calmLevel: clamp(state.calmLevel + hold * (0.016 + actionBoosts.hold) + slow * 0.012 + glow * 0.012, 0, 1),
    soundIntensity: clamp(state.soundIntensity * (0.988 - hold * 0.026), 0.04, 0.34),
    animationSpeed: clamp((state.animationSpeed || 1) * 0.86 + (1 - hold * 0.24 - slow * 0.12 + windAmount * 0.16) * 0.14, 0.58, 1.12),
    gestureWind: clamp((state.gestureWind || 0) * 0.78 + wind * 0.22, -1, 1),
    gestureGlow: clamp((state.gestureGlow || 0) * 0.8 + glow * 0.2, 0, 1),
    gestureHold: clamp((state.gestureHold || 0) * 0.82 + hold * 0.18, 0, 1),
    gesturePulse: clamp((state.gesturePulse || 0) * 0.84 + pulseTarget * 0.28, 0, 1),
    gestureAction: action,
  };
}

export function createFeedback(tool, nextState, recentTools = []) {
  const sameLastThree = recentTools.length >= 2 && recentTools.slice(-2).every((item) => item === tool);
  if (sameLastThree && (nextState.toolCounts[tool] || 0) >= 3) {
    return '这里已经很明显了，也可以给花园留一点安静的地方。';
  }
  if (nextState.visualClutter > 0.65) {
    return '花园已经很满了，我们可以慢慢收起来。';
  }
  const lines = {
    wind: ['风把草、云和彩带轻轻带动了。', '风铃和叶片开始慢慢摆动。'],
    rain: ['土地和水面都收到了一点湿润。', '水纹慢慢扩散开来。'],
    grass: ['这里开始长出一点绿色。', '小芽和草叶慢慢站起来。'],
    flower: ['花苞打开了一点点。', '花园多了一个柔软的颜色。'],
    sun: ['光让花园暖了一点。', '小灯、月亮或星星亮了一点。'],
    stone: ['小路比刚才更连贯了一点。', '石头和路牌让花园更稳。'],
    memory: ['前几天的小物件被轻轻点亮。', '星星连成了一条小路。'],
  };
  const count = nextState.toolCounts[tool] || 0;
  const family = getToolFamily(tool);
  return lines[family]?.[Math.min(lines[family].length - 1, count - 1)] || '花园接住了这一笔。';
}

export function getSceneClues(state) {
  const clues = [];
  if (state.soilWetness > 0.08) clues.push('土地喝到水了');
  if (state.grassCoverage > 0.05) clues.push('这里长出绿色');
  if (state.flowerBloom > 0.05) clues.push('花苞打开一点');
  if (state.sunlightWarmth > 0.08) clues.push('小灯亮了一点');
  if (state.windEnergy > 0.12) clues.push('云在慢慢移动');
  if ((state.pathCompletion || 0) > 0.18) clues.push('小路更完整');
  if ((state.memoryConnection || 0) > 0.18) clues.push('星光连起来');
  if (state.visualClutter > 0.55) clues.push('可以留一点空白');
  return clues.length ? clues.slice(0, 4) : ['不用画得很像，花园听得懂你的线条'];
}

function getToolFamily(tool) {
  if (['wind', 'windLine', 'softWind', 'cloud', 'ribbon', 'floatingLeaf', 'windBell'].includes(tool)) return 'wind';
  if (['rain', 'rainDrop', 'dew', 'waterLine', 'ripple', 'puddle', 'snail', 'snailTrail', 'leafBoat'].includes(tool)) return 'rain';
  if (['grass', 'seed', 'reed', 'moss', 'smallTree', 'sprout', 'memorySeed'].includes(tool)) return 'grass';
  if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(tool)) return 'flower';
  if (['sun', 'sunlight', 'lantern', 'firefly', 'moon', 'windowLight', 'breathLight', 'star', 'moonbeam'].includes(tool)) return 'sun';
  if (['stone', 'bridge', 'signpost', 'soilLine', 'shadow'].includes(tool)) return 'stone';
  if (['constellationLine', 'rainbow'].includes(tool)) return 'memory';
  return tool;
}

function estimateClutter(stroke) {
  return clamp(0.025 + (stroke.length || 0) / 1600 + (stroke.densityLocal || 0) * 0.02, 0.02, 0.09);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
