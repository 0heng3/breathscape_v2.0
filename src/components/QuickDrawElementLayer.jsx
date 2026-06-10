import React, { useLayoutEffect, useRef, useState } from 'react';
import AnimatedQuickDrawGlyph from './AnimatedQuickDrawGlyph';
import { getQuickDrawInkColor } from '../utils/quickdrawStyle';

function QuickDrawElementLayer({ items = [], sceneState = {} }) {
  const layerRef = useRef(null);
  const [layerSize, setLayerSize] = useState(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;
    const update = () => {
      const rect = layer.getBoundingClientRect();
      setLayerSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(layer);
    return () => observer.disconnect();
  }, []);

  if (!items.length) return null;

  return (
    <div className="quickdraw-element-layer" aria-hidden="true" ref={layerRef}>
      {items.map((item, index) => {
        const tone = item.tone || getQuickDrawInkColor(item.tool, sceneState, item.zone === 'sky' ? 0.12 : 0);
        const sourceWidth = Number(item.stageWidth || item.canvasWidth || 0);
        const sourceHeight = Number(item.stageHeight || item.canvasHeight || 0);
        const scaleX = layerSize && sourceWidth > 0 ? layerSize.width / sourceWidth : 1;
        const scaleY = layerSize && sourceHeight > 0 ? layerSize.height / sourceHeight : 1;
        const positionScale = Math.min(scaleX, scaleY);
        const size = (item.size || 72) * positionScale;
        const width = (item.sizeX || item.size || 72) * positionScale;
        const height = (item.sizeY || item.size || 72) * positionScale;
        const delay = item.live ? 0 : item.appearDelay || index * 36;
        const rotate = Number.isFinite(item.rotation) ? item.rotation : 0;
        const opacity = Number.isFinite(item.opacity) ? item.opacity : 1;
        const rawX = Number.isFinite(item.x) ? item.x : (sourceWidth || 720) / 2;
        const rawY = Number.isFinite(item.y) ? item.y : (sourceHeight || 540) / 2;
        const x = rawX * scaleX;
        const y = rawY * scaleY;
        if (!item.assetPath) return null;

        return (
          <div
            key={item.id || `${item.tool}-${index}`}
            className={`quickdraw-element quickdraw-element--${item.tool} quickdraw-element--${item.zone || 'any'} quickdraw-element--${item.animationType || 'draw'}`}
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
              opacity,
              transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${item.scale || 1})`,
              animationDelay: `${delay}ms`,
              '--element-delay': `${delay}ms`,
              '--element-tone': tone,
              '--element-size': `${size}px`,
              '--element-width': `${width}px`,
              '--element-height': `${height}px`,
            }}
          >
            <AnimatedQuickDrawGlyph
              toolId={item.tool}
              assetPath={item.assetPath}
              variantIndex={item.assetVariantIndex || item.variantIndex || 0}
              size={size}
              width={width}
              height={height}
              tone={tone}
              animated
              delay={delay}
              strokeWidth={item.assetPath ? undefined : item.strokeWidth || 5}
              emphasis={item.zone === 'sky' ? 0.24 : 0.14}
              label={item.asset?.label || item.tool}
            />
          </div>
        );
      })}
    </div>
  );
}

export default QuickDrawElementLayer;
