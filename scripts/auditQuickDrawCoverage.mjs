import fs from 'node:fs';
import path from 'node:path';
import { gardenDays } from '../src/data/gardenDays.js';
import { getQuickDrawGrammar } from '../src/data/quickdrawElementGrammar.js';

const inputDir = process.argv.find((arg) => arg.startsWith('--input='))?.slice(8) || 'quickdraw_selected';
const localCategories = new Set(
  fs.existsSync(inputDir)
    ? fs.readdirSync(inputDir).filter((file) => file.endsWith('.ndjson')).map((file) => path.basename(file, '.ndjson'))
    : [],
);
const neededCategories = new Set();
const byDay = gardenDays.map((day) => {
  const categories = new Set();
  for (const toolId of day.tools) {
    for (const category of getQuickDrawGrammar(toolId).referenceCategories || []) {
      categories.add(category);
      neededCategories.add(category);
    }
  }
  return {
    day: day.day,
    name: day.name,
    tools: day.tools,
    categories: [...categories].sort(),
    missing: [...categories].filter((category) => !localCategories.has(category)).sort(),
  };
});

const report = {
  inputDir,
  localCount: localCategories.size,
  local: [...localCategories].sort(),
  needed: [...neededCategories].sort(),
  missing: [...neededCategories].filter((category) => !localCategories.has(category)).sort(),
  byDay,
};

console.log(JSON.stringify(report, null, 2));
