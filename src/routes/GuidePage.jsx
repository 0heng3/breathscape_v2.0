import { Sprout } from 'lucide-react';
import React from 'react';
import GardenStage from '../components/GardenStage';
import SoftButton from '../components/SoftButton';
import { getTool } from '../data/tools';

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
            <p className="eyebrow">今天的角落</p>
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
            <p className="guide-scene-token__label">今日小场景</p>
            <strong>{mood.title}</strong>
          </div>
        </div>
        <p>{gardenDay.subtitle}</p>
        {(mood.guideText || []).slice(0, 2).map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className="gift-title">可以先试试</p>
        <div className="recommended-tools">
          {tools.map((toolId) => {
            const tool = getTool(toolId);
            return (
              <button key={toolId} onClick={() => onChooseTool(toolId)} style={{ '--tool-color': tool.color, color: tool.color }}>
                <span className="guide-tool-entry" aria-hidden="true">
                  <span className={`tool-button__glyph-art tool-entry tool-entry-${toolId}`}>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                </span>
                {tool.label}
              </button>
            );
          })}
        </div>
        <SoftButton variant="secondary" onClick={onFreeChoose}>
          <Sprout size={22} />
          进入花园
        </SoftButton>
      </article>
    </section>
  );
}

export default GuidePage;
