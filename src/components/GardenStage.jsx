import React from 'react';
import { initialSceneState } from '../utils/sceneState';

function GardenStage({
  mood,
  gardenDay,
  sceneState = initialSceneState,
  elementHistory = [],
  liveResponses = [],
  strokes = [],
  quiet = false,
  calm = false,
  diary = false,
  children,
}) {
  const pathLevel = sceneState.pathCompletion || 0;
  const memoryLevel = sceneState.memoryConnection || 0;
  const nightSparkle = sceneState.nightSparkle || 0;
  const windVisual = getWindVisual(sceneState);

  return (
    <div
      className={`garden-stage layout-${gardenDay?.layout || 'courtyard'} mood-${mood.tone} lamp-${getLampState(sceneState, quiet, calm)} gesture-${sceneState.gestureAction || 'still_stand'} ${quiet ? 'quiet' : ''} ${calm ? 'calm' : ''} ${diary ? 'diary' : ''}`}
      style={{
        '--wind-level': sceneState.windEnergy,
        '--rain-level': sceneState.rainDensity,
        '--soil-level': sceneState.soilWetness,
        '--soil-texture-level': sceneState.soilTexture || 0,
        '--water-ripple-level': sceneState.waterRipple || 0,
        '--grass-level': sceneState.grassCoverage,
        '--flower-level': sceneState.flowerBloom,
        '--sun-level': sceneState.sunlightWarmth,
        '--fog-level': sceneState.fogOpacity || 0,
        '--bright': sceneState.brightness,
        '--sat': sceneState.saturation,
        '--calm-level': sceneState.calmLevel,
        '--clutter-level': sceneState.visualClutter,
        '--anim-speed': sceneState.animationSpeed || 1,
        '--gesture-wind': sceneState.gestureWind || 0,
        '--gesture-wind-abs': Math.abs(sceneState.gestureWind || 0),
        '--gesture-glow': sceneState.gestureGlow || 0,
        '--gesture-hold': sceneState.gestureHold || 0,
        '--gesture-pulse': sceneState.gesturePulse || 0,
        '--gesture-lift': sceneState.gestureAction === 'raise_soft' ? (sceneState.gestureGlow || 0) : 0,
        '--gesture-light': sceneState.gestureAction === 'cup_light' ? (sceneState.gestureGlow || 0) : (sceneState.gestureGlow || 0) * 0.45,
        '--path-level': pathLevel,
        '--memory-level': memoryLevel,
        '--night-sparkle': nightSparkle,
        '--companion-light': sceneState.companionLight || 0,
        '--drawn-wind-dir': windVisual.direction,
        '--plant-wind-angle': windVisual.angle,
        '--plant-wind-angle-mid': windVisual.midAngle,
        '--plant-wind-angle-low': windVisual.lowAngle,
        '--plant-wind-angle-soft': windVisual.softAngle,
        '--plant-wind-angle-soft-low': windVisual.softLowAngle,
        '--plant-wind-angle-recover': windVisual.recoveryAngle,
        '--plant-sway-duration': windVisual.duration,
        '--plant-sway-duration-soft': windVisual.softDuration,
        '--plant-sway-strength': windVisual.strength,
      }}
    >
      <div className="paper-grain" />
      <div className="sky-wash" />
      <div className="distant-hills">
        <span />
        <span />
        <span />
      </div>
      <div className="moving-clouds">
        <span />
        <span />
        <span />
      </div>
      <div className="garden-map">
        <span className="garden-path" />
        <span className="river-ribbon" />
        <span className="soil-mound" />
        <span className="garden-lamp" />
      </div>
      {gardenDay?.layout === 'greenhouse' && (
        <div className="day-memory-row">
          {Array.from({ length: 6 }).map((_, index) => <span key={index} />)}
        </div>
      )}
      <div className="soil-wetness" />
      <span className="gesture-wind-ribbon" />
      <div className="breathscape-element-layer" aria-hidden="true">
        {[...elementHistory, ...liveResponses].map((item, index) => (
          <ResponseCluster item={item} index={index} live={Boolean(item.live)} key={item.id || `${item.tool}-${index}`} />
        ))}
      </div>
      <span className="lamp-aura" aria-hidden="true" />
      {children}
    </div>
  );
}

function getWindVisual(sceneState) {
  const direction = Number.isFinite(sceneState.windDirectionX) && Math.abs(sceneState.windDirectionX) >= 0.12
    ? sceneState.windDirectionX
    : 1;
  const speed = Math.min(1, Math.max(0, sceneState.windSwaySpeed || 0));
  const strength = Math.min(1, Math.max(sceneState.windSwayStrength || 0, (sceneState.windEnergy || 0) * 0.56));
  const angle = direction * (4.5 + strength * 16);
  const midAngle = angle * 0.72;
  const lowAngle = angle * 0.64;
  const softAngle = direction * (1.2 + strength * 4.8);
  const softLowAngle = softAngle * 0.58;
  const recoveryAngle = direction * (0.35 + strength * 1.6);
  const duration = Math.max(3600, 7600 - speed * 1800 - strength * 900);
  const softDuration = Math.round(duration * 1.22);

  return {
    direction,
    strength,
    angle: `${angle.toFixed(2)}deg`,
    midAngle: `${midAngle.toFixed(2)}deg`,
    lowAngle: `${lowAngle.toFixed(2)}deg`,
    softAngle: `${softAngle.toFixed(2)}deg`,
    softLowAngle: `${softLowAngle.toFixed(2)}deg`,
    recoveryAngle: `${recoveryAngle.toFixed(2)}deg`,
    duration: `${Math.round(duration)}ms`,
    softDuration: `${softDuration}ms`,
  };
}

function TraceLayer({ strokes }) {
  if (!strokes.length) return null;
  return (
    <svg className="trace-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {strokes.slice(-12).map((stroke, index) => (
        <path
          d={createTracePath(stroke)}
          className={`trace-path trace-${stroke.tool}`}
          pathLength="1"
          style={{ '--trace-index': index, stroke: stroke.quickdrawColor || stroke.color || undefined, opacity: stroke.quickdrawColor ? 0.28 : undefined }}
          key={stroke.id || index}
        />
      ))}
    </svg>
  );
}

function createTracePath(stroke) {
  const points = stroke.points || [];
  if (!points.length) return '';
  const width = stroke.canvasWidth || 720;
  const height = stroke.canvasHeight || 540;
  const normalized = points.map((point) => ({
    x: ((point.x || 0) / width) * 100,
    y: ((point.y || 0) / height) * 100,
  }));
  if (normalized.length === 1) {
    return `M ${normalized[0].x.toFixed(2)} ${normalized[0].y.toFixed(2)}`;
  }
  const commands = [`M ${normalized[0].x.toFixed(2)} ${normalized[0].y.toFixed(2)}`];
  for (let index = 1; index < normalized.length - 1; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1];
    commands.push(
      `Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${((current.x + next.x) / 2).toFixed(2)} ${((current.y + next.y) / 2).toFixed(2)}`,
    );
  }
  const last = normalized[normalized.length - 1];
  commands.push(`L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`);
  return commands.join(' ');
}

function getLampState(sceneState, quiet, calm) {
  if (calm) return 'quiet';
  if (quiet) return 'sleep';
  if (sceneState.lastTool === 'wind') return 'sway';
  if (sceneState.lastTool === 'rain') return 'rain';
  if (sceneState.lastTool === 'sun') return 'warm';
  if (sceneState.totalStrokeCount > 0) return 'awake';
  return 'sleep';
}

function ResponseCluster({ item, index, live = false }) {
  const x = clampPercent(item.x, item.canvasWidth, 8, 92);
  const rawY = clampPercent(item.y, item.canvasHeight, 10, 86);
  const y = isGroundTool(item.tool) ? Math.max(rawY, 62) : rawY;
  const intensity = Math.min(1, Math.max(0.2, item.speed || item.density || 0.5));
  const count = getResponseCount(item.tool, intensity);
  const family = getToolFamily(item.tool);
  return (
    <span
      className={`generated-element response-cluster response-${item.tool} response-${family} ${live ? 'live-response' : ''}`}
      style={{ '--x': `${x}%`, '--y': `${y}%`, '--i': index, '--response-intensity': intensity }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, dotIndex) => (
        <span className="response-piece" style={getPieceStyle(item.tool, dotIndex)} key={dotIndex} />
      ))}
    </span>
  );
}

function getResponseCount(tool, intensity) {
  const base = {
    rain: 7,
    rainDrop: 7,
    dew: 5,
    waterLine: 4,
    ripple: 4,
    puddle: 4,
    snail: 3,
    grass: 5,
    seed: 4,
    reed: 5,
    moss: 6,
    sprout: 4,
    smallTree: 3,
    sun: 6,
    sunlight: 6,
    lantern: 4,
    firefly: 7,
    moon: 3,
    star: 5,
    moonbeam: 4,
    breathLight: 4,
    wind: 4,
    windLine: 4,
    cloud: 3,
    ribbon: 4,
    floatingLeaf: 5,
    softWind: 4,
    constellationLine: 5,
    rainbow: 4,
    flower: 4,
    firstFlower: 4,
    bud: 4,
    quietFlower: 4,
    mushroom: 4,
    stone: 4,
    bridge: 4,
    signpost: 3,
    soilLine: 4,
    shadow: 4,
    windBell: 3,
    leafBoat: 3,
    windowLight: 3,
  }[tool] || 5;
  return Math.round(base + intensity * Math.max(2, base * 0.45));
}

function getPieceStyle(tool, index) {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const spread = {
    rain: [18, 16],
    rainDrop: [18, 16],
    dew: [16, 14],
    waterLine: [20, 8],
    ripple: [18, 12],
    puddle: [18, 12],
    snail: [16, 10],
    grass: [14, 5],
    seed: [12, 7],
    memorySeed: [18, 12],
    reed: [14, 5],
    moss: [12, 7],
    sprout: [14, 5],
    smallTree: [16, 8],
    sun: [22, 22],
    sunlight: [22, 22],
    lantern: [16, 18],
    firefly: [18, 18],
    moon: [18, 18],
    windowLight: [16, 14],
    star: [18, 18],
    moonbeam: [22, 18],
    breathLight: [18, 18],
    wind: [18, 8],
    windLine: [18, 8],
    cloud: [18, 8],
    ribbon: [20, 8],
    floatingLeaf: [16, 10],
    windBell: [12, 16],
    softWind: [18, 8],
    constellationLine: [20, 8],
    rainbow: [20, 8],
    flower: [16, 10],
    firstFlower: [16, 10],
    bud: [14, 10],
    quietFlower: [16, 10],
    mushroom: [16, 10],
    stone: [15, 10],
    bridge: [18, 6],
    signpost: [12, 8],
    shadow: [18, 7],
    soilLine: [18, 6],
  }[tool] || [16, 12];
  const angle = index * 137.5 * (Math.PI / 180);
  const ring = Math.floor(index / 6) + 1;
  const radial = ['sun', 'sunlight', 'flower', 'firstFlower', 'quietFlower', 'star'].includes(tool);
  const dx = radial ? Math.cos(angle) * ring * spread[0] : (col - 2) * spread[0];
  const dy = radial ? Math.sin(angle) * ring * spread[1] : (row - 1) * spread[1];
  const family = getToolFamily(tool);
  const width = {
    wind: 42 + (index % 3) * 18,
    windLine: 42 + (index % 3) * 18,
    softWind: 42 + (index % 3) * 18,
    cloud: 58 + (index % 3) * 20,
    ribbon: 50 + (index % 3) * 22,
    rainbow: 56 + (index % 3) * 24,
    constellationLine: 52 + (index % 3) * 20,
    waterLine: 44 + (index % 3) * 18,
    ripple: 28 + (index % 4) * 10,
    puddle: 46 + (index % 3) * 16,
    bridge: 34 + (index % 3) * 10,
    signpost: 24 + (index % 2) * 8,
    sun: 46 + (index % 3) * 18,
    sunlight: 14 + (index % 3) * 7,
    firstFlower: 24 + (index % 3) * 4,
    star: 12 + (index % 3) * 6,
    firefly: 10 + (index % 3) * 5,
    moonbeam: 18 + (index % 3) * 9,
  }[tool];
  const height = {
    rain: 16 + (index % 4) * 5,
    rainDrop: 16 + (index % 4) * 5,
    dew: 8 + (index % 3) * 3,
    grass: 28 + (index % 5) * 7,
    reed: 32 + (index % 5) * 8,
    sprout: 24 + (index % 5) * 7,
    smallTree: 40 + (index % 5) * 8,
    seed: 11 + (index % 3) * 3,
    memorySeed: 15 + (index % 3) * 4,
    moss: 8 + (index % 3) * 3,
    sun: 3 + (index % 3),
    sunlight: 14 + (index % 3) * 7,
    firstFlower: 24 + (index % 3) * 4,
    lantern: 24 + (index % 3) * 8,
    breathLight: 22 + (index % 3) * 8,
    star: 12 + (index % 3) * 6,
    firefly: 10 + (index % 3) * 5,
    windowLight: 18 + (index % 2) * 4,
    stone: 18 + (index % 3) * 8,
    mushroom: 24 + (index % 3) * 7,
  }[tool];
  const rotate = {
    wind: -8 + (index % 5) * 5,
    windLine: -8 + (index % 5) * 5,
    softWind: -8 + (index % 5) * 5,
    ribbon: -12 + (index % 5) * 6,
    rainbow: -14 + (index % 5) * 7,
    grass: -22 + (index % 7) * 7,
    reed: -18 + (index % 7) * 6,
    sprout: -18 + (index % 7) * 6,
    stone: -6 + (index % 4) * 4,
    bridge: -4 + (index % 3) * 4,
    waterLine: -8 + (index % 5) * 4,
    ripple: -4 + (index % 3) * 3,
    leafBoat: -12 + (index % 5) * 6,
    windBell: -6 + (index % 3) * 6,
    constellationLine: -10 + (index % 5) * 5,
  }[tool] || 0;
  const bottom = family === 'grass' ? 6 + (index % 2) * 4 : 0;
  return {
    '--p': index,
    '--dx': `${dx.toFixed(1)}px`,
    '--dy': `${dy.toFixed(1)}px`,
    '--piece-width': width ? `${width}px` : undefined,
    '--piece-height': height ? `${height}px` : undefined,
    '--piece-rotate': `${rotate}deg`,
    '--piece-bottom': `${bottom}px`,
    '--piece-delay': `${index * 54}ms`,
  };
}

function getToolFamily(tool) {
  if (tool === 'wind') return 'wind';
  if (tool === 'windLine') return 'windLine';
  if (tool === 'softWind') return 'softWind';
  if (tool === 'cloud') return 'cloud';
  if (tool === 'ribbon') return 'ribbon';
  if (tool === 'floatingLeaf') return 'floatingLeaf';
  if (tool === 'windBell') return 'windBell';
  if (tool === 'rain') return 'rain';
  if (tool === 'rainDrop') return 'rainDrop';
  if (tool === 'dew') return 'dew';
  if (tool === 'waterLine') return 'waterLine';
  if (tool === 'ripple') return 'ripple';
  if (tool === 'puddle') return 'puddle';
  if (tool === 'snail') return 'snail';
  if (tool === 'snailTrail') return 'snailTrail';
  if (tool === 'grass') return 'grass';
  if (tool === 'seed') return 'seed';
  if (tool === 'reed') return 'reed';
  if (tool === 'moss') return 'moss';
  if (tool === 'smallTree') return 'smallTree';
  if (tool === 'sprout') return 'sprout';
  if (tool === 'memorySeed') return 'memorySeed';
  if (tool === 'sun') return 'sun';
  if (tool === 'sunlight') return 'sunlight';
  if (tool === 'lantern') return 'lantern';
  if (tool === 'firefly') return 'firefly';
  if (tool === 'moon') return 'moon';
  if (tool === 'windowLight') return 'windowLight';
  if (tool === 'breathLight') return 'breathLight';
  if (tool === 'star') return 'star';
  if (tool === 'moonbeam') return 'moonbeam';
  if (tool === 'flower') return 'flower';
  if (tool === 'firstFlower') return 'firstFlower';
  if (tool === 'bud') return 'bud';
  if (tool === 'quietFlower') return 'quietFlower';
  if (tool === 'mushroom') return 'mushroom';
  if (tool === 'stone') return 'stone';
  if (tool === 'bridge') return 'bridge';
  if (tool === 'signpost') return 'signpost';
  if (tool === 'soilLine') return 'soilLine';
  if (tool === 'shadow') return 'shadow';
  if (tool === 'constellationLine') return 'constellationLine';
  if (tool === 'rainbow') return 'rainbow';
  return tool;
}

function isGroundTool(tool) {
  return ['grass', 'flower', 'seed', 'memorySeed', 'moss', 'stone', 'mushroom', 'sprout', 'bud', 'firstFlower', 'reed', 'quietFlower', 'bridge', 'soilLine', 'signpost', 'smallTree', 'snail'].includes(tool);
}

function clampPercent(value, size, min, max) {
  const percent = Number.isFinite(value) && Number.isFinite(size) && size > 0 ? (value / size) * 100 : 50;
  return Math.min(max, Math.max(min, percent));
}

export default GardenStage;
