import { RefreshCw, Sprout } from 'lucide-react';
import React from 'react';
import DiaryEntryCard from '../components/DiaryEntryCard';
import SoftButton from '../components/SoftButton';
import { weeklyReview } from '../utils/storyGenerator';

function DiaryPage({ diaries, onNewGarden, onOpenDiary }) {
  return (
    <section className="screen diary-page page-enter">
      <div className="section-heading">
        <p className="eyebrow">作品回看</p>
        <h2>我的花园日记</h2>
      </div>
      <div className="diary-layout">
        <aside className="week-map">
          <p className="eyebrow">本周小地图</p>
          <MiniWeek diaries={diaries} />
          <p>{weeklyReview(diaries)}</p>
        </aside>
        <div className="diary-list">
          {diaries.length === 0 ? (
            <div className="empty-state">
              <Sprout size={34} />
              <p>还没有保存的花园。可以先完成一次今日花园。</p>
            </div>
          ) : (
            diaries.map((entry) => <DiaryEntryCard entry={entry} onOpen={() => onOpenDiary?.(entry)} key={entry.id} />)
          )}
        </div>
      </div>
      <SoftButton variant="secondary" onClick={onNewGarden}>
        <RefreshCw size={20} />
        开始新的今日花园
      </SoftButton>
    </section>
  );
}

function MiniWeek({ diaries }) {
  const lastSeven = diaries.slice(0, 7);
  return (
    <div className="mini-week">
      {Array.from({ length: 7 }).map((_, index) => {
        const entry = lastSeven[index];
        const total = entry ? Object.values(entry.elements || {}).reduce((sum, count) => sum + count, 0) : 0;
        return (
          <span className={entry ? 'filled' : ''} style={{ '--level': Math.min(1, total / 8) }} key={index}>
            {entry ? index + 1 : ''}
          </span>
        );
      })}
    </div>
  );
}

export default DiaryPage;
