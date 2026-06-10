import { getQuickDrawGrammar } from '../data/quickdrawElementGrammar';
import { getToolElement } from '../data/toolElementMap';
import { matchQuickDrawCategories } from './quickdrawTemplateMatcher';

const lowConfidenceThreshold = 0.18;

export function recognizeSketchTool(stroke, candidateToolIds = [], options = {}) {
  const candidates = normalizeCandidates(candidateToolIds, options.fallbackToolId);
  const categories = getCandidateCategories(candidates);
  const categoryMatches = matchQuickDrawCategories(stroke, categories);
  if (!categoryMatches.length) {
    return fallbackRecognition(options.fallbackToolId || candidates[0] || stroke.tool || 'seed', 'no-template');
  }

  const toolMatches = candidates
    .map((toolId, candidateIndex) => {
      const grammar = getQuickDrawGrammar(toolId);
      const ranked = (grammar.referenceCategories || [])
        .map((category, categoryIndex) => {
          const match = categoryMatches.find((item) => item.category === category);
          if (!match) return null;
          return {
            ...match,
            categoryIndex,
            adjustedScore: match.score + categoryIndex * 0.035 + candidateIndex * 0.006,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.adjustedScore - b.adjustedScore);
      if (!ranked.length) return null;
      const best = ranked[0];
      return {
        toolId,
        label: getToolElement(toolId).label,
        category: best.category,
        score: best.adjustedScore,
        rawScore: best.score,
        confidence: Math.max(0, best.confidence - best.categoryIndex * 0.04),
        templateKeyId: best.templateKeyId,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);

  if (!toolMatches.length) {
    return fallbackRecognition(options.fallbackToolId || candidates[0] || stroke.tool || 'seed', 'no-candidate-match');
  }

  const best = toolMatches[0];
  const second = toolMatches[1] || null;
  const confidenceGap = second ? Math.max(0, second.score - best.score) : 0.2;
  const confidence = clamp(best.confidence + confidenceGap * 0.18, 0, 1);
  const lowConfidence = confidence < lowConfidenceThreshold;

  return {
    toolId: best.toolId,
    label: best.label,
    category: best.category,
    confidence,
    lowConfidence,
    reason: lowConfidence ? 'low-confidence-template-match' : 'template-match',
    alternatives: toolMatches.slice(0, 3),
    categoryMatches: categoryMatches.slice(0, 5),
  };
}

function normalizeCandidates(candidateToolIds, fallbackToolId) {
  const list = Array.isArray(candidateToolIds) ? candidateToolIds.filter(Boolean) : [];
  const withFallback = fallbackToolId && !list.includes(fallbackToolId) ? [...list, fallbackToolId] : list;
  return [...new Set(withFallback.length ? withFallback : ['seed', 'grass', 'firstFlower', 'cloud', 'rainDrop', 'star'])];
}

function getCandidateCategories(candidateToolIds) {
  return [
    ...new Set(candidateToolIds.flatMap((toolId) => getQuickDrawGrammar(toolId).referenceCategories || [])),
  ];
}

function fallbackRecognition(toolId, reason) {
  const tool = getToolElement(toolId);
  return {
    toolId,
    label: tool.label,
    category: getQuickDrawGrammar(toolId).referenceCategories?.[0] || 'line',
    confidence: 0,
    lowConfidence: true,
    reason,
    alternatives: [],
    categoryMatches: [],
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
