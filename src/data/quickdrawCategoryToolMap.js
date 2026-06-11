const DIRECT_CATEGORY_TO_TOOL = {
  bridge: 'bridge',
  cloud: 'cloud',
  flower: 'firstFlower',
  grass: 'grass',
  hurricane: 'windLine',
  lantern: 'lantern',
  leaf: 'leafBoat',
  'light bulb': 'breathLight',
  moon: 'moon',
  mushroom: 'mushroom',
  ocean: 'waterLine',
  pond: 'ripple',
  potato: 'stone',
  rain: 'rainDrop',
  rainbow: 'rainbow',
  river: 'waterLine',
  snail: 'snail',
  squiggle: 'windLine',
  star: 'star',
  sun: 'sunlight',
  tree: 'smallTree',
  tornado: 'windLine',
  windmill: 'windLine',
};

export function mapQuickDrawCategoryToTool(category, drawing, availableTools = []) {
  const candidates = getCategoryCandidates(category, drawing);
  if (!availableTools?.length) return candidates[0] || null;
  return candidates.find((toolId) => availableTools.includes(toolId)) || null;
}

function getCategoryCandidates(category, drawing) {
  if (category === 'line') return mapLineLikeDrawing(drawing);
  if (category === 'circle') return mapCircleLikeDrawing(drawing);
  if (category === 'squiggle') return ['windLine', 'softWind', 'ribbon', 'snail', 'soilLine'];
  if (category === 'hurricane' || category === 'tornado') return ['windLine', 'softWind', 'ribbon'];
  if (category === 'rain') return ['rainDrop', 'rain', 'dew'];
  if (category === 'ocean') return ['waterLine', 'ripple', 'puddle'];
  if (category === 'potato') return ['stone', 'moss', 'seed'];
  if (category === 'star') return ['star', 'firefly'];
  if (category === 'flower') return ['firstFlower', 'flower', 'bud', 'quietFlower'];
  if (category === 'leaf') return ['leafBoat', 'floatingLeaf'];
  if (category === 'light bulb') return ['lantern', 'breathLight', 'windowLight', 'firefly'];
  if (category === 'sun') return ['sunlight', 'sun', 'moonbeam'];

  const direct = DIRECT_CATEGORY_TO_TOOL[category];
  return direct ? [direct] : [];
}

function mapLineLikeDrawing(drawing) {
  const direction = drawing?.directionMain || drawing?.direction;
  const zone = drawing?.zone;
  const speed = Number(drawing?.speedAvg || drawing?.speed || 0);
  const vectorY = Number(drawing?.vectorY || 0);
  const length = Number(drawing?.length || 0);

  if (zone === 'water') return ['waterLine', 'ripple', 'rainDrop'];
  if (zone === 'sky' && (speed > 0.4 || direction === 'right' || direction === 'left')) {
    return ['windLine', 'cloud', 'constellationLine'];
  }
  if (direction === 'up' || (vectorY < -0.32 && length < 190)) return ['grass', 'sprout', 'reed'];
  if (zone === 'ground') return ['soilLine', 'grass', 'bridge'];
  return ['windLine', 'waterLine', 'soilLine', 'grass'];
}

function mapCircleLikeDrawing(drawing) {
  const zone = drawing?.zone;
  const direction = drawing?.directionMain || drawing?.direction;
  const width = Number(drawing?.boundingBox?.width || 0);
  const height = Number(drawing?.boundingBox?.height || 0);
  const size = Math.max(width, height);

  if (zone === 'sky') return ['sunlight', 'star', 'moon', 'cloud'];
  if (zone === 'water') return ['ripple', 'puddle', 'waterLine'];
  if (direction === 'loop' && size > 70) return ['sunlight', 'firstFlower', 'seed'];
  return ['seed', 'memorySeed', 'stone', 'breathLight'];
}
