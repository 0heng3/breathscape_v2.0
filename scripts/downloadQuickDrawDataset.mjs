import fs from 'node:fs';
import path from 'node:path';
import { gardenDays } from '../src/data/gardenDays.js';
import { getQuickDrawGrammar } from '../src/data/quickdrawElementGrammar.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const outputDir = path.resolve(rootDir, process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) || 'quickdraw_full');
const all = process.argv.includes('--all');
const explicitCategories = process.argv
  .filter((arg) => arg.startsWith('--category='))
  .map((arg) => arg.slice('--category='.length).trim())
  .filter(Boolean);

const categories = all
  ? await fetchAllCategories()
  : explicitCategories.length
    ? explicitCategories
    : getProjectCategories();

await fs.promises.mkdir(outputDir, { recursive: true });

for (const category of categories) {
  const fileName = `${category}.ndjson`;
  const target = path.join(outputDir, fileName);
  if (fs.existsSync(target)) {
    console.log(`skip ${category}`);
    continue;
  }
  const url = `https://storage.googleapis.com/quickdraw_dataset/full/simplified/${encodeURIComponent(fileName)}`;
  console.log(`download ${category}`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    console.warn(`failed ${category}: ${response.status}`);
    continue;
  }
  const file = fs.createWriteStream(target);
  await new Promise((resolve, reject) => {
    response.body.pipeTo(new WritableStream({
      write(chunk) {
        file.write(Buffer.from(chunk));
      },
      close() {
        file.end(resolve);
      },
      abort(error) {
        file.destroy(error);
        reject(error);
      },
    })).catch(reject);
  });
}

function getProjectCategories() {
  const tools = [...new Set(gardenDays.flatMap((day) => day.tools))];
  return [...new Set(tools.flatMap((toolId) => getQuickDrawGrammar(toolId).referenceCategories || []))]
    .filter((category) => !['potato', 'ocean'].includes(category))
    .sort((a, b) => a.localeCompare(b));
}

async function fetchAllCategories() {
  const response = await fetch('https://raw.githubusercontent.com/googlecreativelab/quickdraw-dataset/master/categories.txt');
  if (!response.ok) throw new Error(`Could not fetch category list: ${response.status}`);
  return (await response.text())
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
