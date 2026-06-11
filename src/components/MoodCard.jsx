import React from 'react';

function MoodCard({ mood, entry, selected, onSelect }) {
  const card = entry || mood;

  return (
    <button className={`mood-card scene-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(card.id)}>
      <span className={`scene-card__visual ${card.visual}`} style={{ '--tool-color': entry?.tool?.color }} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="mood-card__label">{card.title}</span>
      <small>{card.childText}</small>
    </button>
  );
}

export default MoodCard;
