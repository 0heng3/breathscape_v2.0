import { Check, Lightbulb } from 'lucide-react';
import React from 'react';
import SoftButton from './SoftButton';
import { getToolElement } from '../data/toolElementMap';
import { getSceneClues } from '../utils/sceneState';

function FeedbackPanel({ feedback, sceneState, activeTool, selectedToolId, toolTip, recognitionProcess, canFinish, onFinish, onSuggest }) {
  const freeDrawing = !selectedToolId;
  const tool = freeDrawing ? null : getToolElement(activeTool.id);
  const clues = getSceneClues(sceneState, { onlyAfterDrawing: true });
  const sceneLine = freeDrawing ? '按笔触方向回应。' : getToolSceneLine(activeTool.id);
  const label = freeDrawing ? '自由画' : (tool.label || activeTool.label);

  return (
    <aside className="feedback-panel">
      <div className="lamp-dialogue compact feedback-panel__lamp" style={{ '--companion-light': sceneState.companionLight || 0 }}>
        <span className="lamp-face" aria-hidden="true">
          <span />
        </span>
        <div>
          <p className="eyebrow">小灯在回应</p>
          <p className="feedback-panel__tool-tip">{feedback || toolTip || tool?.feedbackText}</p>
        </div>
      </div>
      <p className="active-tool-label">正在带来：{label}</p>
      <div className="scene-clues" aria-label="当前场景状态">
        {[sceneLine, ...clues].filter(Boolean).slice(0, 2).map((clue) => (
          <span key={clue}>{clue}</span>
        ))}
      </div>
      <RecognitionProcessCard process={recognitionProcess} />
      <SoftButton variant="secondary" onClick={onSuggest}>
        <Lightbulb size={20} />
        给小灯一点光
      </SoftButton>
      <SoftButton variant="secondary" onClick={onFinish} disabled={!canFinish}>
        <Check size={20} />
        进入安放模式
      </SoftButton>
    </aside>
  );
}

function RecognitionProcessCard({ process = {} }) {
  const topK = (process.topK || []).slice(0, 3);
  const statusText = {
    idle: '等待绘画',
    drawing: '正在记录笔触',
    collecting: '组合多笔画',
    classifying: '64x64 识别中',
    resolved: '已生成反馈',
  }[process.phase || 'idle'] || '等待绘画';
  const modelText = process.modelStatus === 'ready'
    ? `CNN 已加载 ${process.imageSize || 64}x${process.imageSize || 64}`
    : process.modelStatus === 'loading'
      ? 'CNN 加载中'
      : '规则兜底可用';
  const accuracyText = process.accuracy ? `验证 ${(process.accuracy * 100).toFixed(1)}%` : null;

  return (
    <div className="recognition-process" aria-label="模型判断过程">
      <div className="recognition-process__head">
        <span>模型判断</span>
        <strong>{statusText}</strong>
      </div>
      <div className="recognition-process__visual">
        {process.rasterPreviewUrl ? (
          <img src={process.rasterPreviewUrl} alt="64x64 灰度栅格预览" />
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
      <div className="recognition-process__steps">
        <span className={process.strokeCount ? 'active' : ''}>drawing {process.strokeCount || 0} 笔</span>
        <span className={['classifying', 'resolved'].includes(process.phase) ? 'active' : ''}>raster 64x64</span>
        <span className={process.reason ? 'active' : ''}>{formatReason(process.reason)}</span>
      </div>
      <p>{modelText}{accuracyText ? ` · ${accuracyText}` : ''}</p>
      {process.selectedToolLabel ? (
        <p>当前选择：{process.selectedToolLabel}。停笔后统一整理。</p>
      ) : (
        <p>未选元素时：CNN top-k → 当天工具限制 → 笔触兜底。</p>
      )}
      {topK.length > 0 && (
        <div className="recognition-process__topk">
          {topK.map((item) => (
            <span key={`${item.category || item.toolId}-${item.confidence}`}>
              {item.category || item.toolId}: {Math.round((item.confidence || 0) * 100)}%
            </span>
          ))}
        </div>
      )}
      {process.allowedLabels?.length > 0 && (
        <p>当天允许：{process.allowedLabels.slice(0, 5).join('、')}{process.allowedLabels.length > 5 ? '...' : ''}</p>
      )}
      {process.finalToolLabel && <p>结果：{process.finalToolLabel}{process.crowded ? '，已柔化整理。' : '。'}</p>}
    </div>
  );
}

function formatReason(reason) {
  return {
    'selected-intent': 'choice',
    'quickdraw-cnn': 'cnn',
    'quickdraw-model': 'template',
    'stroke-rule': 'rules',
  }[reason] || 'waiting';
}

function getToolSceneLine(toolId) {
  const lines = {
    seed: '土地里会多出种子点。',
    memorySeed: '记忆小点会留在温室里。',
    grass: '地面会长出一小片绿色。',
    sunlight: '花园会变亮，雾会变薄。',
    sun: '花园会变亮，雾会变薄。',
    dew: '雨水会让土地更湿润。',
    rain: '雨会让土壤和水面变化。',
    rainDrop: '雨会让土壤和水面变化。',
    soilLine: '地面会多出柔和纹理。',
    flower: '花会轻轻打开一点。',
    firstFlower: '花会轻轻打开一点。',
    bud: '花苞会轻轻打开一点。',
    quietFlower: '夜色里的花会亮一点。',
    cloud: '云会回到天空，慢慢移动。',
    windLine: '风线会带动草和云。',
    softWind: '轻风会让花园慢慢动起来。',
    waterLine: '水面会多一道流动线。',
    ripple: '水面会轻轻散开。',
    star: '星空会多一点闪光。',
    firefly: '夜色里会多一点萤火。',
    moon: '夜色会更安静。',
    moonbeam: '月光会让雾变轻。',
    lantern: '局部暖光会扩大一点。',
    breathLight: '小角落会暖一点。',
    mushroom: '地面会冒出一朵蘑菇。',
    bridge: '小桥和路径会更连贯。',
    stone: '石径会更清楚。',
    rainbow: '天空会更柔和。',
    constellationLine: '星光会被轻轻连起来。',
    leafBoat: '叶船会沿着水走。',
    floatingLeaf: '叶子会被风带着走。',
    snail: '蜗牛会慢慢爬出来。',
    snailTrail: '蜗牛会慢慢爬出来。',
  };
  return lines[toolId] || '场景会接住这一笔，并整理成识别到的元素。';
}

export default FeedbackPanel;
