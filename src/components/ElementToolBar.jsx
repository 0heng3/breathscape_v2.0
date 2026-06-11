import React, { useState } from 'react';
import { getToolElement, toolIds } from '../data/toolElementMap';

function ElementToolBar({ activeToolId, onSelectTool, toolOrder = toolIds }) {
  const [expanded, setExpanded] = useState(false);
  const visibleToolIds = getVisibleToolIds(toolOrder, activeToolId, expanded);
  const hiddenCount = Math.max(0, toolOrder.length - visibleToolIds.length);

  return (
    <aside className="element-toolbar" aria-label="元素工具栏">
      <button
        className={`tool-button element-tool-button element-tool-button--free ${activeToolId ? '' : 'active'}`}
        onClick={() => onSelectTool(null)}
        style={{ '--tool-color': '#8f7ca7', color: '#8f7ca7' }}
        title="不选择固定元素，按笔触方向轻轻回应。"
        type="button"
      >
        <span className="element-tool-button__glyph" aria-hidden="true">
          <span className="free-draw-mark">
            <span />
            <span />
            <span />
          </span>
        </span>
        <span className="element-tool-button__label">自由画</span>
      </button>
      {visibleToolIds.map((toolId, index) => {
        const tool = getToolElement(toolId);
        const active = activeToolId === toolId;

        return (
          <button
            key={toolId}
            className={`tool-button element-tool-button ${active ? 'active' : ''}`}
            onClick={() => onSelectTool(toolId)}
            style={{ '--tool-color': tool.color || 'var(--ink)', color: tool.color || 'var(--ink)' }}
            title={tool.feedbackText}
            type="button"
          >
            <span className="element-tool-button__glyph" aria-hidden="true">
              <span className={`tool-button__glyph-art tool-entry tool-entry-${toolId}`}>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            </span>
            <span className="element-tool-button__label">{tool.label}</span>
          </button>
        );
      })}
      {toolOrder.length > 6 && (
        <button
          className={`element-tool-button element-tool-button--more ${expanded ? 'active' : ''}`}
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <span className="element-tool-button__more-mark" aria-hidden="true">...</span>
          <span className="element-tool-button__label">{expanded ? '收起' : `更多${hiddenCount ? ` ${hiddenCount}` : ''}`}</span>
        </button>
      )}
    </aside>
  );
}

function getVisibleToolIds(toolOrder, activeToolId, expanded) {
  if (expanded || toolOrder.length <= 6) return toolOrder;
  const first = toolOrder.slice(0, 6);
  if (first.includes(activeToolId)) return first;
  return [...first.slice(0, 5), activeToolId];
}

export default ElementToolBar;
