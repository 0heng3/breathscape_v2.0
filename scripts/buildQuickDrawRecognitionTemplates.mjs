import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { gardenDays } from '../src/data/gardenDays.js';
import { getQuickDrawGrammar } from '../src/data/quickdrawElementGrammar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inputDir = path.join(rootDir, 'quickdraw_selected');
const outputDir = path.join(rootDir, 'public', 'quickdraw-recognition');
const srcOutputDir = path.join(rootDir, 'src', 'data');
const maxPerCategory = Number(process.argv.find((arg) => arg.startsWith('--max='))?.slice(6)) || 24;
const samplePoints = Number(process.argv.find((arg) => arg.startsWith('--points='))?.slice(9)) || 32;

await fs.promises.mkdir(outputDir, { recursive: true });
await fs.promises.mkdir(srcOutputDir, { recursive: true });

const toolIds = [...new Set(gardenDays.flatMap((day) => day.tools))];
const categoryToTools = new Map();

for (const toolId of toolIds) {
  const grammar = getQuickDrawGrammar(toolId);
  for (const category of grammar.referenceCategories || []) {
    const list = categoryToTools.get(category) || [];
    list.push(toolId);
    categoryToTools.set(category, list);
  }
}

const templates = {
  source: 'quickdraw_selected',
  generatedAt: new Date().toISOString(),
  maxPerCategory,
  samplePoints,
  categories: {},
  categoryToTools: Object.fromEntries(categoryToTools),
};

for (const category of [...categoryToTools.keys()].sort((a, b) => a.localeCompare(b))) {
  const inputPath = path.join(inputDir, `${category}.ndjson`);
  if (!fs.existsSync(inputPath)) continue;

  const stream = fs.createReadStream(inputPath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const categoryTemplates = [];

  for await (const line of reader) {
    if (categoryTemplates.length >= maxPerCategory) break;
    if (!line.trim()) continue;

    let sample;
    try {
      sample = JSON.parse(line);
    } catch {
      continue;
    }

    if (sample.recognized !== true || !Array.isArray(sample.drawing)) continue;
    const template = drawingToTemplate(sample.drawing, samplePoints);
    if (!template) continue;

    categoryTemplates.push({
      key_id: sample.key_id,
      ...template,
    });
  }

  if (categoryTemplates.length) {
    templates.categories[category] = categoryTemplates;
  }
}

await fs.promises.writeFile(
  path.join(outputDir, 'templates.json'),
  `${JSON.stringify(templates)}\n`,
  'utf8',
);
await fs.promises.writeFile(
  path.join(srcOutputDir, 'quickdrawRecognitionTemplates.json'),
  `${JSON.stringify(templates)}\n`,
  'utf8',
);

console.log(`Generated recognition templates for ${Object.keys(templates.categories).length} categories.`);

function drawingToTemplate(drawing, targetCount) {
  const strokes = drawing
    .map((stroke) => {
      const [xs, ys] = stroke;
      if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length < 2) return [];
      return xs.map((x, index) => ({
        x: Number(x) || 0,
        y: Number(ys[index]) || 0,
      }));
    })
    .filter((stroke) => stroke.length >= 2);

  if (!strokes.length) return null;
  const points = normalizePoints(strokes.flat());
  if (points.length < 2) return null;
  const resampled = resamplePoints(points, targetCount);
  const bounds = getBounds(points);
  const vector = getVector(points);
  return {
    points: resampled.map((point) => [round(point.x), round(point.y)]),
    features: {
      aspect: round(bounds.width / Math.max(bounds.height, 0.001)),
      closedness: round(getClosedness(points, bounds)),
      directionX: round(vector.x),
      directionY: round(vector.y),
      turnRate: round(getTurnRate(points)),
      strokeCount: strokes.length,
    },
  };
}

function normalizePoints(points) {
  const bounds = getBounds(points);
  const scale = 1 / Math.max(bounds.width, bounds.height, 1);
  const offsetX = -bounds.minX;
  const offsetY = -bounds.minY;
  return points.map((point) => ({
    x: (point.x + offsetX) * scale,
    y: (point.y + offsetY) * scale,
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
    const local = (target - distances[segment]) / Math.max(0.001, distances[Math.min(segment + 1, distances.length - 1)] - distances[segment]);
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
  const span = Math.max(bounds.width, bounds.height, 0.001);
  return clamp(1 - Math.hypot(last.x - first.x, last.y - first.y) / span, 0, 1);
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
