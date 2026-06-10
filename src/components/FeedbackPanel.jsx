import { Check, Lightbulb } from 'lucide-react';
import React from 'react';
import SoftButton from './SoftButton';
import { getToolElement } from '../data/toolElementMap';
import { getSceneClues } from '../utils/sceneState';

function FeedbackPanel({ feedback, sceneState, activeTool, toolTip, canFinish, onFinish, onSuggest }) {
  const tool = getToolElement(activeTool.id);
  const clues = getSceneClues(sceneState);
  const sceneLine = getToolSceneLine(activeTool.id);

  return (
    <aside className="feedback-panel">
      <div className="feedback-panel__current">
        <span>最近识别</span>
        <strong>{tool.label || activeTool.label}</strong>
      </div>
      <p className="feedback-panel__text">可以直接自由画，系统会在今天的元素里识别，再整理成 QuickDraw 风格。</p>
      <p className="feedback-panel__tool-tip">{feedback || toolTip || tool.feedbackText}</p>
      <p className="feedback-panel__scene-line">{sceneLine}</p>
      <div className="scene-clues" aria-label="当前场景状态">
        <span className="scene-clue-block__title">当前场景状态</span>
        {clues.slice(0, 4).map((clue) => (
          <span key={clue}>{clue}</span>
        ))}
      </div>
      <p className="feedback-panel__next">下一步可以继续自由画，系统会继续识别并整理成当天花园里的元素。</p>
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

function getToolSceneLine(toolId) {
  const lines = {
    seed: '土地里会多出种子点，角落会亮一点。',
    memorySeed: '记忆小点会留在温室里，和一周的小物件连起来。',
    grass: '地面会长出一小片绿色，风来时会轻轻摆动。',
    sunlight: '花园会变亮，雾层会变薄。',
    sun: '花园会变亮，雾层会变薄。',
    dew: '雨水会从天空落下，土地会喝到水。',
    soilLine: '地面会多出柔和的土壤纹理。',
    flower: '花会打开一点，花园多一处颜色。',
    firstFlower: '花会打开一点，花园多一处颜色。',
    bud: '花苞会轻轻打开一点。',
    quietFlower: '夜色里的花会柔和地亮起来。',
    cloud: '云会回到天空，慢慢移动。',
    windLine: '风线会带动草、云和彩带。',
    softWind: '轻风会让花园慢慢动起来。',
    windBell: '风铃线会轻轻晃动。',
    ribbon: '彩带会在空中轻轻飘。',
    rainDrop: '雨会让土地变湿，水面有波纹。',
    rain: '雨会让土地变湿，水面有波纹。',
    waterLine: '水面会流动，溪线会更清楚。',
    ripple: '水面会轻轻散开。',
    puddle: '地面会出现一点反光。',
    star: '星空会更亮，星星会轻轻闪。',
    firefly: '萤火会在夜色里轻轻闪。',
    moon: '夜色会更安静。',
    moonbeam: '月光会让雾变轻一点。',
    lantern: '局部暖光会扩大一点。',
    breathLight: '慢光会让小角落暖起来。',
    windowLight: '远处会亮一点。',
    mushroom: '蘑菇会从地面冒出来。',
    bridge: '小桥和路径会更连贯。',
    stone: '石径会更清楚。',
    moss: '石头旁会更柔软。',
    smallTree: '边角会更稳定。',
    signpost: '小路方向会更清楚。',
    shadow: '角落会更安静。',
    rainbow: '天色会更柔和。',
    constellationLine: '星光会连起来。',
    leafBoat: '叶船会沿着水走。',
    floatingLeaf: '叶子会被风带着走。',
    snailTrail: '蜗牛线会慢慢爬。',
    sprout: '土里会冒出一点新意。',
    reed: '岸边会长高一点。',
  };
  return lines[toolId] || '场景会接住这一笔，并把它整理成识别到的元素。';
}

export default FeedbackPanel;
