import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { gardenDays } from '../src/data/gardenDays.js';
import { getQuickDrawGrammar } from '../src/data/quickdrawElementGrammar.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const inputDir = path.resolve(rootDir, process.argv.find((arg) => arg.startsWith('--input='))?.slice(8) || 'quickdraw_selected');
const outputDir = path.resolve(rootDir, process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) || 'public/quickdraw-model');
const maxPerCategory = Number(process.argv.find((arg) => arg.startsWith('--max-per-category='))?.slice(19)) || 500;
const epochs = Number(process.argv.find((arg) => arg.startsWith('--epochs='))?.slice(9)) || 18;
const learningRate = Number(process.argv.find((arg) => arg.startsWith('--lr='))?.slice(5)) || 0.08;
const gridSize = Number(process.argv.find((arg) => arg.startsWith('--grid='))?.slice(7)) || 16;

const categories = getProjectCategories().filter((category) => fs.existsSync(path.join(inputDir, `${category}.ndjson`)));
const categoryToTool = Object.fromEntries(categories.map((category) => [category, pickToolForCategory(category)]));

if (!categories.length) {
  throw new Error(`No QuickDraw ndjson files found in ${inputDir}`);
}

const samples = [];
for (const category of categories) {
  const file = path.join(inputDir, `${category}.ndjson`);
  const rows = await readCategorySamples(file, category, maxPerCategory, gridSize);
  samples.push(...rows);
  console.log(`${category}: ${rows.length}`);
}

shuffle(samples, 42);
const inputSize = gridSize * gridSize + 8;
const labelToIndex = Object.fromEntries(categories.map((category, index) => [category, index]));
const weights = Array.from({ length: categories.length }, () => Array(inputSize).fill(0));
const bias = Array(categories.length).fill(0);

for (let epoch = 0; epoch < epochs; epoch += 1) {
  shuffle(samples, epoch + 101);
  let correct = 0;
  let loss = 0;
  for (const sample of samples) {
    const label = labelToIndex[sample.category];
    const logits = weights.map((row, classIndex) => dot(row, sample.features) + bias[classIndex]);
    const probs = softmax(logits);
    if (argmax(probs) === label) correct += 1;
    loss += -Math.log(Math.max(probs[label], 1e-7));
    for (let classIndex = 0; classIndex < categories.length; classIndex += 1) {
      const error = probs[classIndex] - (classIndex === label ? 1 : 0);
      const row = weights[classIndex];
      for (let featureIndex = 0; featureIndex < inputSize; featureIndex += 1) {
        row[featureIndex] -= learningRate * error * sample.features[featureIndex];
      }
      bias[classIndex] -= learningRate * error;
    }
  }
  console.log(`epoch ${epoch + 1}/${epochs} loss=${(loss / samples.length).toFixed(4)} acc=${(correct / samples.length).toFixed(3)}`);
}

await fs.promises.mkdir(outputDir, { recursive: true });
const model = {
  type: 'quickdraw-softmax-sketch-v1',
  generatedAt: new Date().toISOString(),
  source: path.relative(rootDir, inputDir),
  gridSize,
  inputSize,
  labels: categories,
  categoryToTool,
  maxPerCategory,
  sampleCount: samples.length,
  weights: weights.map((row) => row.map(round)),
  bias: bias.map(round),
};
await fs.promises.writeFile(path.join(outputDir, 'model.json'), `${JSON.stringify(model)}\n`, 'utf8');
console.log(`wrote ${path.join(outputDir, 'model.json')}`);

function getProjectCategories() {
  const tools = [...new Set(gardenDays.flatMap((day) => day.tools))];
  return [...new Set(tools.flatMap((toolId) => getQuickDrawGrammar(toolId).referenceCategories || []))]
    .filter((category) => !['potato', 'ocean'].includes(category))
    .sort((a, b) => a.localeCompare(b));
}

function pickToolForCategory(category) {
  const manualMap = {
    bridge: 'bridge',
    circle: 'seed',
    cloud: 'cloud',
    flower: 'firstFlower',
    grass: 'grass',
    lantern: 'lantern',
    leaf: 'leafBoat',
    'light bulb': 'breathLight',
    line: 'windLine',
    moon: 'moon',
    mushroom: 'mushroom',
    pond: 'ripple',
    rain: 'rainDrop',
    rainbow: 'rainbow',
    river: 'waterLine',
    snail: 'snailTrail',
    squiggle: 'windLine',
    star: 'star',
    sun: 'sunlight',
    tree: 'smallTree',
    windmill: 'windLine',
  };
  if (manualMap[category]) return manualMap[category];
  const tools = [...new Set(gardenDays.flatMap((day) => day.tools))];
  return tools.find((toolId) => (getQuickDrawGrammar(toolId).referenceCategories || [])[0] === category)
    || tools.find((toolId) => (getQuickDrawGrammar(toolId).referenceCategories || []).includes(category))
    || 'grass';
}

async function readCategorySamples(file, category, limit, size) {
  const input = fs.createReadStream(file, { encoding: 'utf8' });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  const rows = [];
  for await (const line of reader) {
    if (rows.length >= limit) break;
    if (!line.trim()) continue;
    let sample;
    try {
      sample = JSON.parse(line);
    } catch {
      continue;
    }
    if (sample.recognized !== true || !Array.isArray(sample.drawing)) continue;
    const features = drawingToFeatures(sample.drawing, size);
    if (!features) continue;
    rows.push({ category, features });
  }
  return rows;
}

function drawingToFeatures(drawing, size) {
  const strokes = drawing
    .map(([xs, ys]) => xs?.map((x, index) => ({ x: Number(x), y: Number(ys[index]) })) || [])
    .filter((stroke) => stroke.length >= 2);
  const points = strokes.flat();
  if (points.length < 2) return null;
  const bounds = getBounds(points);
  const scale = (size - 1) / Math.max(bounds.width, bounds.height, 1);
  const grid = Array(size * size).fill(0);
  for (const stroke of strokes) {
    for (let index = 1; index < stroke.length; index += 1) {
      const a = normalizePoint(stroke[index - 1], bounds, scale);
      const b = normalizePoint(stroke[index], bounds, scale);
      drawGridLine(grid, size, a, b);
    }
  }
  const length = getLength(points);
  const diagonal = Math.hypot(bounds.width, bounds.height) || 1;
  const vector = {
    x: (points[points.length - 1].x - points[0].x) / diagonal,
    y: (points[points.length - 1].y - points[0].y) / diagonal,
  };
  return [
    ...grid,
    clamp(bounds.width / Math.max(bounds.height, 1), 0, 8) / 8,
    clamp(bounds.height / Math.max(bounds.width, 1), 0, 8) / 8,
    clamp(strokes.length / 12, 0, 1),
    clamp(points.length / 240, 0, 1),
    clamp(length / Math.max(diagonal * 8, 1), 0, 1),
    clamp(getClosedness(points, bounds), 0, 1),
    clamp((vector.x + 1) / 2, 0, 1),
    clamp((vector.y + 1) / 2, 0, 1),
  ].map((value) => Number(value) || 0);
}

function normalizePoint(point, bounds, scale) {
  return {
    x: (point.x - bounds.minX) * scale,
    y: (point.y - bounds.minY) * scale,
  };
}

function drawGridLine(grid, size, a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t);
    if (x >= 0 && x < size && y >= 0 && y < size) grid[y * size + x] = 1;
  }
}

function getBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function getLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return length;
}

function getClosedness(points, bounds) {
  return 1 - Math.hypot(points.at(-1).x - points[0].x, points.at(-1).y - points[0].y) / Math.max(bounds.width, bounds.height, 1);
}

function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0) || 1;
  return exps.map((value) => value / sum);
}

function dot(a, b) {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += a[index] * b[index];
  return sum;
}

function argmax(values) {
  let best = 0;
  for (let index = 1; index < values.length; index += 1) if (values[index] > values[best]) best = index;
  return best;
}

function shuffle(items, seed) {
  let state = seed >>> 0;
  for (let index = items.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [items[index], items[swap]] = [items[swap], items[index]];
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number(value.toFixed(5));
}
