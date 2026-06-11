import { Sprout } from 'lucide-react';
import React from 'react';
import ElementSvgIcon from '../components/ElementSvgIcon';
import GardenStage from '../components/GardenStage';
import SoftButton from '../components/SoftButton';
import { getTool } from '../data/tools';

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
        <p className="guide-main-copy">
          {entryTool ? `进入画布后会先按「${confirmedTool.label}」回应；也可以在画布下方切换元素或改成自由画。` : '没有选择起点时，进入画布后会根据笔触特征自由判断。'}
        </p>
        <div className="guide-selected-tool" style={{ '--tool-color': entryTool ? confirmedTool.color : '#A88BE8', color: entryTool ? confirmedTool.color : '#A88BE8' }}>
          <span className="guide-tool-entry" aria-hidden="true">
            {entryTool ? <ElementSvgIcon toolId={confirmedToolId} size={52} /> : <Sprout size={52} />}
          </span>
          <div>
            <p className="gift-title">{entryTool ? '当前起点' : '自由画'}</p>
            <strong>{entryTool ? confirmedTool.label : '不选元素'}</strong>
            <small>{entryTool ? confirmedTool.prompt : '可以直接画，系统会在停笔后整理。'}</small>
          </div>
        </div>
        <SoftButton onClick={() => (entryTool ? onChooseTool(confirmedToolId) : onFreeChoose())}>
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
