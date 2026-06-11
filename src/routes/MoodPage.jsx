import { Sparkles } from 'lucide-react';
import React from 'react';
import GardenStage from '../components/GardenStage';
import MoodCard from '../components/MoodCard';
import SoftButton from '../components/SoftButton';
import { getMood, moods } from '../data/moods';
import { getTool } from '../data/tools';
import { createInitialSceneState } from '../utils/sceneState';

function MoodPage({ selectedMood, selectedToolId, gardenDay, onSelectMood, onContinue }) {
  const gardenMood = getMood(selectedMood);
  const sceneEntries = createSceneEntries(gardenDay);

  return (
    <section className="screen mood-page page-enter">
      <GardenStage mood={gardenMood} gardenDay={gardenDay} sceneState={createInitialSceneState(selectedMood, gardenDay.day)} quiet />
      <div className="mood-overlay">
        <div className="section-heading">
          <p className="eyebrow">{gardenDay.name}</p>
          <h2>今天先放哪个元素？</h2>
          <p>选一个作为起点。进入画布后，也可以切换或自由画。</p>
        </div>
        <div className="mood-grid" aria-label="今日元素入口">
          {sceneEntries.map((entry) => (
            <MoodCard
              entry={entry}
              selected={selectedToolId === entry.tool.id}
              onSelect={() => onSelectMood(entry.mood.id, entry.tool.id)}
              key={`${entry.mood.id}-${entry.tool.id}`}
            />
          ))}
        </div>
        <div className="page-bottom-row">
          <p>{selectedToolId ? '已选好起点，可以进入花园。' : '选一个元素，或返回重新选择日期。'}</p>
          <SoftButton onClick={onContinue} disabled={!selectedMood}>
            <Sparkles size={22} />
            进入准备页
          </SoftButton>
        </div>
      </div>
    </section>
  );
}

function createSceneEntries(gardenDay) {
  const usedMoods = new Set();
  return gardenDay.tools.map((toolId, index) => {
    const mood = findMoodForTool(gardenDay, toolId, usedMoods) || moods[index % moods.length];
    usedMoods.add(mood.id);
    const tool = getTool(toolId);
    return {
      mood,
      tool,
      title: tool.label,
      childText: createToolEntryText(tool, gardenDay.name),
      visual: `tool-entry tool-entry-${tool.id}`,
    };
  });
}

function findMoodForTool(gardenDay, toolId, usedMoods) {
  const exact = moods.find((mood) => !usedMoods.has(mood.id) && gardenDay.recommendedByMood?.[mood.id]?.[0] === toolId);
  if (exact) return exact;
  return moods.find((mood) => !usedMoods.has(mood.id) && (gardenDay.recommendedByMood?.[mood.id] || []).includes(toolId));
}

function createToolEntryText(tool, dayName) {
  const text = {
    seed: '放下一颗小种子。',
    grass: '长出一点绿色。',
    sunlight: '添一束晨光。',
    dew: '落下一点雨水。',
    soilLine: '留下柔和土纹。',
    firstFlower: '打开一朵小花。',
    waterLine: '让小溪流动。',
    ripple: '让水面散开。',
    leafBoat: '放一只叶船。',
    bridge: '接上一段小桥。',
    rainDrop: '落下一点雨。',
    reed: '长出岸边芦苇。',
    windLine: '让风经过草坡。',
    windBell: '挂起轻响风铃。',
    ribbon: '让彩带飘起来。',
    cloud: '让云慢慢经过。',
    floatingLeaf: '让叶片顺风走。',
    stone: '接上小石径。',
    moss: '让石边变柔和。',
    breathLight: '点一点慢光。',
    smallTree: '立起一棵小树。',
    shadow: '留下一片柔影。',
    signpost: '给小路一个方向。',
    mushroom: '让蘑菇冒出来。',
    sprout: '让嫩芽长高一点。',
    puddle: '让水洼亮一下。',
    snailTrail: '留下银色小路。',
    bud: '让花苞出现。',
    lantern: '挂起一盏暖灯。',
    firefly: '让萤火飞起来。',
    moon: '让月亮升起。',
    windowLight: '点亮远处窗光。',
    quietFlower: '打开夜里的花。',
    softWind: '让灯光轻轻摆。',
    star: '点亮一颗星。',
    memorySeed: '点亮一周小物件。',
    constellationLine: '把星光连起来。',
    moonbeam: '让月光照进来。',
    rainbow: '收起一层淡彩。',
  }[tool.id];
  return text || `放进${dayName}。`;
}

export default MoodPage;
