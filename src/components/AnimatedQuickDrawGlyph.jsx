import React, { useEffect, useState } from 'react';
import { getToolElement } from '../data/toolElementMap';

const svgPathCache = new Map();
const defaultSvgAsset = { paths: [], viewBox: '0 0 256 256' };

function AnimatedQuickDrawGlyph({
  toolId,
  assetPath,
  variantIndex = 0,
  size = 72,
  width,
  height,
  tone = 'currentColor',
  color,
  className = '',
  animated = true,
  delay = 0,
  strokeWidth,
  emphasis = 0,
  label,
  style,
}) {
  const asset = getToolElement(toolId);
  const variants = asset.assetVariants || [];
  const variant = variants[((variantIndex % variants.length) + variants.length) % variants.length] || asset.toolbarGlyph || variants[0];
  const resolvedAssetPath = assetPath;
  const externalAsset = useSvgAsset(resolvedAssetPath);
  const paths = resolvedAssetPath ? externalAsset.paths : normalizeVariantPaths(variant?.paths);
  if (!paths.length) return null;

  return (
    <svg
      className={`animated-quickdraw-glyph ${className}`.trim()}
      viewBox={resolvedAssetPath ? externalAsset.viewBox : variant?.viewBox || '0 0 256 256'}
      width={width || size}
      height={height || size}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        display: 'block',
        overflow: 'visible',
        color: color || tone,
        '--qd-delay': `${delay}ms`,
        '--qd-emphasis': emphasis,
        ...(style || {}),
      }}
    >
      {paths.map((path, index) => (
        <path
          key={`${variant.name || toolId}-${index}`}
          d={path.d}
          pathLength="100"
          fill="none"
          stroke={path.stroke || 'currentColor'}
          strokeWidth={resolvedAssetPath ? path.strokeWidth || 8 : strokeWidth || variant?.strokeWidth || 5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={animated ? { animationDelay: `${delay + index * 34}ms` } : undefined}
          className={animated ? 'animated-quickdraw-glyph__path' : ''}
        />
      ))}
    </svg>
  );
}

function useSvgAsset(assetPath) {
  const [asset, setAsset] = useState(() => (assetPath ? svgPathCache.get(assetPath) || defaultSvgAsset : defaultSvgAsset));

  useEffect(() => {
    if (!assetPath || svgPathCache.has(assetPath)) {
      if (assetPath) setAsset(svgPathCache.get(assetPath));
      return;
    }

    let cancelled = false;
    setAsset(defaultSvgAsset);
    fetch(assetPath)
      .then((response) => (response.ok ? response.text() : ''))
      .then((svg) => {
        if (!svg || cancelled) return;
        const parsed = parseQuickDrawSvg(svg);
        if (parsed.paths.length) {
          svgPathCache.set(assetPath, parsed);
          setAsset(parsed);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [assetPath]);

  return asset;
}

function normalizeVariantPaths(paths = []) {
  return paths
    .map((path) => (typeof path === 'string' ? { d: path } : path))
    .filter((path) => path?.d);
}

function parseQuickDrawSvg(svg) {
  const viewBox = svg.match(/\bviewBox="([^"]+)"/)?.[1] || '0 0 256 256';
  const paths = Array.from(svg.matchAll(/<path\b([^>]*)>/g))
    .map((match) => {
      const attributes = match[1] || '';
      const d = attributes.match(/\bd="([^"]+)"/)?.[1];
      if (!d) return null;
      const strokeWidth = Number(attributes.match(/\bstroke-width="([^"]+)"/)?.[1]);
      const stroke = attributes.match(/\bstroke="([^"]+)"/)?.[1];
      return {
        d,
        strokeWidth: Number.isFinite(strokeWidth) ? strokeWidth : 8,
        stroke,
      };
    })
    .filter(Boolean);
  return { paths, viewBox };
}

export default AnimatedQuickDrawGlyph;
