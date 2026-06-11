import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const OUT_DIR = resolve(ROOT, 'public', 'breathscape-svg-assets');
const VARIANT_COUNT = 5;

const toolIds = [
  'seed',
  'memorySeed',
  'garden',
  'grass',
  'reed',
  'sprout',
  'moss',
  'smallTree',
  'sunlight',
  'sun',
  'breathLight',
  'moonbeam',
  'dew',
  'rain',
  'rainDrop',
  'soilLine',
  'shadow',
  'flower',
  'firstFlower',
  'bud',
  'quietFlower',
  'cloud',
  'windLine',
  'softWind',
  'wind',
  'windBell',
  'ribbon',
  'floatingLeaf',
  'waterLine',
  'ripple',
  'puddle',
  'snailTrail',
  'leafBoat',
  'bridge',
  'signpost',
  'stone',
  'lantern',
  'windowLight',
  'firefly',
  'moon',
  'star',
  'constellationLine',
  'mushroom',
  'rainbow',
];

const generatorByTool = {
  seed: seedPaths,
  memorySeed: memorySeedPaths,
  garden: gardenPaths,
  grass: grassPaths,
  reed: reedPaths,
  sprout: sproutPaths,
  moss: mossPaths,
  smallTree: smallTreePaths,
  sunlight: sunlightPaths,
  sun: sunlightPaths,
  breathLight: breathLightPaths,
  moonbeam: moonbeamPaths,
  dew: dewPaths,
  rain: rainPaths,
  rainDrop: rainPaths,
  soilLine: soilLinePaths,
  shadow: shadowPaths,
  flower: flowerPaths,
  firstFlower: flowerPaths,
  bud: budPaths,
  quietFlower: quietFlowerPaths,
  cloud: cloudPaths,
  windLine: windPaths,
  softWind: softWindPaths,
  wind: windPaths,
  windBell: windBellPaths,
  ribbon: ribbonPaths,
  floatingLeaf: floatingLeafPaths,
  waterLine: waterLinePaths,
  ripple: ripplePaths,
  puddle: puddlePaths,
  snailTrail: snailTrailPaths,
  leafBoat: leafBoatPaths,
  bridge: bridgePaths,
  signpost: signpostPaths,
  stone: stonePaths,
  lantern: lanternPaths,
  windowLight: windowLightPaths,
  firefly: fireflyPaths,
  moon: moonPaths,
  star: starPaths,
  constellationLine: constellationPaths,
  mushroom: mushroomPaths,
  rainbow: rainbowPaths,
};

await resetOutputDir();

const meta = {
  generatedAt: new Date().toISOString(),
  source: 'BreathScape generated SVG rules; QuickDraw remains recognition reference only.',
  viewBox: '0 0 256 256',
  variantCount: VARIANT_COUNT,
  tools: {},
};

for (const toolId of toolIds) {
  const generator = generatorByTool[toolId];
  if (!generator) continue;
  const toolDir = resolve(OUT_DIR, toolId);
  await mkdir(toolDir, { recursive: true });
  meta.tools[toolId] = [];
  for (let variant = 1; variant <= VARIANT_COUNT; variant += 1) {
    const fileName = `${toolId}_${String(variant).padStart(3, '0')}.svg`;
    const svg = serializeSvg(generator(variant), getStrokeWidth(toolId));
    await writeFile(resolve(toolDir, fileName), svg, 'utf8');
    meta.tools[toolId].push(`/breathscape-svg-assets/${toolId}/${fileName}`);
  }
}

await writeFile(resolve(OUT_DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

console.log(`Generated ${Object.keys(meta.tools).length} tool asset sets in ${OUT_DIR}`);

async function resetOutputDir() {
  const safeOutDir = resolve(OUT_DIR);
  const safeRoot = resolve(ROOT);
  if (!safeOutDir.startsWith(`${safeRoot}${sep}`)) {
    throw new Error(`Refusing to write outside workspace: ${safeOutDir}`);
  }
  await rm(safeOutDir, { recursive: true, force: true });
  await mkdir(safeOutDir, { recursive: true });
}

function serializeSvg(paths, strokeWidth) {
  const body = paths
    .filter(Boolean)
    .map((d) => `  <path d="${d}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('\n');
  return `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">\n${body}\n</svg>\n`;
}

function getStrokeWidth(toolId) {
  if (['rain', 'rainDrop', 'dew', 'moss', 'firefly', 'star', 'constellationLine'].includes(toolId)) return 7;
  if (['soilLine', 'shadow', 'snailTrail', 'moonbeam', 'rainbow'].includes(toolId)) return 6;
  if (['lantern', 'windowLight', 'bridge', 'signpost', 'stone', 'mushroom'].includes(toolId)) return 8;
  return 7;
}

function seedPaths(v) {
  const o = v - 3;
  return [
    oval(128 + o, 132 - o, 30 + v, 42 - v),
    curve(124 + o, 112, 139 + o, 119, 145 + o, 134),
    smallSpark(92 + o * 3, 86 + o, 8 + v),
  ];
}

function memorySeedPaths(v) {
  return [
    ...seedPaths(v).slice(0, 2),
    smallSpark(168 - v * 2, 88 + v, 13),
    curve(86, 184 - v, 126, 168 + v, 171, 183 - v),
  ];
}

function gardenPaths(v) {
  return [
    ...seedPaths(v).slice(0, 1),
    blade(104, 184, 52 + v * 4, -18),
    blade(128, 188, 64 + v * 2, 4),
    blade(154, 184, 48 + v * 3, 16),
    smallSpark(130, 96, 8),
  ];
}

function grassPaths(v) {
  const lean = (v - 3) * 2;
  return [
    blade(78, 204, 82 + v * 3, -22 + lean),
    blade(105, 206, 105 + v * 4, -8 + lean),
    blade(132, 207, 96 + v * 3, 5 + lean),
    blade(160, 204, 88 + v * 2, 20 + lean),
    blade(185, 207, 66 + v * 3, 26 + lean),
  ];
}

function reedPaths(v) {
  return [
    blade(94, 212, 132 + v * 4, -12),
    blade(132, 214, 148 + v * 3, 5),
    blade(170, 212, 126 + v * 4, 17),
    oval(88, 86 - v, 8, 28),
    oval(139, 68 + v, 9, 31),
    oval(178, 92 - v, 8, 27),
  ];
}

function sproutPaths(v) {
  return [
    curve(128, 210, 126 - v, 168, 128, 130),
    leaf(126, 150, -42 - v * 2, -20, 0.78),
    leaf(130, 137, 42 + v, -26, 0.72),
    curve(96, 216, 126, 205, 160, 216),
  ];
}

function mossPaths(v) {
  return [
    curve(70, 184, 96, 168 - v, 122, 184),
    curve(118, 184, 142, 164 + v, 176, 184),
    curve(84, 204, 128, 192 - v, 190, 205),
    dot(86, 176, 4 + v * 0.6),
    dot(146, 170, 5),
    dot(172, 190, 4),
  ];
}

function smallTreePaths(v) {
  return [
    curve(128, 210, 130, 162, 126, 116),
    leaf(126, 128, -42, -30 - v, 0.9),
    leaf(130, 118, 42, -34, 0.85),
    leaf(126, 96, -30, -28, 0.72),
    curve(94, 214, 128, 204, 166, 214),
  ];
}

function sunlightPaths(v) {
  return [
    circle(128, 126, 27 + v),
    ray(128, 70 - v, 128, 39),
    ray(128, 183 + v, 128, 216),
    ray(73 - v, 126, 42, 126),
    ray(183 + v, 126, 216, 126),
    ray(91, 90, 69, 68),
    ray(165, 91, 188, 68),
    ray(91, 164, 68, 186),
    ray(165, 164, 188, 187),
  ];
}

function breathLightPaths(v) {
  return [
    circle(128, 130, 24 + v),
    circle(128, 130, 48 + v * 3),
    curve(98, 178, 128, 195 + v, 158, 178),
    smallSpark(170, 86, 9 + v),
  ];
}

function moonbeamPaths(v) {
  return [
    curve(86, 48, 122, 88, 166, 54),
    curve(88, 82, 125, 120 + v, 170, 86),
    curve(94, 118, 130, 154 + v, 176, 120),
    curve(106, 154, 136, 184 + v, 180, 154),
  ];
}

function dewPaths(v) {
  return [
    oval(110, 118, 14 + v, 19 + v),
    oval(146, 150, 11 + v, 16 + v),
    oval(88, 168, 8 + v, 12 + v),
    smallSpark(172, 96, 7 + v),
  ];
}

function rainPaths(v) {
  const tilt = v * 2;
  return [
    ray(90, 74, 78 - tilt, 112),
    ray(124, 62, 112 - tilt, 106),
    ray(160, 80, 148 - tilt, 124),
    ray(102, 138, 90 - tilt, 178),
    ray(144, 132, 132 - tilt, 172),
    ray(184, 134, 172 - tilt, 174),
  ];
}

function soilLinePaths(v) {
  return [
    wave(70, 152, 186, 154 + v, 160, 150, 188, 153),
    wave(74, 174, 110, 166 - v, 154, 180, 190, 171),
    wave(84, 194, 128, 202 + v, 172, 190, 200, 198),
  ];
}

function shadowPaths(v) {
  return [
    curve(58, 166, 118, 143 - v, 198, 165),
    curve(76, 190, 128, 178 + v, 190, 190),
    curve(96, 208, 132, 216, 170, 208),
  ];
}

function flowerPaths(v) {
  const r = 34 + v;
  return [
    petal(128, 118, 0, r),
    petal(128, 118, 72, r),
    petal(128, 118, 144, r),
    petal(128, 118, 216, r),
    petal(128, 118, 288, r),
    circle(128, 118, 13 + v * 0.4),
    curve(128, 133, 126 + v, 164, 130, 202),
    leaf(128, 166, -38, -14, 0.58),
  ];
}

function budPaths(v) {
  return [
    oval(128, 112, 22 + v, 31 + v),
    curve(110, 116, 128, 84 - v, 146, 116),
    curve(128, 142, 128 - v, 170, 130, 208),
    leaf(128, 162, -30, -14, 0.54),
    leaf(130, 176, 34, -14, 0.48),
  ];
}

function quietFlowerPaths(v) {
  return [
    petal(128, 124, 20, 32 + v),
    petal(128, 124, 100, 29 + v),
    petal(128, 124, 180, 31 + v),
    petal(128, 124, 260, 28 + v),
    circle(128, 124, 11),
    curve(128, 138, 124, 169, 132, 204),
    smallSpark(174, 82, 9),
  ];
}

function cloudPaths(v) {
  return [
    `M ${50} ${156 + v} C ${60} ${124} ${92} ${126 - v} ${102} ${147} C ${110} ${113} ${154} ${110 + v} ${164} ${144} C ${190} ${136} ${214} ${151} ${211} ${174} C ${170} ${181 + v} ${98} ${182 - v} ${55} ${174} C ${45} ${169} ${43} ${161} ${50} ${156 + v}`,
    curve(78, 172 + v, 126, 184, 190, 172 - v),
  ];
}

function windPaths(v) {
  return [
    curve(48, 98 + v, 96, 78 - v, 145, 98 + v, 208, 84),
    curve(66, 135 - v, 118, 116 + v, 166, 135 - v, 212, 124),
    curve(54, 173 + v, 100, 158 - v, 142, 174 + v, 184, 162),
  ];
}

function softWindPaths(v) {
  return [
    curve(64, 112 + v, 110, 100 - v, 166, 112, 204, 104),
    curve(80, 148 - v, 128, 138 + v, 176, 148, 206, 142),
  ];
}

function windBellPaths(v) {
  return [
    ray(128, 40, 128, 70 + v),
    curve(96, 80, 128, 58 - v, 160, 80),
    `M 96 ${80} C 100 ${125 + v} 116 ${158} 128 ${164} C 142 ${156} 156 ${126 + v} 160 80`,
    ray(112, 166, 108, 196),
    ray(144, 166, 150, 196),
    smallSpark(174, 132, 8),
  ];
}

function ribbonPaths(v) {
  return [
    curve(54, 92 + v, 95, 66, 138, 94, 198, 70 + v),
    curve(58, 128 - v, 104, 102, 148, 132, 204, 108),
    curve(68, 164 + v, 112, 140, 156, 170, 204, 150),
  ];
}

function floatingLeafPaths(v) {
  return [
    leaf(128, 130, 78 + v * 2, -28, 1.05),
    curve(92, 144, 132, 126 - v, 170, 118),
    curve(72, 176, 106, 160 + v, 144, 176),
  ];
}

function waterLinePaths(v) {
  return [
    wave(44, 116 + v, 82, 96, 124, 118, 164, 104),
    wave(66, 148 - v, 108, 130, 154, 152, 206, 136),
    wave(48, 180 + v, 92, 164, 140, 184, 198, 170),
  ];
}

function ripplePaths(v) {
  return [
    oval(128, 132, 24 + v * 2, 10 + v),
    oval(128, 132, 52 + v * 3, 19 + v),
    oval(128, 132, 82 + v * 3, 29 + v),
  ];
}

function puddlePaths(v) {
  return [
    oval(128, 150, 76 + v * 2, 30 + v),
    wave(80, 148, 110, 140 - v, 148, 152 + v, 178, 144),
    smallSpark(160, 126, 7),
  ];
}

function snailTrailPaths(v) {
  return [
    curve(50, 150, 92, 132 + v, 128, 152, 204, 138 - v),
    curve(76, 172, 118, 160 - v, 156, 176, 196, 168),
    dot(70, 146, 3.5),
    dot(118, 153, 3.5),
    dot(174, 143, 3.5),
  ];
}

function leafBoatPaths(v) {
  return [
    leaf(128, 126, 92 + v * 2, -16, 1.08),
    curve(78, 138, 128, 128 - v, 178, 120),
    curve(70, 168, 118, 154, 180, 166),
    wave(76, 186, 118, 174 + v, 160, 188, 204, 176),
  ];
}

function bridgePaths(v) {
  return [
    curve(48, 152, 94, 104 - v, 128, 104 - v, 208, 152),
    ray(48, 154, 208, 154),
    ray(70, 142, 70, 176),
    ray(100, 122, 100, 174),
    ray(132, 112, 132, 174),
    ray(164, 123, 164, 174),
    ray(194, 143, 194, 176),
  ];
}

function signpostPaths(v) {
  return [
    ray(126, 68, 126, 214),
    `M 84 ${76 + v} L 176 ${76 + v} L 162 ${98 + v} L 84 ${98 + v} Z`,
    `M 172 ${124 - v} L 82 ${124 - v} L 96 ${146 - v} L 172 ${146 - v} Z`,
    curve(98, 214, 126, 204, 158, 214),
  ];
}

function stonePaths(v) {
  return [
    `M ${64} ${158 + v} C ${74} ${120} ${104} ${112 - v} ${130} ${130} C ${154} ${108 + v} ${190} ${126} ${200} ${158} C ${184} ${188 + v} ${94} ${190 - v} ${64} ${158 + v}`,
    curve(90, 160, 120, 148 - v, 156, 158),
    curve(112, 178, 146, 168 + v, 178, 176),
  ];
}

function lanternPaths(v) {
  return [
    ray(128, 38, 128, 64),
    curve(96, 72, 128, 54 - v, 160, 72),
    `M 96 ${78} C 92 ${124 + v} 108 ${170} 128 ${182} C 148 ${170} 164 ${124 + v} 160 78`,
    curve(104, 184, 128, 198 + v, 152, 184),
    ray(108, 102, 148, 102),
    ray(112, 142, 144, 142),
  ];
}

function windowLightPaths(v) {
  return [
    `M 82 ${82} L 174 ${72 + v} L 178 ${166} L 88 ${176 - v} Z`,
    ray(128, 78, 132, 172),
    ray(84, 128, 176, 120),
    smallSpark(190, 92, 8),
  ];
}

function fireflyPaths(v) {
  return [
    oval(128, 130, 13 + v, 18 + v),
    leaf(124, 125, -38, -16, 0.54),
    leaf(132, 125, 38, -16, 0.54),
    smallSpark(128, 154, 9 + v),
    smallSpark(176, 88, 7),
  ];
}

function moonPaths(v) {
  return [
    `M 154 ${58 + v} C 108 ${72} 86 ${122} 108 ${162} C 126 ${194} 168 ${204} 196 ${180} C 152 ${180} 126 ${146} 134 ${112} C 138 ${88} 146 ${70} 154 ${58 + v}`,
  ];
}

function starPaths(v) {
  return [
    star(128, 126, 38 + v),
    smallSpark(82, 164, 9),
    smallSpark(178, 168, 8),
  ];
}

function constellationPaths(v) {
  return [
    star(72, 154, 12),
    star(118, 100 + v, 10),
    star(164, 136 - v, 12),
    star(202, 80 + v, 9),
    curve(72, 154, 118, 100 + v, 164, 136 - v, 202, 80 + v),
  ];
}

function mushroomPaths(v) {
  return [
    `M 70 ${128} C 82 ${82 - v} 174 ${82 + v} 188 128 C 164 ${144} 98 ${144} 70 128`,
    `M 106 ${138} C 108 ${176 + v} 118 ${206} 128 ${210} C 140 ${204} 150 ${176 + v} 150 138`,
    dot(106, 116, 5 + v * 0.5),
    dot(134, 104, 4.5),
    dot(158, 120, 4),
    curve(94, 212, 126, 202, 164, 212),
  ];
}

function rainbowPaths(v) {
  return [
    curve(48, 178, 72, 84 - v, 128, 72 - v, 208, 178),
    curve(62, 182, 86, 108 - v, 128, 96 - v, 194, 182),
    curve(78, 184, 98, 132 - v, 128, 120 - v, 178, 184),
    curve(94, 186, 108, 152 - v, 128, 144 - v, 162, 186),
  ];
}

function oval(cx, cy, rx, ry) {
  return `M ${cx} ${cy - ry} C ${cx + rx} ${cy - ry} ${cx + rx} ${cy + ry} ${cx} ${cy + ry} C ${cx - rx} ${cy + ry} ${cx - rx} ${cy - ry} ${cx} ${cy - ry}`;
}

function circle(cx, cy, r) {
  return oval(cx, cy, r, r);
}

function curve(...values) {
  if (values.length === 6) {
    const [x1, y1, x2, y2, x3, y3] = values;
    return `M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3}`;
  }
  const [x1, y1, x2, y2, x3, y3, x4, y4] = values;
  return `M ${x1} ${y1} C ${x2} ${y2} ${x3} ${y3} ${x4} ${y4}`;
}

function wave(x1, y1, x2, y2, x3, y3, x4, y4) {
  return `M ${x1} ${y1} C ${x2} ${y2} ${x3} ${y3} ${x4} ${y4}`;
}

function ray(x1, y1, x2, y2) {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function blade(x, y, height, lean) {
  return `M ${x} ${y} C ${x + lean * 0.15} ${y - height * 0.38} ${x + lean * 0.54} ${y - height * 0.72} ${x + lean} ${y - height}`;
}

function leaf(cx, cy, dx, dy, scale = 1) {
  const tipX = cx + dx * scale;
  const tipY = cy + dy * scale;
  return `M ${cx} ${cy} C ${cx + dx * 0.18} ${cy + dy * 0.86} ${cx + dx * 0.78} ${cy + dy * 0.96} ${tipX} ${tipY} C ${cx + dx * 0.52} ${cy + dy * 0.2} ${cx + dx * 0.12} ${cy + dy * 0.06} ${cx} ${cy}`;
}

function petal(cx, cy, deg, r) {
  const a = (Math.PI * deg) / 180;
  const tipX = cx + Math.cos(a) * r;
  const tipY = cy + Math.sin(a) * r;
  const lx = cx + Math.cos(a - 0.42) * r * 0.48;
  const ly = cy + Math.sin(a - 0.42) * r * 0.48;
  const rx = cx + Math.cos(a + 0.42) * r * 0.48;
  const ry = cy + Math.sin(a + 0.42) * r * 0.48;
  return `M ${lx} ${ly} Q ${tipX} ${tipY} ${rx} ${ry}`;
}

function star(cx, cy, r) {
  const points = [];
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? r : r * 0.42;
    const angle = -Math.PI / 2 + index * (Math.PI / 5);
    points.push(`${cx + Math.cos(angle) * radius} ${cy + Math.sin(angle) * radius}`);
  }
  return `M ${points.join(' L ')} Z`;
}

function smallSpark(cx, cy, r) {
  return `M ${cx} ${cy - r} L ${cx} ${cy + r} M ${cx - r} ${cy} L ${cx + r} ${cy}`;
}

function dot(cx, cy, r) {
  return oval(cx, cy, r, r);
}
