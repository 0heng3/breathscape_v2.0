import { Save } from 'lucide-react';
import React from 'react';
import GardenStage from '../components/GardenStage';
import SoftButton from '../components/SoftButton';
import { getTool } from '../data/tools';
import { uniqueItems } from '../utils/storyGenerator';

function DiaryCardPage({ mood, gardenDay, sceneState, elementHistory, story, title, onTitleChange, onSave }) {
  return (
    <section className="screen diary-card-page page-enter">
      <GardenStage mood={mood} gardenDay={gardenDay} sceneState={sceneState} elementHistory={elementHistory} calm diary />
      <article className="today-card diary-art-card">
        <div className="lamp-dialogue">
          <span className="mini-lamp" aria-hidden="true" />
          <div>
            <p className="eyebrow">今日花园卡</p>
            <p className="diary-date">{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date())}</p>
          </div>
        </div>
        <input value={title} onChange={(event) => onTitleChange(event.target.value)} aria-label="作品命名" />
        <p>{story}</p>
        <div className="chips" aria-label="今天留下的元素">
          {uniqueItems(elementHistory.map((item) => item.tool)).map((toolId) => (
            <span key={toolId}>{getTool(toolId).name}</span>
          ))}
          {elementHistory.length === 0 && <span>安静花园</span>}
        </div>
        <SoftButton onClick={onSave}>
          <Save size={20} />
          保存日记
        </SoftButton>
      </article>
    </section>
  );
}

export default DiaryCardPage;
