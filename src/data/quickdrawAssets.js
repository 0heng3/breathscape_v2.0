import { serializeVariantSvg } from '../utils/svgPathTools';
import { getAssetVariants, getToolElement, getToolbarGlyph, toolIds } from './toolElementMap';

const selectedCategories = new Set([
  'bridge',
  'bush',
  'circle',
  'cloud',
  'flower',
  'garden',
  'grass',
  'hurricane',
  'lantern',
  'leaf',
  'light-bulb',
  'line',
  'moon',
  'mushroom',
  'pond',
  'rain',
  'rainbow',
  'river',
  'snail',
  'squiggle',
  'star',
  'sun',
  'tornado',
  'tree',
  'windmill',
]);

const breathscapeAssetTools = new Set([
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
  'snail',
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
]);

export const quickdrawAssets = Object.fromEntries(
  toolIds.map((toolId) => {
    const tool = getToolElement(toolId);
    const breathscapePaths = buildBreathScapeAssetPaths(toolId);
    const selectedPaths = buildSelectedAssetPaths(tool);
    const preferredPaths = breathscapePaths.length ? breathscapePaths : selectedPaths;
    return [
      toolId,
      {
        ...tool,
        toolbarGlyph: withAssetPath(getToolbarGlyph(toolId), preferredPaths[0]),
        assetVariants: buildAssetVariants(getAssetVariants(toolId), preferredPaths),
        publicAssetBase: breathscapePaths.length ? `/breathscape-svg-assets/${toolId}` : `/quickdraw-assets/${toolId}`,
        breathscapeAssetPaths: breathscapePaths,
        selectedAssetPaths: selectedPaths,
        source: breathscapePaths.length
          ? 'breathscape-generated-svg'
          : selectedPaths.length
            ? 'quickdraw-selected-svg'
            : 'missing-quickdraw-selected-svg',
      },
    ];
  }),
);

export function getQuickDrawAsset(toolId) {
  return quickdrawAssets[toolId] || quickdrawAssets.seed;
}

export function getQuickDrawAssetVariant(toolId, variantIndex = 0) {
  const asset = getQuickDrawAsset(toolId);
  const variants = asset.assetVariants || [];
  if (!variants.length) return null;
  return variants[((variantIndex % variants.length) + variants.length) % variants.length];
}

export function getQuickDrawAssetUrl(toolId, variantIndex = 0) {
  return getQuickDrawAssetVariant(toolId, variantIndex)?.assetPath || null;
}

export function serializeQuickDrawAsset(toolId, variantIndex = 0, stroke = '#4f5e74') {
  const variant = getQuickDrawAssetVariant(toolId, variantIndex);
  return variant ? serializeVariantSvg(variant, stroke) : '';
}

function buildSelectedAssetPaths(tool) {
  const categories = tool.categories || [];
  const selected = [];
  categories.slice(0, 3).forEach((category, categoryIndex) => {
    const safe = slug(category);
    if (!selectedCategories.has(safe)) return;
    for (let index = 1; index <= 20; index += 1) {
      const fileIndex = String(index).padStart(3, '0');
      selected.push(`/quickdraw-assets/${safe}/${safe}_${fileIndex}.svg`);
    }
  });
  return [...new Set(selected)].slice(0, 30);
}

function buildBreathScapeAssetPaths(toolId) {
  if (!breathscapeAssetTools.has(toolId)) return [];
  return Array.from({ length: 5 }, (_, index) => {
    const fileIndex = String(index + 1).padStart(3, '0');
    return `/breathscape-svg-assets/${toolId}/${toolId}_${fileIndex}.svg`;
  });
}

function buildAssetVariants(ruleVariants, selectedPaths) {
  if (!selectedPaths.length) return [];
  const fallback = ruleVariants.length ? ruleVariants : [{ viewBox: '0 0 256 256', strokeWidth: 5, paths: [] }];
  return selectedPaths.map((assetPath, index) => withAssetPath(fallback[index % fallback.length], assetPath));
}

function withAssetPath(variant, assetPath) {
  return assetPath ? { ...variant, assetPath } : variant;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
