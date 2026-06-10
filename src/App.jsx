import { ArrowLeft, BookOpen, Volume2, VolumeX } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getGardenDay } from './data/gardenDays';
import { getMood } from './data/moods';
import { getTool } from './data/tools';
import BreathePage from './routes/BreathePage';
import CanvasPage from './routes/CanvasPage';
import DiaryCardPage from './routes/DiaryCardPage';
import DiaryPage from './routes/DiaryPage';
import GuidePage from './routes/GuidePage';
import MoodPage from './routes/MoodPage';
import StartPage from './routes/StartPage';
import { prepareAudio, playElementTone, playLiveElementTone } from './utils/audioEngine';
import { applyGestureSettling, clamp, createFeedback, createInitialSceneState, updateSceneState } from './utils/sceneState';
import { loadDiaries, saveDiaries } from './utils/storage';
import { analyzeStroke, isValidStroke } from './utils/strokeAnalysis';
import { createStory } from './utils/storyGenerator';
import { getToolElement } from './data/toolElementMap';
import { getQuickDrawAssetVariant } from './data/quickdrawAssets';
import { buildStampPlacements } from './utils/stampPlacement';
import { recognizeSketchTool } from './utils/sketchRecognizer';

const routes = ['/start', '/mood-scene', '/guide', '/garden', '/breath', '/diary-card', '/diary-list'];

function normalizeRoute(pathname) {
  const clean = pathname === '/' ? '/start' : pathname;
  return routes.includes(clean) ? clean : '/start';
}

function App() {
  const [route, setRoute] = useState(() => normalizeRoute(window.location.pathname));
  const [selectedScene, setSelectedScene] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedTool, setSelectedTool] = useState(() => getGardenDay(1).tools[0] || 'seed');
  const [entryTool, setEntryTool] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [elementHistory, setElementHistory] = useState([]);
  const [liveResponses, setLiveResponses] = useState([]);
  const [sceneState, setSceneState] = useState(() => createInitialSceneState(null, 1));
  const [feedback, setFeedback] = useState('先选一个元素，再把它画出来。');
  const [diaries, setDiaries] = useState(loadDiaries);
  const [viewingDiaryId, setViewingDiaryId] = useState(null);
  const [title, setTitle] = useState('今天的小花园');
  const [muted, setMuted] = useState(false);
  const liveResponseLastAt = useRef(0);

  const mood = getMood(selectedScene);
  const gardenDay = getGardenDay(selectedDay);
  const activeTool = getTool(selectedTool);
  const activeToolMeta = getToolElement(selectedTool);
  const viewingDiary = viewingDiaryId ? diaries.find((entry) => entry.id === viewingDiaryId) : null;
  const elements = sceneState.toolCounts;
  const story = useMemo(() => createStory(mood, elementHistory, sceneState, gardenDay), [mood, elementHistory, sceneState, gardenDay]);

  useEffect(() => {
    const onPop = () => setRoute(normalizeRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    saveDiaries(diaries);
  }, [diaries]);

  function navigate(nextRoute) {
    const normalized = normalizeRoute(nextRoute);
    window.history.pushState({}, '', normalized);
    setRoute(normalized);
  }

  function resetGarden(day = selectedDay) {
    const nextDay = getGardenDay(day);
    setSelectedScene(null);
    setSelectedDay(day);
    setSelectedTool(nextDay.tools[0] || 'seed');
    setEntryTool(null);
    setStrokes([]);
    setElementHistory([]);
    setLiveResponses([]);
    setSceneState(createInitialSceneState(null, day));
    setFeedback(`${nextDay.name}已经准备好了。`);
    setTitle(`${nextDay.name}日记`);
  }

  function startGarden() {
    prepareAudio();
    resetGarden(selectedDay);
    navigate('/mood-scene');
  }

  function chooseDay(day) {
    resetGarden(day);
  }

  function chooseScene(sceneId, preferredToolId = null) {
    setSelectedScene(sceneId);
    setEntryTool(preferredToolId);
    const nextState = createInitialSceneState(sceneId, selectedDay);
    setSceneState(nextState);
    const recommended = preferredToolId || gardenDay.recommendedByMood?.[sceneId]?.[0] || gardenDay.tools[0] || 'seed';
    setSelectedTool(recommended);
  }

  function goBack() {
    if (route === '/breath' && viewingDiaryId) {
      setViewingDiaryId(null);
      navigate('/diary-list');
      return;
    }
    const previous = {
      '/mood-scene': '/start',
      '/guide': '/mood-scene',
      '/garden': '/guide',
      '/breath': '/garden',
      '/diary-card': '/breath',
      '/diary-list': '/start',
    }[route] || '/start';
    navigate(previous);
  }

  function handleStroke(rawStroke) {
    const analyzed = analyzeStroke(rawStroke);
    if (!isValidStroke(analyzed)) {
      setFeedback('这一笔先被轻轻记住了。');
      return;
    }

    const recognition = recognizeSketchTool(analyzed, gardenDay.tools, { fallbackToolId: selectedTool || analyzed.tool });
    const toolId = recognition.toolId;
    const toolMeta = getToolElement(toolId);
    const recentTools = elementHistory.map((item) => item.tool);
    const stampPack = buildStampPlacements(analyzed, toolId, {
      sceneState,
      canvasWidth: analyzed.canvasWidth,
      canvasHeight: analyzed.canvasHeight,
      stageRect: analyzed.stageRect,
      day: selectedDay,
    });
    const strokeRecord = {
      ...analyzed,
      tool: toolId,
      elementCount: stampPack.count,
      stampCount: stampPack.count,
      stamps: stampPack.placements,
      feedbackText: toolMeta.feedbackText,
      recognition,
      quickdraw: {
        ...(analyzed.quickdraw || {}),
        placements: stampPack.placements,
        recognition,
      },
    };
    const nextState = updateSceneState(toolId, strokeRecord, sceneState);
    const generated = stampPack.placements.map((placement, index) => ({
      ...stripHeavyPlacementFields(placement),
      id: `${analyzed.id}-${index}`,
      sourceStrokeId: analyzed.id,
      strokeId: analyzed.id,
      speed: analyzed.speedAvg,
      density: analyzed.densityLocal,
      length: analyzed.length,
      direction: analyzed.direction,
      canvasWidth: analyzed.canvasWidth,
      canvasHeight: analyzed.canvasHeight,
      quickdrawDrawing: analyzed.drawing,
      quickdrawBoundingBox: analyzed.boundingBox,
      feedbackText: toolMeta.feedbackText,
      recognition,
    }));

    setStrokes((current) => [...current, strokeRecord]);
    setElementHistory((current) => [...current, ...generated]);
    setSceneState(nextState);
    setSelectedTool(toolId);
    setFeedback(createRecognitionFeedback(recognition, toolMeta, nextState, recentTools));
    playElementTone(toolId, analyzed.speedAvg, muted);
  }

  function handleStrokeMove(event) {
    if (event.phase === 'end') return;
    const liveRecognition = event.phase === 'move' && event.points?.length >= 8
      ? recognizeSketchTool(event, gardenDay.tools, { fallbackToolId: selectedTool || event.tool })
      : null;
    const liveToolId = liveRecognition?.toolId || event.tool;
    playLiveElementTone(liveToolId, { ...event, tool: liveToolId }, muted);

    if (event.phase !== 'move' || event.distance < 5) return;
    if (event.point.t - liveResponseLastAt.current < 55) return;
    liveResponseLastAt.current = event.point.t;
    const recognizedEvent = { ...event, tool: liveToolId, recognition: liveRecognition };
    if (['wind', 'windLine', 'softWind', 'ribbon'].includes(liveToolId)) {
      updateLiveWind(recognizedEvent);
    }
    updateLiveSceneEffects(recognizedEvent);
    const id = `${event.id}-${Math.round(event.point.t)}`;
    const liveY = getLiveResponseY(liveToolId, event.point.y, event.canvasHeight);
    const liveVariantIndex = getLiveVariantIndex({ ...event, tool: liveToolId });
    const liveVariant = getQuickDrawAssetVariant(liveToolId, liveVariantIndex);
    const live = {
      id,
      tool: liveToolId,
      x: event.point.x,
      y: liveY,
      speed: event.speed,
      density: Math.min(1, event.distance / 26),
      direction: Math.abs(event.point.y - event.previous.y) > Math.abs(event.point.x - event.previous.x) ? 'vertical' : 'horizontal',
      canvasWidth: event.canvasWidth,
      canvasHeight: event.canvasHeight,
      stageWidth: event.stageRect?.width || event.canvasWidth,
      stageHeight: event.stageRect?.height || event.canvasHeight,
      live: true,
      appearDelay: 0,
      zone: skyTool(liveToolId) ? 'sky' : groundTool(liveToolId) ? 'ground' : 'any',
      size: getLiveResponseSize(liveToolId),
      opacity: 0.82,
      animationType: 'draw',
      assetVariantIndex: liveVariantIndex,
      variantIndex: liveVariantIndex,
      assetPath: liveVariant?.assetPath,
      recognition: liveRecognition,
    };
    if (!live.assetPath) return;
    setLiveResponses((current) => [...current.slice(-14), live]);
    window.setTimeout(() => {
      setLiveResponses((current) => current.filter((item) => item.id !== id));
    }, 1100);
  }

  function selectTool(toolId) {
    const toolMeta = getToolElement(toolId);
    setSelectedTool(toolId);
    setFeedback(toolMeta.feedbackText || `现在画出来的都会变成${toolMeta.label || '这个元素'}。`);
  }

  function updateLiveWind(event) {
    const dx = event.point.x - event.previous.x;
    const dy = event.point.y - event.previous.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;
    const dirX = dx / length;
    const dirY = dy / length;
    const speed = clamp(event.speed || 0, 0, 1);
    setSceneState((current) => {
      const windEnergy = clamp((current.windEnergy || 0) + 0.004 + speed * 0.012, 0, 1);
      const currentDir = current.windDirectionX || 1;
      const targetDir = Math.abs(dirX) < 0.12 ? currentDir : clamp(dirX, -1, 1);
      const smoothedDir = clamp(currentDir * 0.82 + targetDir * 0.18, -1, 1);
      const smoothedSpeed = clamp((current.windSwaySpeed || 0) * 0.72 + speed * 0.28, 0, 1);
      const targetStrength = clamp(0.24 + speed * 0.46 + windEnergy * 0.22, 0, 0.92);
      return {
        ...current,
        windEnergy,
        windDirectionX: Math.abs(smoothedDir) < 0.1 ? (smoothedDir >= 0 ? 0.1 : -0.1) : smoothedDir,
        windDirectionY: clamp(dirY, -1, 1),
        windSwaySpeed: smoothedSpeed,
        windSwayStrength: clamp((current.windSwayStrength || 0) * 0.68 + targetStrength * 0.32, 0, 0.92),
        animationSpeed: clamp(0.82 + smoothedSpeed * 0.38, 0.72, 1.22),
        lastTool: event.tool,
      };
    });
  }

  function updateLiveSceneEffects(event) {
    const tool = event.tool;
    const speed = clamp(event.speed || 0, 0, 1);
    setSceneState((current) => {
      const next = { ...current, toolCounts: { ...current.toolCounts }, lastTool: tool };
      if (['rain', 'rainDrop', 'dew'].includes(tool)) {
        next.rainDensity = clamp((next.rainDensity || 0) + 0.006 + speed * 0.006, 0, 1);
        next.soilWetness = clamp((next.soilWetness || 0) + 0.004, 0, 1);
        next.waterRipple = clamp((next.waterRipple || 0) + 0.003, 0, 1);
      } else if (['grass', 'reed', 'moss', 'sprout', 'smallTree', 'seed', 'memorySeed'].includes(tool)) {
        next.grassCoverage = clamp((next.grassCoverage || 0) + 0.004 + speed * 0.003, 0, 1);
        next.groundGreen = clamp((next.groundGreen || 0) + 0.004, 0, 1);
      } else if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(tool)) {
        next.flowerBloom = clamp((next.flowerBloom || 0) + 0.004 + speed * 0.003, 0, 1);
      } else if (['sun', 'sunlight', 'lantern', 'firefly', 'moon', 'windowLight', 'breathLight', 'star', 'moonbeam'].includes(tool)) {
        next.brightness = clamp((next.brightness || 0) + 0.003 + speed * 0.002, 0.65, 0.96);
        next.sunlightWarmth = clamp((next.sunlightWarmth || 0) + 0.004, 0, 1);
        next.nightSparkle = clamp((next.nightSparkle || 0) + (['star', 'firefly'].includes(tool) ? 0.004 : 0.001), 0, 1);
      } else if (['waterLine', 'ripple', 'puddle', 'leafBoat', 'snailTrail'].includes(tool)) {
        next.waterFlow = clamp((next.waterFlow || 0) + 0.005 + speed * 0.004, 0, 1);
        next.waterRipple = clamp((next.waterRipple || 0) + 0.004, 0, 1);
      } else if (['bridge', 'stone', 'signpost', 'soilLine', 'shadow'].includes(tool)) {
        next.pathCompletion = clamp((next.pathCompletion || 0) + 0.004, 0, 1);
        if (tool === 'soilLine' || tool === 'shadow') next.soilTexture = clamp((next.soilTexture || 0) + 0.004, 0, 1);
      }
      return next;
    });
  }

  function enterBreath() {
    navigate('/breath');
  }

  function handleSettleGesture(gesture) {
    setSceneState((current) => applyGestureSettling(current, gesture));
  }

  function openDiary(entry) {
    const day = entry.day || 1;
    const nextDay = getGardenDay(day);
    setViewingDiaryId(entry.id);
    setSelectedDay(day);
    setSelectedScene(entry.mood || null);
    setSelectedTool(nextDay.tools[0] || 'seed');
    setEntryTool(null);
    setStrokes(entry.strokes || []);
    setElementHistory(entry.elementHistory || []);
    setLiveResponses([]);
    setSceneState(entry.sceneState || createInitialSceneState(entry.mood, day));
    setFeedback('可以轻轻回看这片花园。');
    setTitle(entry.title || `${nextDay.name}日记`);
    navigate('/breath');
  }

  function suggestLight() {
    const lightTool = gardenDay.tools.find((tool) => ['sun', 'sunlight', 'lantern', 'moon', 'star', 'breathLight', 'windowLight', 'moonbeam', 'firefly'].includes(tool)) || 'sunlight';
    setSelectedTool(lightTool);
    setFeedback('也可以给花园一点柔和的光。');
  }

  function saveDiary() {
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      title: title.trim() || `${gardenDay.name}日记`,
      day: selectedDay,
      dayName: gardenDay.name,
      mood: mood.id,
      moodLabel: mood.title,
      elements,
      elementHistory: elementHistory.map(stripHeavyPlacementFields),
      sceneState,
      story,
      strokes: [],
    };
    const nextDiaries = [entry, ...diaries].slice(0, 21);
    setDiaries(nextDiaries);
    saveDiaries(nextDiaries);
    navigate('/diary-list');
  }

  function stripHeavyPlacementFields(placement) {
    const {
      asset,
      variant,
      toolMeta,
      ...lightPlacement
    } = placement;
    return lightPlacement;
  }

  function newGarden() {
    setViewingDiaryId(null);
    resetGarden();
    navigate('/start');
  }

  const showBack = route !== '/start';

  return (
    <main className={`app-shell scene-${mood.tone} day-${selectedDay}`}>
      <div className="ipad-stage">
        <header className="app-topbar">
          {showBack ? (
            <button className="icon-button ghost" onClick={goBack} aria-label="返回">
              <ArrowLeft size={23} />
            </button>
          ) : (
            <span className="brand-dot" aria-hidden="true" />
          )}
          <div>
            <p className="eyebrow">BreathScape</p>
            <h1>今天的小花园</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setMuted((value) => !value)} aria-label={muted ? '打开声音' : '关闭声音'}>
              {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
            <button className="icon-button" onClick={() => navigate('/diary-list')} aria-label="打开日记">
              <BookOpen size={22} />
            </button>
          </div>
        </header>

        {route === '/start' && (
          <StartPage mood={mood} selectedDay={selectedDay} onSelectDay={chooseDay} onStart={startGarden} onOpenDiary={() => navigate('/diary-list')} />
        )}
        {route === '/mood-scene' && (
          <MoodPage selectedMood={selectedScene} selectedToolId={entryTool} gardenDay={gardenDay} onSelectMood={chooseScene} onContinue={() => navigate('/guide')} />
        )}
        {route === '/guide' && (
          <GuidePage
            mood={mood}
            gardenDay={gardenDay}
            sceneState={sceneState}
            entryTool={entryTool}
            onChooseTool={(toolId) => {
              setSelectedTool(toolId);
              navigate('/garden');
            }}
            onFreeChoose={() => navigate('/garden')}
          />
        )}
        {route === '/garden' && (
          <CanvasPage
            mood={mood}
            gardenDay={gardenDay}
            sceneState={sceneState}
            activeTool={activeTool}
            feedback={feedback}
            strokes={strokes}
            elementHistory={elementHistory}
            liveResponses={liveResponses}
            onSelectTool={selectTool}
            onStroke={handleStroke}
            onStrokeMove={handleStrokeMove}
            onFinish={enterBreath}
            onSuggest={suggestLight}
          />
        )}
        {route === '/breath' && (
          <BreathePage
            mood={mood}
            gardenDay={gardenDay}
            sceneState={sceneState}
            elementHistory={elementHistory}
            strokes={strokes}
            onGesture={handleSettleGesture}
            onNext={() => {
              if (viewingDiaryId) {
                setViewingDiaryId(null);
                navigate('/diary-list');
                return;
              }
              navigate('/diary-card');
            }}
            isDiaryReplay={Boolean(viewingDiary)}
            replayTitle={viewingDiary?.title}
          />
        )}
        {route === '/diary-card' && (
          <DiaryCardPage mood={mood} gardenDay={gardenDay} sceneState={sceneState} elementHistory={elementHistory} strokes={strokes} story={story} title={title} onTitleChange={setTitle} onSave={saveDiary} />
        )}
        {route === '/diary-list' && <DiaryPage diaries={diaries} onNewGarden={newGarden} onOpenDiary={openDiary} />}
      </div>
    </main>
  );
}

function groundTool(tool) {
  return ['grass', 'flower', 'seed', 'memorySeed', 'moss', 'stone', 'mushroom', 'sprout', 'bud', 'firstFlower', 'reed', 'quietFlower', 'bridge', 'soilLine', 'signpost', 'smallTree'].includes(tool);
}

function skyTool(tool) {
  return ['rain', 'rainDrop', 'sun', 'sunlight', 'cloud', 'star', 'moon', 'moonbeam', 'firefly', 'constellationLine', 'rainbow'].includes(tool);
}

function createRecognitionFeedback(recognition, toolMeta, sceneState, recentTools) {
  const base = toolMeta.feedbackText || createFeedback(recognition.toolId, sceneState, recentTools);
  if (!recognition || recognition.reason === 'no-template') {
    return `我先把这笔整理成${toolMeta.label}。${base}`;
  }
  if (recognition.lowConfidence) {
    return `我从这笔里看见了一点${toolMeta.label}的样子，先把它整理成${toolMeta.label}。${base}`;
  }
  return `我看见它像${toolMeta.label}，已经整理成 QuickDraw 风格。${base}`;
}

function getLiveResponseY(tool, y, height) {
  return clamp(y, 0, height);
}

function getLiveResponseSize(tool) {
  if (['rain', 'rainDrop'].includes(tool)) return 52;
  if (['star', 'firefly'].includes(tool)) return 44;
  if (['grass', 'seed', 'memorySeed', 'dew'].includes(tool)) return 48;
  return 58;
}

function getLiveVariantIndex(event) {
  const value = `${event.tool}:${event.id}:${Math.round(event.point.t / 90)}:${Math.round(event.point.x)}:${Math.round(event.point.y)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export default App;
