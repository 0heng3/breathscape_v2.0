import { bridgePath, circlePath, flowerPath, grassBladePath, lanternPath, mushroomPath, soilWavePath, starPath, stemPath, squigglePath, teardropPath, wavePath, drawStyleClass } from '../utils/svgPathTools';
import { getQuickDrawGrammar, hasQuickDrawGrammar } from './quickdrawElementGrammar';

const commonPlacement = {
  ground: ['bottom', 'ground', 'any'],
  sky: ['sky', 'any'],
  water: ['water', 'ground', 'any'],
  any: ['any', 'ground', 'sky', 'water'],
};

export const toolElementMap = {
  seed: toolDefinition({
    categories: ['circle'],
    label: '种子',
    toolbarGlyph: glyphFromPaths([circlePath(128, 128, 42, 0.16), circlePath(120, 118, 10, 0.14), circlePath(142, 135, 8, 0.12)]),
    assetVariants: buildVariants('seed', [
      [circlePath(128, 128, 42, 0.16), circlePath(120, 118, 10, 0.14), circlePath(142, 135, 8, 0.12)],
      [circlePath(128, 128, 46, 0.1), circlePath(116, 124, 12, 0.12), circlePath(146, 126, 9, 0.12)],
      [circlePath(128, 128, 38, 0.18), circlePath(134, 114, 9, 0.1), circlePath(114, 138, 7, 0.12)],
    ]),
    placementRule: 'scatterAlongStroke',
    maxCountPerStroke: 5,
    stateEffect: { grassCoverage: 0.04, soilWetness: 0.02 },
    soundEffect: 'softSeed',
    feedbackText: '现在画出来的都会变成种子，土地会慢慢醒来。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
  grass: toolDefinition({
    label: '一点草',
    toolbarGlyph: glyphFromPaths([grassBladePath(96, 194, 92, -8), grassBladePath(128, 198, 98, 4), grassBladePath(160, 190, 88, 10)]),
    assetVariants: buildVariants('grass', [
      [grassBladePath(92, 198, 94, -8), grassBladePath(128, 202, 110, 0), grassBladePath(168, 196, 88, 8)],
      [grassBladePath(86, 200, 96, -10), grassBladePath(128, 198, 96, 2), grassBladePath(166, 200, 104, 10)],
      [grassBladePath(96, 194, 92, -6), grassBladePath(126, 202, 100, 2), grassBladePath(156, 194, 84, 12)],
    ]),
    placementRule: 'tileGround',
    maxCountPerStroke: 8,
    stateEffect: { grassCoverage: 0.08, windEnergy: 0.01 },
    soundEffect: 'grass',
    feedbackText: '现在画出来的都会变成草，地面会长出一点绿色。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
  sunlight: toolDefinition({
    label: '晨光',
    toolbarGlyph: glyphFromPaths([circlePath(128, 116, 30, 0.06), squigglePath(128, 128, 120, 10, 1.8, 0.1), squigglePath(128, 128, 132, 10, 1.8, 0.6)]),
    assetVariants: buildVariants('sunlight', [
      [circlePath(128, 116, 30, 0.06), squigglePath(128, 128, 120, 10, 1.8, 0.1), squigglePath(128, 128, 132, 10, 1.8, 0.6)],
      [circlePath(128, 114, 28, 0.08), squigglePath(128, 130, 126, 9, 2.2, 0.25), squigglePath(128, 130, 138, 9, 2.2, 0.7)],
      [circlePath(128, 120, 26, 0.08), squigglePath(128, 132, 110, 12, 2.3, 0.15), squigglePath(128, 132, 140, 12, 2.3, 0.65)],
    ]),
    placementRule: 'radialSky',
    maxCountPerStroke: 6,
    stateEffect: { brightness: 0.07, fogOpacity: -0.05, sunlightWarmth: 0.05 },
    soundEffect: 'lightWarm',
    feedbackText: '现在画出来的都会变成晨光，雾会轻一点，花园会更亮。',
    allowedZones: ['sky'],
    fallbackIfWrongZone: 'sky',
  }),
  dew: toolDefinition({
    categories: ['rain'],
    label: '雨水',
    toolbarGlyph: glyphFromPaths([teardropPath(128, 120, 28, 0), teardropPath(104, 145, 18, -4), teardropPath(150, 148, 16, 4)]),
    assetVariants: buildVariants('dew', [
      [teardropPath(128, 120, 28, 0), teardropPath(104, 145, 18, -4), teardropPath(150, 148, 16, 4)],
      [teardropPath(128, 116, 30, 0), teardropPath(112, 146, 15, -2), teardropPath(160, 144, 13, 2)],
      [teardropPath(126, 122, 26, 0), teardropPath(106, 150, 17, -4), teardropPath(154, 146, 18, 4)],
    ]),
    placementRule: 'rainFromSky',
    maxCountPerStroke: 6,
    stateEffect: { soilWetness: 0.08, brightness: 0.02, plantGlow: 0.03 },
    soundEffect: 'dewDrop',
    feedbackText: '现在画出来的都会变成雨水，土地会喝到水。',
    allowedZones: ['sky'],
    fallbackIfWrongZone: 'sky',
  }),
  soilLine: toolDefinition({
    label: '土纹',
    toolbarGlyph: glyphFromPaths([soilWavePath(128, 132, 140, 14, 2.4), soilWavePath(128, 148, 128, 10, 2.0)]),
    assetVariants: buildVariants('soilLine', [
      [soilWavePath(128, 132, 140, 14, 2.4), soilWavePath(128, 148, 128, 10, 2.0)],
      [soilWavePath(128, 130, 146, 12, 2.5), soilWavePath(128, 150, 134, 10, 2.1)],
      [soilWavePath(128, 134, 136, 13, 2.2), soilWavePath(128, 146, 124, 11, 2.1)],
    ]),
    placementRule: 'groundTexture',
    maxCountPerStroke: 4,
    stateEffect: { soilWetness: 0.02, visualTexture: 0.08, pathCompletion: 0.04 },
    soundEffect: 'soil',
    feedbackText: '现在画出来的都会变成土纹，地面会更柔和。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
  flower: toolDefinition({
    categories: ['flower'],
    label: '小花',
    toolbarGlyph: glyphFromPaths(flowerPath(128, 128, 44, 5)),
    assetVariants: buildVariants('flower', [
      flowerPath(128, 128, 44, 5),
      flowerPath(126, 130, 40, 6),
      flowerPath(130, 126, 46, 5),
    ]),
    placementRule: 'scatterBloom',
    maxCountPerStroke: 5,
    stateEffect: { flowerBloom: 0.08, brightness: 0.02, saturation: 0.02 },
    soundEffect: 'flowerOpen',
    feedbackText: '现在画出来的都会变成小花，花会慢慢打开。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
  cloud: toolDefinition({
    label: '云',
    toolbarGlyph: glyphFromPaths([wavePath(128, 120, 126, 24, 2.2, 0.1), wavePath(128, 140, 136, 16, 2, 0.55)]),
    assetVariants: buildVariants('cloud', [
      [wavePath(128, 120, 126, 24, 2.2, 0.1), wavePath(128, 140, 136, 16, 2, 0.55)],
      [wavePath(126, 118, 130, 22, 2.1, 0.25), wavePath(130, 138, 138, 14, 2.1, 0.65)],
      [wavePath(130, 122, 120, 26, 2.3, 0.15), wavePath(128, 144, 142, 15, 2.2, 0.6)],
    ]),
    placementRule: 'skyDrift',
    maxCountPerStroke: 4,
    stateEffect: { windEnergy: 0.04, fogOpacity: -0.02 },
    soundEffect: 'cloud',
    feedbackText: '现在画出来的都会变成云，天空会慢慢动起来。',
    allowedZones: ['sky'],
    fallbackIfWrongZone: 'sky',
  }),
  windLine: toolDefinition({
    label: '风线',
    toolbarGlyph: glyphFromPaths([squigglePath(128, 110, 168, 20, 2.6, 0.1), squigglePath(128, 136, 150, 18, 2.8, 0.35), squigglePath(128, 162, 132, 14, 2.4, 0.55)]),
    assetVariants: buildVariants('windLine', [
      [squigglePath(128, 110, 168, 20, 2.6, 0.1), squigglePath(128, 136, 150, 18, 2.8, 0.35), squigglePath(128, 162, 132, 14, 2.4, 0.55)],
      [squigglePath(128, 112, 160, 18, 2.5, 0.15), squigglePath(128, 138, 152, 16, 2.5, 0.45), squigglePath(128, 162, 138, 12, 2.3, 0.68)],
      [squigglePath(128, 108, 172, 22, 2.8, 0.08), squigglePath(128, 140, 140, 16, 2.7, 0.42), squigglePath(128, 166, 126, 14, 2.5, 0.72)],
    ]),
    placementRule: 'driftPath',
    maxCountPerStroke: 6,
    stateEffect: { windEnergy: 0.1, grassCoverage: 0.01, animationSpeed: 0.02 },
    soundEffect: 'wind',
    feedbackText: '现在画出来的都会变成风线，草、云和彩带会跟着动。',
    allowedZones: commonPlacement.any,
    fallbackIfWrongZone: 'sky',
  }),
  rainDrop: toolDefinition({
    categories: ['rain'],
    label: '雨滴',
    toolbarGlyph: glyphFromPaths([teardropPath(128, 104, 20, 0), teardropPath(100, 150, 12, -2), teardropPath(156, 146, 12, 2)]),
    assetVariants: buildVariants('rainDrop', [
      [teardropPath(128, 104, 20, 0), teardropPath(100, 150, 12, -2), teardropPath(156, 146, 12, 2)],
      [teardropPath(126, 106, 22, 0), teardropPath(112, 146, 12, -1), teardropPath(150, 150, 12, 1)],
      [teardropPath(130, 102, 18, 0), teardropPath(106, 148, 12, -2), teardropPath(158, 144, 12, 2)],
    ]),
    placementRule: 'rainFromSky',
    maxCountPerStroke: 6,
    stateEffect: { soilWetness: 0.08, waterRipple: 0.04, rainDensity: 0.06 },
    soundEffect: 'rainDrop',
    feedbackText: '现在画出来的都会变成雨滴，土壤会变湿。',
    allowedZones: ['sky'],
    fallbackIfWrongZone: 'sky',
  }),
  waterLine: toolDefinition({
    label: '水线',
    toolbarGlyph: glyphFromPaths([wavePath(128, 130, 160, 20, 2.2, 0.15), wavePath(128, 150, 146, 14, 2, 0.55)]),
    assetVariants: buildVariants('waterLine', [
      [wavePath(128, 130, 160, 20, 2.2, 0.15), wavePath(128, 150, 146, 14, 2, 0.55)],
      [wavePath(126, 132, 156, 18, 2.3, 0.2), wavePath(128, 154, 140, 12, 2.1, 0.6)],
      [wavePath(130, 128, 164, 22, 2.1, 0.1), wavePath(128, 148, 150, 14, 2.2, 0.5)],
    ]),
    placementRule: 'flowAlongStroke',
    maxCountPerStroke: 5,
    stateEffect: { waterFlow: 0.08, soilWetness: 0.03 },
    soundEffect: 'waterFlow',
    feedbackText: '现在画出来的都会变成水线，小溪会顺着流动。',
    allowedZones: commonPlacement.water,
    fallbackIfWrongZone: 'water',
  }),
  star: toolDefinition({
    label: '星星',
    toolbarGlyph: glyphFromPaths([starPath(128, 128, 48), starPath(84, 156, 18), starPath(168, 150, 16)]),
    assetVariants: buildVariants('star', [
      [starPath(128, 128, 48), starPath(84, 156, 18), starPath(168, 150, 16)],
      [starPath(126, 126, 46), starPath(92, 150, 16), starPath(170, 152, 15)],
      [starPath(128, 130, 44), starPath(88, 154, 17), starPath(162, 146, 16)],
    ]),
    placementRule: 'scatterSky',
    maxCountPerStroke: 8,
    stateEffect: { nightSparkle: 0.1, brightness: 0.03 },
    soundEffect: 'star',
    feedbackText: '现在画出来的都会变成星星，夜空会亮一点。',
    allowedZones: commonPlacement.sky,
    fallbackIfWrongZone: 'sky',
  }),
  lantern: toolDefinition({
    label: '灯笼',
    toolbarGlyph: glyphFromPaths(lanternPath(128, 124, 92, 118)),
    assetVariants: buildVariants('lantern', [
      lanternPath(128, 124, 92, 118),
      lanternPath(126, 128, 88, 116),
      lanternPath(130, 122, 94, 120),
    ]),
    placementRule: 'hangOrGround',
    maxCountPerStroke: 3,
    stateEffect: { brightness: 0.05, sunlightWarmth: 0.06, fogOpacity: -0.03 },
    soundEffect: 'lantern',
    feedbackText: '现在画出来的都会变成灯笼，局部会更暖更亮。',
    allowedZones: commonPlacement.any,
    fallbackIfWrongZone: 'ground',
  }),
  mushroom: toolDefinition({
    label: '蘑菇',
    toolbarGlyph: glyphFromPaths(mushroomPath(128, 118, 44, 76)),
    assetVariants: buildVariants('mushroom', [
      mushroomPath(128, 118, 44, 76),
      mushroomPath(126, 120, 40, 74),
      mushroomPath(130, 116, 46, 78),
    ]),
    placementRule: 'groundSprout',
    maxCountPerStroke: 4,
    stateEffect: { flowerBloom: 0.04, soilWetness: 0.03, grassCoverage: 0.02 },
    soundEffect: 'mushroom',
    feedbackText: '现在画出来的都会变成蘑菇，地面会更像雨后花园。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
  bridge: toolDefinition({
    label: '小桥',
    toolbarGlyph: glyphFromPaths(bridgePath(128, 144, 150, 36)),
    assetVariants: buildVariants('bridge', [
      bridgePath(128, 144, 150, 36),
      bridgePath(126, 142, 156, 34),
      bridgePath(130, 146, 146, 38),
    ]),
    placementRule: 'spanGroundGap',
    maxCountPerStroke: 3,
    stateEffect: { pathCompletion: 0.1, calmLevel: 0.03 },
    soundEffect: 'bridge',
    feedbackText: '现在画出来的都会变成小桥，路径会更连通。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
};

Object.assign(toolElementMap, {
  rain: aliasTool('rain', 'rainDrop', {
    categories: ['rain'],
    placementRule: 'rainFromSky',
    label: '雨',
    feedbackText: '现在画出来的都会变成雨，土地会更湿。',
    allowedZones: ['sky'],
    fallbackIfWrongZone: 'sky',
  }),
  sun: aliasTool('sun', 'sunlight', {
    label: '阳光',
    feedbackText: '现在画出来的都会变成阳光，花园会更亮。',
    allowedZones: commonPlacement.sky,
  }),
  firstFlower: aliasTool('firstFlower', 'flower', {
    label: '初花',
    feedbackText: '现在画出来的都会变成小花，花苞会打开。',
  }),
  bud: aliasTool('bud', 'flower', {
    label: '花苞',
    feedbackText: '现在画出来的都会变成花苞，花园会多一点柔软。',
  }),
  quietFlower: aliasTool('quietFlower', 'flower', {
    label: '夜花',
    feedbackText: '现在画出来的都会变成安静的小花，夜里也会轻轻亮。',
  }),
  breathLight: aliasTool('breathLight', 'lantern', {
    label: '慢光',
    feedbackText: '现在画出来的都会变成慢光，小角落会暖起来。',
  }),
  windowLight: aliasTool('windowLight', 'lantern', {
    label: '窗光',
    feedbackText: '现在画出来的都会变成窗光，远处会亮一点。',
  }),
  moon: aliasTool('moon', 'star', {
    label: '月亮',
    feedbackText: '现在画出来的都会变成月亮，夜色会更安静。',
    allowedZones: commonPlacement.sky,
  }),
  moonbeam: aliasTool('moonbeam', 'sunlight', {
    label: '月光',
    feedbackText: '现在画出来的都会变成月光，雾会轻一点。',
    allowedZones: commonPlacement.sky,
  }),
  firefly: aliasTool('firefly', 'star', {
    label: '萤火',
    feedbackText: '现在画出来的都会变成萤火，小亮点会闪起来。',
    allowedZones: commonPlacement.sky,
  }),
  softWind: aliasTool('softWind', 'windLine', {
    label: '轻风',
    feedbackText: '现在画出来的都会变成轻风，草会慢慢摆动。',
  }),
  windBell: aliasTool('windBell', 'windLine', {
    label: '风铃',
    feedbackText: '现在画出来的都会变成风铃线，轻轻晃一下。',
  }),
  ribbon: aliasTool('ribbon', 'windLine', {
    label: '彩带',
    feedbackText: '现在画出来的都会变成彩带，空中会轻轻飘。',
  }),
  floatingLeaf: aliasTool('floatingLeaf', 'windLine', {
    label: '飘叶',
    feedbackText: '现在画出来的都会变成飘叶，风会把它带走。',
  }),
  reed: aliasTool('reed', 'grass', {
    label: '芦苇',
    feedbackText: '现在画出来的都会变成芦苇，岸边会长高一点。',
  }),
  moss: aliasTool('moss', 'grass', {
    label: '青苔',
    feedbackText: '现在画出来的都会变成青苔，石头会更柔软。',
  }),
  sprout: aliasTool('sprout', 'grass', {
    label: '嫩芽',
    feedbackText: '现在画出来的都会变成嫩芽，土里会冒出一点新意。',
  }),
  smallTree: aliasTool('smallTree', 'grass', {
    label: '小树',
    feedbackText: '现在画出来的都会变成小树，边角会更稳。',
  }),
  memorySeed: aliasTool('memorySeed', 'seed', {
    categories: ['circle'],
    label: '记忆种子',
    feedbackText: '现在画出来的都会变成记忆种子，记忆小点会连起来。',
  }),
  leafBoat: aliasTool('leafBoat', 'waterLine', {
    label: '叶船',
    feedbackText: '现在画出来的都会变成叶船，会沿着水走。',
    allowedZones: commonPlacement.water,
  }),
  puddle: aliasTool('puddle', 'waterLine', {
    label: '水洼',
    feedbackText: '现在画出来的都会变成水洼，地面会有一点反光。',
    allowedZones: commonPlacement.ground,
  }),
  ripple: aliasTool('ripple', 'waterLine', {
    label: '涟漪',
    feedbackText: '现在画出来的都会变成涟漪，水面会轻轻散开。',
    allowedZones: commonPlacement.water,
  }),
  snail: aliasTool('snail', 'mushroom', {
    categories: ['mushroom', 'circle'],
    label: '蘑菇',
    placementRule: 'groundSprout',
    maxCountPerStroke: 3,
    stateEffect: { pathCompletion: 0.04, calmLevel: 0.08, soilWetness: 0.02 },
    soundEffect: 'soil',
    feedbackText: '现在画出来的会整理成蘑菇，雨后的地面会更清楚。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
  snailTrail: aliasTool('snailTrail', 'mushroom', {
    categories: ['mushroom', 'circle'],
    label: '蘑菇',
    placementRule: 'groundSprout',
    maxCountPerStroke: 3,
    stateEffect: { pathCompletion: 0.04, calmLevel: 0.08, soilWetness: 0.02 },
    soundEffect: 'soil',
    feedbackText: '现在画出来的会整理成蘑菇，雨后的地面会更清楚。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
  signpost: aliasTool('signpost', 'bridge', {
    label: '路牌',
    feedbackText: '现在画出来的都会变成路牌，小路方向更清楚。',
  }),
  stone: aliasTool('stone', 'bridge', {
    categories: ['circle'],
    label: '石头',
    toolbarGlyph: glyphFromPaths([circlePath(128, 138, 44, 0.18), circlePath(106, 132, 18, 0.12), circlePath(152, 146, 16, 0.1)]),
    assetVariants: buildVariants('stone', [
      [circlePath(128, 138, 44, 0.18), circlePath(106, 132, 18, 0.12), circlePath(152, 146, 16, 0.1)],
      [circlePath(126, 140, 42, 0.14), circlePath(148, 132, 17, 0.12)],
      [circlePath(130, 136, 46, 0.16), circlePath(110, 144, 15, 0.12)],
    ]),
    placementRule: 'spanGroundGap',
    maxCountPerStroke: 3,
    stateEffect: { pathCompletion: 0.08, calmLevel: 0.03 },
    soundEffect: 'soil',
    feedbackText: '现在画出来的都会变成石头，小路会更连起来。',
    allowedZones: commonPlacement.ground,
    fallbackIfWrongZone: 'ground',
  }),
  shadow: aliasTool('shadow', 'soilLine', {
    label: '柔影',
    feedbackText: '现在画出来的都会变成柔影，角落会更安静。',
  }),
  wind: aliasTool('wind', 'windLine', {
    label: '风',
    feedbackText: '现在画出来的都会变成风线，花园会轻轻动起来。',
  }),
  constellationLine: aliasTool('constellationLine', 'star', {
    label: '星座线',
    feedbackText: '现在画出来的都会变成星座线，星光会连起来。',
    allowedZones: commonPlacement.sky,
  }),
  rainbow: aliasTool('rainbow', 'windLine', {
    label: '彩虹',
    feedbackText: '现在画出来的都会变成淡彩弧线，天色会更柔和。',
    allowedZones: commonPlacement.sky,
  }),
  garden: aliasTool('garden', 'seed', {
    categories: ['circle'],
    label: '花园',
    feedbackText: '现在画出来的都会变成花园小点，土壤会更松。',
  }),
});

for (const [toolId, tool] of Object.entries(toolElementMap)) {
  toolElementMap[toolId] = {
    ...tool,
    color: tool.color || resolveToolColor(toolId, tool),
    categories: tool.categories || getQuickDrawGrammar(toolId).referenceCategories,
  };
}

export const toolIds = Object.keys(toolElementMap);

export function getToolElement(toolId) {
  return toolElementMap[toolId] || toolElementMap.seed;
}

export function getToolbarGlyph(toolId) {
  return getToolElement(toolId).toolbarGlyph;
}

export function getAssetVariants(toolId) {
  return getToolElement(toolId).assetVariants;
}

function toolDefinition(definition) {
  return {
    ...definition,
    assetVariants: definition.assetVariants || [],
    placementRule: definition.placementRule || 'scatterAlongStroke',
    maxCountPerStroke: definition.maxCountPerStroke || 3,
    stateEffect: definition.stateEffect || {},
    soundEffect: definition.soundEffect || 'soft',
    feedbackText: definition.feedbackText || '花园接住了这一笔。',
    allowedZones: definition.allowedZones || commonPlacement.any,
    fallbackIfWrongZone: definition.fallbackIfWrongZone || 'ground',
  };
}

function aliasTool(id, baseId, overrides = {}) {
  const base = toolElementMap[baseId];
  const categories = overrides.categories || base.categories || (hasQuickDrawGrammar(id) ? getQuickDrawGrammar(id).referenceCategories : getQuickDrawGrammar(baseId).referenceCategories);
  return toolDefinition({
    ...base,
    ...overrides,
    categories,
    label: overrides.label || base.label,
    toolbarGlyph: overrides.toolbarGlyph || base.toolbarGlyph,
    assetVariants: overrides.assetVariants || [],
    placementRule: overrides.placementRule || base.placementRule,
    maxCountPerStroke: overrides.maxCountPerStroke || base.maxCountPerStroke,
    stateEffect: { ...base.stateEffect, ...overrides.stateEffect },
    soundEffect: overrides.soundEffect || base.soundEffect,
    feedbackText: overrides.feedbackText || base.feedbackText,
    allowedZones: overrides.allowedZones || base.allowedZones,
    fallbackIfWrongZone: overrides.fallbackIfWrongZone || base.fallbackIfWrongZone,
    id,
  });
}

function buildVariants(name, variants) {
  return variants.map((paths, index) => ({
    name: `${name}-${index + 1}`,
    viewBox: '0 0 256 256',
    strokeWidth: 5,
    paths,
  }));
}

function glyphFromPaths(paths) {
  return {
    viewBox: '0 0 256 256',
    strokeWidth: 5,
    paths,
    className: drawStyleClass('glyph'),
  };
}

function resolveToolColor(toolId, tool) {
  if (['seed', 'soilLine', 'bridge', 'signpost', 'shadow', 'stone', 'mushroom', 'garden'].includes(toolId)) return '#8A6B55';
  if (['grass', 'reed', 'moss', 'sprout', 'smallTree'].includes(toolId)) return '#5F856D';
  if (['flower', 'firstFlower', 'bud', 'quietFlower'].includes(toolId)) return '#A06E7B';
  if (['sunlight', 'sun', 'lantern', 'breathLight', 'windowLight', 'moonbeam'].includes(toolId)) return '#9A8560';
  if (toolId === 'cloud') return '#70829A';
  if (['windLine', 'softWind', 'windBell', 'ribbon', 'floatingLeaf', 'wind'].includes(toolId)) return '#6D7E9B';
  if (['rain', 'rainDrop', 'dew', 'waterLine', 'leafBoat', 'puddle', 'ripple', 'snail', 'snailTrail'].includes(toolId)) return '#6E8CA2';
  if (['star', 'moon', 'firefly', 'constellationLine'].includes(toolId)) return '#7C739C';
  if (toolId === 'rainbow') return '#8C7AA7';
  if (toolId === 'memorySeed') return '#87715F';
  if (tool?.stateEffect?.nightSparkle) return '#7C739C';
  if (tool?.stateEffect?.waterFlow || tool?.stateEffect?.rainDensity) return '#6E8CA2';
  if (tool?.stateEffect?.flowerBloom) return '#A06E7B';
  if (tool?.stateEffect?.grassCoverage) return '#5F856D';
  return '#6F7A93';
}
