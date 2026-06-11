import { BookOpen, Play } from 'lucide-react';
import React from 'react';
import GardenStage from '../components/GardenStage';
import SoftButton from '../components/SoftButton';
import { gardenDays } from '../data/gardenDays';
import { createInitialSceneState } from '../utils/sceneState';

function StartPage({ mood, selectedDay = 1, onSelectDay, onStart, onOpenDiary }) {
  const gardenDay = gardenDays[selectedDay - 1] || gardenDays[0];

  return (
    <section className="screen start-page page-enter">
      <GardenStage mood={mood} gardenDay={gardenDay} sceneState={createInitialSceneState('color_path', selectedDay)} quiet />

      <div className="hero-copy story-cover">
        <p className="pill-label">息境 BreathScape</p>
        <h2>今天的小花园醒来了</h2>
        <p>选一天，画几笔，让线条变成花园里的小变化。</p>

        <div className="garden-day-selector" aria-label="选择七日花园">
          <div className="garden-day-selector__label">
            <span>今日花园</span>
            <strong>{gardenDay.name}</strong>
          </div>
          <div className="garden-day-selector__buttons">
            {gardenDays.map((day) => (
              <button
                type="button"
                className={`day-chip day-chip-${day.day} ${selectedDay === day.day ? 'active' : ''}`}
                onClick={() => onSelectDay?.(day.day)}
                aria-label={`第 ${day.day} 天，${day.name}`}
                title={day.name}
                key={day.day}
              >
                <span className="day-chip__number">{day.day}</span>
                <span className="day-chip__icon" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <small>{day.name}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="hero-actions">
          <SoftButton onClick={onStart}>
            <Play size={26} />
            开始绘画
          </SoftButton>
          <SoftButton variant="quiet" onClick={onOpenDiary}>
            <BookOpen size={22} />
            我的日记
          </SoftButton>
        </div>
      </div>
    </section>
  );
}

export default StartPage;
