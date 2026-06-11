export const quickdrawElementGrammar = {
  wind: grammar('wind', ['squiggle', 'line', 'hurricane', 'tornado', 'windmill'], 'wind', 'squiggle'),
  windLine: grammar('wind', ['line', 'squiggle', 'windmill'], 'wind', 'line'),
  softWind: grammar('wind', ['squiggle', 'line', 'cloud'], 'wind', 'squiggle'),
  cloud: grammar('wind', ['cloud', 'squiggle', 'line'], 'sky', 'cloud'),
  ribbon: grammar('wind', ['squiggle', 'line', 'rainbow'], 'wind', 'squiggle'),
  floatingLeaf: grammar('wind', ['leaf', 'squiggle'], 'wind', 'leaf'),
  windBell: grammar('light', ['lantern', 'light bulb', 'windmill'], 'light', 'lantern'),

  rain: grammar('rain', ['rain', 'line'], 'rain', 'rain'),
  rainDrop: grammar('rain', ['rain', 'line'], 'rain', 'rain'),
  dew: grammar('rain', ['rain'], 'rain', 'rain'),
  waterLine: grammar('water', ['river', 'ocean', 'line'], 'rain', 'river'),
  ripple: grammar('water', ['pond', 'circle'], 'water', 'pond'),
  puddle: grammar('water', ['pond', 'circle'], 'water', 'pond'),
  leafBoat: grammar('water', ['leaf'], 'water', 'leaf'),
  snail: grammar('water', ['snail', 'circle', 'squiggle'], 'water', 'snail'),
  snailTrail: grammar('water', ['snail', 'squiggle'], 'water', 'snail'),

  grass: grammar('plant', ['grass'], 'plant', 'grass'),
  seed: grammar('plant', ['circle'], 'plant', 'circle'),
  reed: grammar('plant', ['grass', 'line'], 'plant', 'grass'),
  moss: grammar('plant', ['circle', 'leaf'], 'plant', 'circle'),
  smallTree: grammar('plant', ['tree', 'line', 'grass'], 'plant', 'tree'),
  sprout: grammar('plant', ['grass', 'line'], 'plant', 'grass'),
  memorySeed: grammar('plant', ['circle'], 'plant', 'circle'),

  flower: grammar('flower', ['flower'], 'bloom', 'flower'),
  firstFlower: grammar('flower', ['flower'], 'bloom', 'flower'),
  bud: grammar('flower', ['flower'], 'bloom', 'flower'),
  quietFlower: grammar('flower', ['flower'], 'bloom', 'flower'),
  mushroom: grammar('flower', ['mushroom'], 'bloom', 'mushroom'),

  sun: grammar('light', ['sun'], 'light', 'sun'),
  sunlight: grammar('light', ['sun'], 'light', 'sun'),
  lantern: grammar('light', ['lantern', 'light bulb'], 'light', 'lantern'),
  firefly: grammar('light', ['star', 'light bulb'], 'light', 'star'),
  moon: grammar('sky', ['moon'], 'sky', 'moon'),
  windowLight: grammar('light', ['light bulb', 'lantern'], 'light', 'lantern'),
  breathLight: grammar('light', ['light bulb', 'sun'], 'light', 'light bulb'),
  star: grammar('sky', ['star'], 'sky', 'star'),
  moonbeam: grammar('sky', ['moon'], 'sky', 'moon'),
  constellationLine: grammar('sky', ['line', 'star'], 'sky', 'line'),
  rainbow: grammar('sky', ['rainbow'], 'sky', 'rainbow'),

  stone: grammar('stone', ['circle', 'potato'], 'stone', 'circle'),
  bridge: grammar('stone', ['bridge', 'line'], 'stone', 'bridge'),
  signpost: grammar('stone', ['line', 'bridge'], 'stone', 'line'),
  soilLine: grammar('stone', ['line'], 'stone', 'line'),
  shadow: grammar('stone', ['line'], 'stone', 'line'),

  default: grammar('default', ['line', 'squiggle'], 'sky', 'line'),
};

export function getQuickDrawGrammar(toolId) {
  return quickdrawElementGrammar[toolId] || quickdrawElementGrammar.default;
}

export function hasQuickDrawGrammar(toolId) {
  return Object.prototype.hasOwnProperty.call(quickdrawElementGrammar, toolId);
}

function grammar(elementType, referenceCategories, inkFamily, glyph) {
  return {
    elementType,
    referenceCategories,
    inkFamily,
    glyph,
  };
}
