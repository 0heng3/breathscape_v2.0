import { Sprout } from 'lucide-react';
import React from 'react';
import GardenStage from '../components/GardenStage';
import SoftButton from '../components/SoftButton';
import { getTool } from '../data/tools';
import ElementSvgIcon from '../components/ElementSvgIcon';

function GuidePage({ mood, gardenDay, sceneState, entryTool, onChooseTool, onFreeChoose }) {
  const confirmedToolId = entryTool || gardenDay.tools[0];
  const confirmedTool = getTool(confirmedToolId);

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
        <p className="guide-main-copy">刚才选择的是「{confirmedTool.label}」。进入画布后会先按这个元素回应；你也可以在画布下方切换元素或改成自由画。</p>
        <div className="guide-selected-tool" style={{ '--tool-color': confirmedTool.color, color: confirmedTool.color }}>
          <span className="guide-tool-entry" aria-hidden="true">
            <ElementSvgIcon toolId={confirmedToolId} size={52} />
          </span>
          <div>
            <p className="gift-title">当前起点</p>
            <strong>{confirmedTool.label}</strong>
            <small>{confirmedTool.prompt}</small>
          </div>
        </div>
        <SoftButton onClick={() => onChooseTool(confirmedToolId)}>
          <Sprout size={22} />
          进入画布
        </SoftButton>
        <SoftButton variant="secondary" onClick={onFreeChoose}>
          <Sprout size={22} />
          不选元素，自由画
        </SoftButton>
      </article>
    </section>
  );
}

export default GuidePage;
