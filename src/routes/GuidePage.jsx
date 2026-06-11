import { Sprout } from 'lucide-react';
import React from 'react';
import GardenStage from '../components/GardenStage';
import SoftButton from '../components/SoftButton';
import { getTool } from '../data/tools';
import ElementSvgIcon from '../components/ElementSvgIcon';

function GuidePage({ mood, gardenDay, sceneState, entryTool, onChooseTool, onFreeChoose }) {
  const tools = entryTool
    ? [entryTool, ...gardenDay.tools.filter((toolId) => toolId !== entryTool)].slice(0, 3)
    : gardenDay.tools.slice(0, 3);

  return (
    <section className="screen guide-page page-enter">
      <GardenStage mood={mood} gardenDay={gardenDay} sceneState={sceneState} quiet />
      <article className="guide-card">
        <div className="lamp-dialogue">
          <span className="mini-lamp" aria-hidden="true" />
          <div>
            <p className="eyebrow">准备画画</p>
            <h2>{gardenDay.name}</h2>
          </div>
        </div>
        <div className="guide-scene-token">
          <span className={`scene-card__visual ${mood.visual}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
          <div>
            <p className="guide-scene-token__label">今天的入口</p>
            <strong>{mood.title}</strong>
          </div>
        </div>
        <p className="guide-main-copy">可以先选一个元素，也可以直接自由画。停笔后，花园会把多笔线条一起整理。</p>
        <p className="gift-title">推荐试试</p>
        <div className="recommended-tools">
          {tools.map((toolId) => {
            const tool = getTool(toolId);
            return (
              <button key={toolId} onClick={() => onChooseTool(toolId)} style={{ '--tool-color': tool.color, color: tool.color }}>
                <span className="guide-tool-entry" aria-hidden="true">
                  <ElementSvgIcon toolId={toolId} size={28} />
                </span>
                {tool.label}
              </button>
            );
          })}
        </div>
        <SoftButton variant="secondary" onClick={onFreeChoose}>
          <Sprout size={22} />
          直接进入花园
        </SoftButton>
      </article>
    </section>
  );
}

export default GuidePage;
