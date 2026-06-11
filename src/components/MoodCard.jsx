import React from 'react';
import ElementSvgIcon from './ElementSvgIcon';

function MoodCard({ mood, entry, selected, onSelect }) {
  const card = entry || mood;
  const visualClassName = entry?.tool?.id
    ? 'scene-card__visual scene-card__visual--tool'
    : `scene-card__visual ${card.visual || ''}`.trim();

  return (
    <button className={`mood-card scene-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(card.id)}>
      <span className={visualClassName} style={{ '--tool-color': entry?.tool?.color }} aria-hidden="true">
        {entry?.tool?.id ? (
          <ElementSvgIcon toolId={entry.tool.id} size={42} />
        ) : (
          <>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </>
        )}
      </span>
      <span className="mood-card__label">{card.title}</span>
      <small>{card.childText}</small>
    </button>
  );
}

export default MoodCard;
