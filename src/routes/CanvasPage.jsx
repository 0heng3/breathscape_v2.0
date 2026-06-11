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
  selectedToolId,
  feedback,
  strokes,
  elementHistory,
  liveResponses,
  clearTraceSignal,
  onSelectTool,
  onStroke,
  onStrokeMove,
  onFinish,
  onSuggest,
}) {
  return (
    <section className="screen canvas-page page-enter">
      <ElementToolBar activeToolId={selectedToolId} onSelectTool={onSelectTool} toolOrder={gardenDay.tools} />
      <div className="canvas-stage">
        <GardenStage mood={mood} gardenDay={gardenDay} sceneState={sceneState} elementHistory={elementHistory} liveResponses={liveResponses}>
          <DrawingCanvas activeTool={activeTool} onStroke={onStroke} onStrokeMove={onStrokeMove} clearTraceSignal={clearTraceSignal} />
          <div className="canvas-caption">
            <Volume2 size={18} />
            <span>可以连续画多笔；停下来后，我会把整组线条一起识别整理。</span>
          </div>
        </GardenStage>
      </div>
      <div className="feedback-dock">
        <FeedbackPanel
          feedback={feedback}
          sceneState={sceneState}
          activeTool={activeTool}
          selectedToolId={selectedToolId}
          canFinish={strokes.length > 0}
          onFinish={onFinish}
          onSuggest={onSuggest}
        />
      </div>
    </section>
  );
}

export default CanvasPage;
