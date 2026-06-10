import { ArrowLeft, BookOpen, Volume2, VolumeX } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
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
  const [feedback, setFeedback] = useState('直接在画布上自由画，系统会识别并整理成 QuickDraw 风格。');
  const [diaries, setDiaries] = useState(loadDiaries);
  const [viewingDiaryId, setViewingDiaryId] = useState(null);
  const [title, setTitle] = useState('今天的小花园');
  const [muted, setMuted] = useState(false);

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
    setFeedback(`${nextDay.name}已经准备好了。直接画你想到的小元素，我会先识别再整理。`);
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

    const recognition = recognizeSketchTool(analyzed, gardenDay.tools);
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
    // During drawing, only the temporary black stroke is shown by DrawingCanvas.
    // Recognition and QuickDraw element generation happen on pointer up.
  }

  function selectTool(toolId) {
    const toolMeta = getToolElement(toolId);
    setSelectedTool(toolId);
    setFeedback(`${toolMeta.label || '这个元素'}已作为识别参考。你仍然可以自由画，系统会根据笔迹识别结果生成元素。`);
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

function createRecognitionFeedback(recognition, toolMeta, sceneState, recentTools) {
  const base = getRecognitionSceneEffect(recognition.toolId) || createFeedback(recognition.toolId, sceneState, recentTools);
  if (!recognition || recognition.reason === 'no-template') {
    return `我先把这笔整理成${toolMeta.label}。${base}`;
  }
  if (recognition.lowConfidence) {
    return `我从这笔里看见了一点${toolMeta.label}的样子，先把它整理成${toolMeta.label}。${base}`;
  }
  return `我看见它像${toolMeta.label}，已经整理成 QuickDraw 风格。${base}`;
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
    soilLine: '地面多了一些柔和的土壤纹理。',
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
    puddle: '地面多了一点柔和反光。',
    star: '星空里多了一点闪光。',
    firefly: '夜色里多了一点萤火。',
    moon: '夜色变得更安静。',
    moonbeam: '月光让雾变轻了一点。',
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
    rainbow: '天空多了一道柔和的彩虹。',
    constellationLine: '星光被轻轻连起来。',
    leafBoat: '叶船沿着水走了一小段。',
    floatingLeaf: '叶子被风轻轻带走。',
    snailTrail: '蜗牛线慢慢留下来。',
    sprout: '土里冒出了一点新意。',
    reed: '岸边长高了一点。',
  };
  return effects[toolId] || '';
}

export default App;
