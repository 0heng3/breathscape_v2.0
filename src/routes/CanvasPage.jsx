import { Volume2 } from 'lucide-react';
import React from 'react';
import DrawingCanvas from '../components/DrawingCanvas';
import ElementToolBar from '../components/ElementToolBar';
import FeedbackPanel from '../components/FeedbackPanel';
import GardenStage from '../components/GardenStage';

function CanvasPage({
  mood,
  gardenDay,
  sceneState,
  activeTool,
  feedback,
  strokes,
  elementHistory,
  liveResponses,
  onSelectTool,
  onStroke,
  onStrokeMove,
  onFinish,
  onSuggest,
}) {
  return (
    <section className="screen canvas-page page-enter">
      <div className="garden-workbar">
        <p>{feedback || '直接画你想到的小元素，系统会先识别，再整理成 QuickDraw 风格。'}</p>
      </div>
      <ElementToolBar activeToolId={activeTool.id} onSelectTool={onSelectTool} toolOrder={gardenDay.tools} />
      <div className="canvas-stage">
        <GardenStage mood={mood} gardenDay={gardenDay} sceneState={sceneState} elementHistory={elementHistory} liveResponses={liveResponses}>
          <DrawingCanvas activeTool={activeTool} onStroke={onStroke} onStrokeMove={onStrokeMove} />
          <div className="canvas-caption">
            <Volume2 size={18} />
            <span>直接画出来；下方图标是今天可识别的元素参考，不需要先点选。</span>
          </div>
        </GardenStage>
      </div>
      <div className="feedback-dock">
        <FeedbackPanel
          feedback={feedback}
          sceneState={sceneState}
          activeTool={activeTool}
          canFinish={strokes.length > 0}
          onFinish={onFinish}
          onSuggest={onSuggest}
        />
      </div>
    </section>
  );
}

export default CanvasPage;
