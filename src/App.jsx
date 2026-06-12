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
import { prepareAudio, playElementTone } from './utils/audioEngine';
import { applyGestureSettling, createFeedback, createInitialSceneState, updateSceneState } from './utils/sceneState';
import { loadDiaries, saveDiaries } from './utils/storage';
import { analyzeStroke, isValidStroke } from './utils/strokeAnalysis';
import { createStory } from './utils/storyGenerator';
import { getToolElement } from './data/toolElementMap';
import { buildStampPlacements } from './utils/stampPlacement';
import { createMultiStrokeDrawing, DEFAULT_DRAWING_SETTLE_MS } from './utils/multiStrokeSession';
import { classifyWithQuickDrawModel, loadQuickDrawSketchModel } from './utils/quickdrawModelClassifier';
import { mapQuickDrawCategoryToTool } from './data/quickdrawCategoryToolMap';
import { classifyWithQuickDrawCnn, loadQuickDrawCnnModel } from './utils/quickdrawCnnClassifier';
import { rasterizeQuickDrawDrawing, rasterToDataUrl } from './utils/quickdrawRasterizer';

const routes = ['/start', '/mood-scene', '/guide', '/garden', '/breath', '/diary-card', '/diary-list'];

function normalizeRoute(pathname) {
  const clean = pathname === '/' ? '/start' : pathname;
  return routes.includes(clean) ? clean : '/start';
}

function createRecognitionProcess(bundle = null) {
  const ready = Boolean(bundle);
  return {
    phase: 'idle',
    modelStatus: ready ? 'ready' : 'loading',
    modelLine: ready ? 'QuickDraw CNN ready' : 'QuickDraw CNN loading',
    imageSize: bundle?.metadata?.imageSize || bundle?.imageSize || 64,
    accuracy: bundle?.metadata?.mappedToolAccuracy || bundle?.metadata?.bestValidationAccuracy || null,
    strokeCount: 0,
    pointCount: 0,
    selectedToolId: null,
    selectedToolLabel: null,
    finalToolId: null,
    finalToolLabel: null,
    reason: null,
    confidence: null,
    topK: [],
    allowedTools: [],
    allowedLabels: [],
    sceneAllowed: null,
    fallbackLine: null,
    crowded: false,
    rasterPreviewUrl: null,
  };
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
  const [clearTraceSignal, setClearTraceSignal] = useState(0);
  const [recognitionProcess, setRecognitionProcess] = useState(() => createRecognitionProcess());
  const [sceneState, setSceneState] = useState(() => createInitialSceneState(null, 1));
  const [feedback, setFeedback] = useState('可以自由画。停笔后一起整理。');
  const [diaries, setDiaries] = useState(loadDiaries);
  const [viewingDiaryId, setViewingDiaryId] = useState(null);
  const [title, setTitle] = useState('今天的小花园');
  const [muted, setMuted] = useState(false);
  const pendingStrokeSessionRef = useRef([]);
  const settleTimerRef = useRef(null);
  const elementHistoryRef = useRef([]);
  const sceneStateRef = useRef(sceneState);
  const selectedToolRef = useRef(selectedTool);
  const quickdrawModelRef = useRef(null);
  const quickdrawCnnRef = useRef(null);

  const mood = getMood(selectedScene);
  const gardenDay = getGardenDay(selectedDay);
  const activeTool = getTool(selectedTool);
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

  useEffect(() => {
    elementHistoryRef.current = elementHistory;
  }, [elementHistory]);

  useEffect(() => {
    sceneStateRef.current = sceneState;
  }, [sceneState]);

  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  useEffect(() => () => clearPendingDrawingTimer(), []);

  useEffect(() => {
    let cancelled = false;
    setRecognitionProcess((current) => ({
      ...current,
      modelStatus: 'loading',
      modelLine: 'QuickDraw CNN loading',
    }));
    loadQuickDrawSketchModel().then((model) => {
      if (!cancelled) quickdrawModelRef.current = model;
    });
    loadQuickDrawCnnModel().then((bundle) => {
      if (!cancelled) {
        quickdrawCnnRef.current = bundle;
        setRecognitionProcess((current) => ({
          ...current,
          modelStatus: bundle ? 'ready' : 'fallback',
          modelLine: bundle ? 'QuickDraw CNN ready' : 'QuickDraw CNN unavailable',
          imageSize: bundle?.metadata?.imageSize || bundle?.imageSize || 64,
          accuracy: bundle?.metadata?.mappedToolAccuracy || bundle?.metadata?.bestValidationAccuracy || null,
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function navigate(nextRoute) {
    const normalized = normalizeRoute(nextRoute);
    window.history.pushState({}, '', normalized);
    setRoute(normalized);
  }

  function resetGarden(day = selectedDay) {
    clearPendingDrawingSession();
    const nextDay = getGardenDay(day);
    setSelectedScene(null);
    setSelectedDay(day);
    setSelectedTool(null);
    selectedToolRef.current = null;
    setEntryTool(null);
    setStrokes([]);
    setElementHistory([]);
    setLiveResponses([]);
    setRecognitionProcess(createRecognitionProcess(quickdrawCnnRef.current));
    setClearTraceSignal((value) => value + 1);
    const initialState = createInitialSceneState(null, day);
    sceneStateRef.current = initialState;
    setSceneState(initialState);
    setFeedback(`${nextDay.name}准备好了。`);
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
    sceneStateRef.current = nextState;
    setSceneState(nextState);
    const recommended = preferredToolId || gardenDay.recommendedByMood?.[sceneId]?.[0] || gardenDay.tools[0] || 'seed';
    selectedToolRef.current = recommended;
    setSelectedTool(recommended);
    setFeedback(`当前选择：${getToolElement(recommended).label}。进入画布后会先按这个元素回应。`);
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
      setClearTraceSignal((value) => value + 1);
      return;
    }

    pendingStrokeSessionRef.current = [...pendingStrokeSessionRef.current, analyzed];
    setRecognitionProcess((current) => ({
      ...current,
      phase: 'collecting',
      strokeCount: pendingStrokeSessionRef.current.length,
      pointCount: pendingStrokeSessionRef.current.reduce((sum, stroke) => sum + (stroke.pointCount || stroke.points?.length || 0), 0),
      selectedToolId: selectedToolRef.current,
      selectedToolLabel: selectedToolRef.current ? getToolElement(selectedToolRef.current).label : null,
      finalToolId: null,
      finalToolLabel: null,
      reason: null,
      confidence: null,
      topK: [],
      fallbackLine: null,
      crowded: false,
    }));
    setFeedback(`已记住 ${pendingStrokeSessionRef.current.length} 笔，停下来后整理。`);
    clearPendingDrawingTimer();
    settleTimerRef.current = window.setTimeout(() => {
      finalizePendingDrawing();
    }, DEFAULT_DRAWING_SETTLE_MS);
  }

  function finalizePendingDrawing() {
    clearPendingDrawingTimer();
    const sessionStrokes = pendingStrokeSessionRef.current;
    pendingStrokeSessionRef.current = [];
    const drawing = createMultiStrokeDrawing(sessionStrokes);
    if (!drawing || !isValidStroke(drawing)) {
      setFeedback('这一组线条先被轻轻记住了。');
      setClearTraceSignal((value) => value + 1);
      return;
    }

    const currentSelectedTool = selectedToolRef.current;
    const rasterSize = quickdrawCnnRef.current?.metadata?.imageSize || quickdrawCnnRef.current?.imageSize || 64;
    const rasterPreview = createRasterPreview(drawing, rasterSize);
    setRecognitionProcess((current) => ({
      ...current,
      phase: 'classifying',
      strokeCount: drawing.strokeCount,
      pointCount: drawing.pointCount,
      imageSize: rasterSize,
      selectedToolId: currentSelectedTool,
      selectedToolLabel: currentSelectedTool ? getToolElement(currentSelectedTool).label : null,
      allowedTools: gardenDay.tools,
      allowedLabels: gardenDay.tools.map((toolId) => getToolElement(toolId).label),
      rasterPreviewUrl: rasterPreview,
    }));
    const resolution = resolveDrawingTool(drawing, currentSelectedTool, gardenDay.tools, sceneStateRef.current, {
      cnnModel: quickdrawCnnRef.current,
      sketchModel: quickdrawModelRef.current,
    });
    const recognition = resolution.recognition;
    const toolId = recognition.toolId;
    const toolMeta = getToolElement(toolId);
    const recentTools = elementHistoryRef.current.map((item) => item.tool);
    const tolerance = getCanvasTolerance(drawing, sceneStateRef.current, Boolean(currentSelectedTool));
    const stampPack = buildStampPlacements(drawing, toolId, {
      sceneState: sceneStateRef.current,
      canvasWidth: drawing.canvasWidth,
      canvasHeight: drawing.canvasHeight,
      stageRect: drawing.stageRect,
      day: selectedDay,
    });
    const placements = [pickSingleFinalPlacement(stampPack.placements, drawing, toolId)].filter(Boolean);
    const strokeRecord = {
      ...drawing,
      tool: toolId,
      elementCount: placements.length,
      stampCount: placements.length,
      stamps: placements,
      feedbackText: toolMeta.feedbackText,
      recognition,
      tolerance,
      quickdraw: {
        ...(drawing.quickdraw || {}),
        placements,
        recognition,
      },
    };
    const generated = placements.map((placement, index) => ({
      ...stripHeavyPlacementFields(placement),
      id: `${drawing.id}-${index}`,
      sourceStrokeId: drawing.id,
      strokeId: drawing.id,
      speed: drawing.speedAvg,
      density: drawing.densityLocal,
      length: drawing.length,
      direction: drawing.direction,
      canvasWidth: drawing.canvasWidth,
      canvasHeight: drawing.canvasHeight,
      quickdrawDrawing: drawing.drawing,
      quickdrawBoundingBox: drawing.boundingBox,
      feedbackText: toolMeta.feedbackText,
      recognition,
      tolerance,
    }));
    const nextState = applyToleranceState(updateSceneState(toolId, strokeRecord, sceneStateRef.current), tolerance);
    sceneStateRef.current = nextState;

    setStrokes((current) => [...current, strokeRecord]);
    setElementHistory((current) => [...current, ...generated]);
    setSceneState(nextState);
    setClearTraceSignal((value) => value + 1);
    setLiveResponses((current) => current.filter((item) => performance.now() - (item.createdAt || 0) < 1800).slice(-10));
    setRecognitionProcess((current) => ({
      ...current,
      phase: 'resolved',
      finalToolId: toolId,
      finalToolLabel: toolMeta.label,
      reason: recognition.reason,
      confidence: recognition.confidence,
      topK: (recognition.alternatives || []).slice(0, 5),
      sceneAllowed: gardenDay.tools.includes(toolId),
      fallbackLine: recognition.reason === 'stroke-rule'
        ? 'model top-k not allowed in this scene; stroke rules used'
        : null,
      crowded: tolerance.crowded,
      rasterPreviewUrl: rasterPreview,
    }));
    setFeedback(createRecognitionFeedback(recognition, toolMeta, nextState, recentTools, tolerance));
    playElementTone(toolId, drawing.speedAvg, muted);
  }

  function clearPendingDrawingTimer() {
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }

  function clearPendingDrawingSession() {
    clearPendingDrawingTimer();
    pendingStrokeSessionRef.current = [];
  }

  function handleStrokeMove(event) {
    if (event.phase === 'end') return;
    const selected = selectedToolRef.current;
    if (!selected) {
      setRecognitionProcess((current) => ({
        ...current,
        phase: current.phase === 'idle' ? 'drawing' : current.phase,
        selectedToolId: null,
        selectedToolLabel: null,
      }));
      return;
    }
    const toolMeta = getToolElement(selected);
    setRecognitionProcess((current) => ({
      ...current,
      phase: current.phase === 'idle' ? 'drawing' : current.phase,
      selectedToolId: selected,
      selectedToolLabel: toolMeta.label,
    }));
  }

  function selectTool(toolId) {
    if (!toolId) {
      setSelectedTool(null);
      selectedToolRef.current = null;
      setRecognitionProcess((current) => ({
        ...current,
        phase: 'idle',
        selectedToolId: null,
        selectedToolLabel: null,
        finalToolId: null,
        finalToolLabel: null,
        reason: null,
      }));
      setFeedback('自由画打开了。');
      return;
    }
    const toolMeta = getToolElement(toolId);
    selectedToolRef.current = toolId;
    setSelectedTool(toolId);
    setRecognitionProcess((current) => ({
      ...current,
      phase: 'idle',
      selectedToolId: toolId,
      selectedToolLabel: toolMeta.label,
      finalToolId: null,
      finalToolLabel: null,
      reason: null,
    }));
    setFeedback(`当前选择：${toolMeta.label || '这个元素'}。`);
  }

  function enterBreath() {
    if (pendingStrokeSessionRef.current.length) {
      finalizePendingDrawing();
    }
    navigate('/breath');
  }

  function handleSettleGesture(gesture) {
    setSceneState((current) => {
      const nextState = applyGestureSettling(current, gesture);
      sceneStateRef.current = nextState;
      return nextState;
    });
  }

  function openDiary(entry) {
    const day = entry.day || 1;
    const nextDay = getGardenDay(day);
    setViewingDiaryId(entry.id);
    setSelectedDay(day);
    setSelectedScene(entry.mood || null);
    setSelectedTool(nextDay.tools[0] || 'seed');
    selectedToolRef.current = nextDay.tools[0] || 'seed';
    setEntryTool(null);
    setStrokes(entry.strokes || []);
    setElementHistory(entry.elementHistory || []);
    setLiveResponses([]);
    setRecognitionProcess(createRecognitionProcess(quickdrawCnnRef.current));
    const replayState = entry.sceneState || createInitialSceneState(entry.mood, day);
    sceneStateRef.current = replayState;
    setSceneState(replayState);
    setFeedback('可以轻轻回看这片花园。');
    setTitle(entry.title || `${nextDay.name}日记`);
    navigate('/breath');
  }

  function suggestLight() {
    setSceneState((current) => {
      const nextState = {
        ...current,
        sunlightWarmth: Math.min(1, (current.sunlightWarmth || 0) + 0.18),
        localWarmth: Math.min(1, (current.localWarmth || 0) + 0.18),
        companionLight: Math.min(1, (current.companionLight || 0) + 0.22),
        brightness: Math.min(0.96, (current.brightness || 0.72) + 0.06),
        fogOpacity: Math.max(0, (current.fogOpacity || 0) - 0.06),
        calmLevel: Math.min(1, (current.calmLevel || 0) + 0.04),
        gestureGlow: Math.min(1, Math.max(current.gestureGlow || 0, 0.88)),
        gesturePulse: Math.min(1, Math.max(current.gesturePulse || 0, 0.92)),
        gestureAction: 'cup_light',
      };
      sceneStateRef.current = nextState;
      return nextState;
    });
    setFeedback('小灯亮了一点，也可以继续自由画。');
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
      strokes: strokes.map(stripStrokeForDiary),
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

  function stripStrokeForDiary(stroke) {
    return {
      id: stroke.id,
      tool: stroke.tool,
      sourceStrokeIds: stroke.sourceStrokeIds || [],
      points: (stroke.points || []).map((point) => ({
        x: point.x,
        y: point.y,
        t: point.t,
        pressure: point.pressure,
      })),
      canvasWidth: stroke.canvasWidth,
      canvasHeight: stroke.canvasHeight,
      length: stroke.length,
      duration: stroke.duration,
      densityLocal: stroke.densityLocal,
      strokeCount: stroke.strokeCount,
      recognition: stroke.recognition,
      tolerance: stroke.tolerance,
    };
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
          <MoodPage
            selectedMood={selectedScene}
            selectedToolId={selectedTool}
            gardenDay={gardenDay}
            onSelectMood={chooseScene}
            onContinue={() => {
              if (!selectedScene) {
                setSelectedScene('color_path');
                setEntryTool(null);
                selectedToolRef.current = null;
                setSelectedTool(null);
              }
              navigate('/guide');
            }}
          />
        )}
        {route === '/guide' && (
          <GuidePage
            mood={mood}
            gardenDay={gardenDay}
            sceneState={sceneState}
            entryTool={entryTool}
            onChooseTool={(toolId) => {
              selectedToolRef.current = toolId;
              setSelectedTool(toolId);
              navigate('/garden');
            }}
            onFreeChoose={() => {
              selectedToolRef.current = null;
              setSelectedTool(null);
              navigate('/garden');
            }}
          />
        )}
        {route === '/garden' && (
          <CanvasPage
            mood={mood}
            gardenDay={gardenDay}
            sceneState={sceneState}
            activeTool={activeTool}
            selectedToolId={selectedTool}
            feedback={feedback}
            strokes={strokes}
            elementHistory={elementHistory}
            liveResponses={liveResponses}
            recognitionProcess={recognitionProcess}
            clearTraceSignal={clearTraceSignal}
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

function resolveDrawingTool(drawing, selectedToolId, availableTools, sceneState, models = {}) {
  if (selectedToolId && availableTools.includes(selectedToolId)) {
    const tool = getToolElement(selectedToolId);
    return {
      toolId: selectedToolId,
      recognition: {
        toolId: selectedToolId,
        label: tool.label,
        category: 'selected-intent',
        confidence: 1,
        lowConfidence: false,
        reason: 'selected-intent',
        alternatives: [],
        categoryMatches: [],
      },
    };
  }

  const cnnPrediction = pickSceneAllowedPrediction(classifyWithQuickDrawCnn(drawing, models.cnnModel), drawing, availableTools);
  const mappedCnnToolId = cnnPrediction?.toolId;
  if (mappedCnnToolId && cnnPrediction.confidence >= 0.16) {
    const tool = getToolElement(mappedCnnToolId);
    return {
      toolId: mappedCnnToolId,
      recognition: {
        toolId: mappedCnnToolId,
        label: tool.label,
        category: cnnPrediction.category,
        confidence: cnnPrediction.confidence,
        lowConfidence: cnnPrediction.confidence < 0.5,
        reason: 'quickdraw-cnn',
        alternatives: cnnPrediction.alternatives || [],
        categoryMatches: cnnPrediction.alternatives || [],
      },
    };
  }

  const modelPrediction = pickSceneAllowedPrediction(classifyWithQuickDrawModel(drawing, models.sketchModel), drawing, availableTools);
  const mappedModelToolId = modelPrediction?.toolId;
  if (mappedModelToolId && modelPrediction.confidence >= 0.24) {
    const tool = getToolElement(mappedModelToolId);
    return {
      toolId: mappedModelToolId,
      recognition: {
        toolId: mappedModelToolId,
        label: tool.label,
        category: modelPrediction.category,
        confidence: modelPrediction.confidence,
        lowConfidence: modelPrediction.confidence < 0.42,
        reason: 'quickdraw-model',
        alternatives: modelPrediction.alternatives || [],
        categoryMatches: modelPrediction.alternatives || [],
      },
    };
  }

  const fallbackToolId = inferToolFromStrokeRules(drawing, availableTools, sceneState);
  const tool = getToolElement(fallbackToolId);
  return {
    toolId: fallbackToolId,
    recognition: {
      toolId: fallbackToolId,
      label: tool.label,
      category: 'stroke-rule',
      confidence: 0.62,
      lowConfidence: false,
      reason: 'stroke-rule',
      alternatives: [],
      categoryMatches: [],
    },
  };
}

function pickSceneAllowedPrediction(prediction, drawing, availableTools) {
  if (!prediction) return null;
  const ranked = prediction.alternatives?.length ? prediction.alternatives : [prediction];
  for (const item of ranked) {
    const toolId = item.category
      ? mapQuickDrawCategoryToTool(item.category, drawing, availableTools)
      : (availableTools.includes(item.toolId) ? item.toolId : null);
    if (toolId) {
      return {
        ...item,
        toolId,
        alternatives: prediction.alternatives || [],
        modelType: prediction.modelType,
      };
    }
  }
  return null;
}

function createRasterPreview(drawing, size = 64) {
  const raster = rasterizeQuickDrawDrawing(drawing, size, {
    padding: size >= 64 ? 4 : 3,
    brushRadius: size >= 64 ? 1.1 : 0.85,
  });
  return rasterToDataUrl(raster, size, {
    background: '#fff8ea',
    ink: [46, 43, 39],
  });
}

function inferToolFromStrokeRules(drawing, availableTools, sceneState) {
  const length = Number(drawing.length || 0);
  const speed = Number(drawing.speedAvg || 0);
  const density = Number(drawing.densityLocal || 0);
  const direction = drawing.directionMain || drawing.direction;
  const closedness = Number(drawing.closedness || 0);
  const strokeCount = Number(drawing.strokeCount || 1);
  const clutter = Number(sceneState.visualClutter || 0);
  const compactness = getStrokeCompactness(drawing);

  const pointCount = Number(drawing.pointCount || 0);
  const highPointCrowding = pointCount > 760 && (strokeCount >= 3 || compactness > 3.6);
  const sceneIsAlreadyCrowded = clutter > 0.9 && (strokeCount >= 3 || pointCount > 360);
  if (strokeCount >= 6 || highPointCrowding || sceneIsAlreadyCrowded || (density > 0.82 && compactness > 4.8)) {
    return firstAvailable(availableTools, ['cloud', 'softWind', 'windLine', 'soilLine', 'shadow']) || 'cloud';
  }
  if ((speed > 0.58 && length > 120) || (length > 240 && ['right', 'left', 'mixed'].includes(direction))) {
    return firstAvailable(availableTools, ['windLine', 'wind', 'softWind', 'ribbon', 'cloud']) || 'windLine';
  }
  if (length < 90 && strokeCount >= 2) {
    return firstAvailable(availableTools, ['rainDrop', 'rain', 'dew', 'puddle']) || 'rainDrop';
  }
  if (direction === 'up' || (drawing.vectorY < -0.36 && length < 180)) {
    return firstAvailable(availableTools, ['grass', 'sprout', 'reed', 'seed']) || 'grass';
  }
  if (closedness > 0.48 || direction === 'loop') {
    return firstAvailable(availableTools, ['sunlight', 'sun', 'breathLight', 'lantern', 'flower', 'firstFlower', 'bud']) || 'sunlight';
  }
  return firstAvailable(availableTools, ['grass', 'rainDrop', 'windLine', 'sunlight', 'flower']) || 'grass';
}

function getCanvasTolerance(drawing, sceneState, hasSelectedIntent) {
  const density = Number(drawing.densityLocal || 0);
  const pointCount = Number(drawing.pointCount || 0);
  const strokeCount = Number(drawing.strokeCount || 1);
  const clutter = Number(sceneState.visualClutter || 0);
  const compactness = getStrokeCompactness(drawing);
  const highPointCrowding = pointCount > 760 && (strokeCount >= 3 || compactness > 3.6);
  const sceneIsAlreadyCrowded = clutter > 0.9 && (strokeCount >= 3 || pointCount > 360);
  const crowded = strokeCount >= 7 || highPointCrowding || sceneIsAlreadyCrowded || (density > 0.82 && compactness > 4.8);
  const maxPlacements = crowded ? (hasSelectedIntent ? 2 : 1) : 8;
  return {
    crowded,
    maxPlacements,
    traceOpacity: crowded ? 0.04 : 0.08,
    atmosphere: crowded ? (hasSelectedIntent ? 'soft-light' : 'mist') : null,
  };
}

function pickSingleFinalPlacement(placements, drawing, toolId) {
  if (!placements?.length) return null;
  const center = getDrawingCenter(drawing);
  const chosen = placements.reduce((best, placement) => (
    distanceToPoint(placement, center) < distanceToPoint(best, center) ? placement : best
  ), placements[0]);
  return {
    ...chosen,
    id: `${drawing.id || 'drawing'}-${toolId}-final`,
    appearDelay: 0,
    quickdrawPlacement: {
      ...(chosen.quickdrawPlacement || {}),
      count: 1,
      index: 0,
      selectedFrom: placements.length,
      finalSingle: true,
    },
  };
}

function getDrawingCenter(drawing) {
  const box = drawing.boundingBox || {};
  if (Number.isFinite(box.x) && Number.isFinite(box.y) && Number.isFinite(box.width) && Number.isFinite(box.height)) {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
  }
  const points = drawing.points || [];
  if (points.length) {
    return {
      x: points.reduce((sum, point) => sum + (Number(point.x) || 0), 0) / points.length,
      y: points.reduce((sum, point) => sum + (Number(point.y) || 0), 0) / points.length,
    };
  }
  return {
    x: (drawing.canvasWidth || 720) / 2,
    y: (drawing.canvasHeight || 540) / 2,
  };
}

function distanceToPoint(placement, point) {
  return Math.hypot((Number(placement?.x) || 0) - point.x, (Number(placement?.y) || 0) - point.y);
}

function getStrokeCompactness(drawing) {
  const bounds = drawing.boundingBox || {};
  const diagonal = Math.hypot(Number(bounds.width || 1), Number(bounds.height || 1)) || 1;
  return Number(drawing.length || 0) / diagonal;
}

function applyToleranceState(state, tolerance) {
  if (!tolerance?.crowded) return state;
  return {
    ...state,
    visualClutter: Math.min(1, (state.visualClutter || 0) + 0.03),
    fogOpacity: Math.min(0.3, (state.fogOpacity || 0) + 0.045),
    brightness: Math.min(0.96, (state.brightness || 0.72) + (tolerance.atmosphere === 'soft-light' ? 0.015 : 0)),
    calmLevel: Math.min(1, (state.calmLevel || 0) + 0.02),
  };
}

function firstAvailable(availableTools, candidates) {
  return candidates.find((toolId) => availableTools.includes(toolId));
}

function createRecognitionFeedback(recognition, toolMeta, sceneState, recentTools, tolerance = {}) {
  if (tolerance.crowded) {
    return '这片线条有点多，花园先把它们轻轻收好。';
  }
  if (recognition?.reason === 'selected-intent') {
    return `${toolMeta.label}来了。${getRecognitionSceneEffect(recognition.toolId) || createFeedback(recognition.toolId, sceneState, recentTools)}`;
  }
  if (recognition?.reason === 'stroke-rule') {
    return `${toolMeta.label}来了。${getRecognitionSceneEffect(recognition.toolId) || createFeedback(recognition.toolId, sceneState, recentTools)}`;
  }
  if (recognition?.reason === 'quickdraw-model' || recognition?.reason === 'quickdraw-cnn') {
    return `${toolMeta.label}来了。${getRecognitionSceneEffect(recognition.toolId) || createFeedback(recognition.toolId, sceneState, recentTools)}`;
  }
  const base = getRecognitionSceneEffect(recognition.toolId) || createFeedback(recognition.toolId, sceneState, recentTools);
  if (!recognition || recognition.reason === 'no-template') {
    return `我先把这笔整理成${toolMeta.label}。${base}`;
  }
  if (recognition.lowConfidence) {
    return `我从这笔里看见了一点${toolMeta.label}的样子，先把它整理成${toolMeta.label}。${base}`;
  }
  return `我看见它像${toolMeta.label}，已经整理成花园里的柔和图案。${base}`;
}

function getRecognitionSceneEffect(toolId) {
  const effects = {
    seed: '土地里多了一个小小的种子点。',
    memorySeed: '记忆小点留在了温室里。',
    grass: '地面长出了一小片绿色。',
    sunlight: '花园亮了一点，雾变薄了一点。',
    sun: '花园亮了一点，雾变薄了一点。',
    dew: '雨水落下来，土地喝到了一点水。',
    rain: '雨落下来，土地和水面都有了变化。',
    rainDrop: '雨滴落下来，土地和水面都有了变化。',
    soilLine: '地面多了清楚的土壤纹理。',
    flower: '花轻轻打开了一点。',
    firstFlower: '花轻轻打开了一点。',
    bud: '花苞轻轻打开了一点。',
    quietFlower: '夜色里的花轻轻亮了一点。',
    cloud: '天空里多了一朵慢慢移动的云。',
    windLine: '风线带动草和云轻轻动起来。',
    softWind: '轻风带动花园慢慢动起来。',
    windBell: '风铃线轻轻晃了一下。',
    ribbon: '彩带在空中轻轻飘起来。',
    waterLine: '水面多了一道流动的线。',
    ripple: '水面轻轻散开了一圈。',
    puddle: '地面出现一小片水洼和反光。',
    star: '星空里多了一点闪光。',
    firefly: '夜色里多了一点萤火。',
    moon: '夜色变得更安静。',
    moonbeam: '月光变亮，雾也轻了一点。',
    lantern: '局部暖光扩大了一点。',
    breathLight: '小角落暖了一点。',
    windowLight: '远处亮了一点。',
    mushroom: '地面冒出了一朵蘑菇。',
    bridge: '小桥和路径更连贯了。',
    stone: '石径更清楚了一点。',
    moss: '石头旁边柔软了一点。',
    smallTree: '角落里多了一点稳定的绿色。',
    signpost: '小路方向更清楚了一点。',
    shadow: '角落安静了一点。',
    rainbow: '天空出现一段清楚的多层彩虹。',
    constellationLine: '星光被轻轻连起来。',
    leafBoat: '叶船沿着水走了一小段。',
    floatingLeaf: '叶子被风轻轻带走。',
    snail: '小蜗牛慢慢爬出来。',
    snailTrail: '小蜗牛慢慢爬出来。',
    sprout: '土里冒出了一点新意。',
    reed: '岸边长高了一点。',
  };
  return effects[toolId] || '';
}

export default App;
