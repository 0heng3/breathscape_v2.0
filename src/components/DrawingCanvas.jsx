import React, { useEffect, useRef } from 'react';
import { getLocalStageRect, getStagePoint } from '../utils/coordinateUtils';

function DrawingCanvas({ activeTool, onStroke, onStrokeMove, clearTraceSignal = 0 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(null);
  const traces = useRef([]);
  const canvasSize = useRef({ width: 0, height: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    traces.current = [];
    redrawTraces(canvasRef.current, traces.current, performance.now());
  }, [clearTraceSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvasSize.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      redrawTraces(canvas, traces.current, performance.now());
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    function tick(now) {
      redrawTraces(canvasRef.current, traces.current, now, drawing.current);
      traces.current = traces.current.filter((trace) => trace.holdUntilRecognition || now - trace.createdAt < trace.fadeDuration);
      if (traces.current.length || drawing.current) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
      }
    }

    if ((traces.current.length || drawing.current) && !rafRef.current) {
      rafRef.current = window.requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  });

  function getPoint(event) {
    const stageEl = canvasRef.current.closest('.garden-stage') || canvasRef.current;
    return getStagePoint(event, stageEl);
  }

  function start(event) {
    event.preventDefault();
    try {
      canvasRef.current.setPointerCapture?.(event.pointerId);
    } catch {
      // Some synthetic or interrupted pointer streams cannot be captured.
    }
    const point = getPoint(event);
    redrawTraces(canvasRef.current, traces.current, point.t, drawing.current);
    drawing.current = {
      id: crypto.randomUUID(),
      tool: activeTool.id,
      color: '#111111',
      points: [point],
      started: point.t,
      length: 0,
    };
    onStrokeMove?.({
      id: drawing.current.id,
      phase: 'start',
      tool: activeTool.id,
      point,
      points: drawing.current.points.slice(),
      previous: point,
      speed: 0,
      distance: 0,
      canvasWidth: canvasSize.current.width,
      canvasHeight: canvasSize.current.height,
      stageRect: getLocalStageRect(canvasRef.current.closest('.garden-stage') || canvasRef.current),
    });
  }

  function move(event) {
    if (!drawing.current) return;
    event.preventDefault();
    const point = getPoint(event);
    const previous = drawing.current.points[drawing.current.points.length - 1];
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    const deltaTime = Math.max(1, point.t - previous.t);
    if (distance < 0.7 && deltaTime < 18) return;
    const speed = Math.min(1, distance / deltaTime / 1.2);
    drawing.current.length += distance;
    drawing.current.points.push(point);

    redrawTraces(canvasRef.current, traces.current, point.t, drawing.current);
    onStrokeMove?.({
      id: drawing.current.id,
      phase: 'move',
      tool: activeTool.id,
      point,
      points: drawing.current.points.slice(),
      previous,
      speed,
      distance,
      pressure: point.pressure,
      canvasWidth: canvasSize.current.width,
      canvasHeight: canvasSize.current.height,
      stageRect: getLocalStageRect(canvasRef.current.closest('.garden-stage') || canvasRef.current),
    });
  }

  function end(event) {
    if (!drawing.current) return;
    try {
      canvasRef.current.releasePointerCapture?.(event.pointerId);
    } catch {
      // Matching capture may not exist after cancellation or synthetic input.
    }
    const stroke = drawing.current;
    drawing.current = null;
    if (stroke.points.length < 2) {
      const point = stroke.points[0];
      const synthetic = {
        x: point.x + 12,
        y: point.y + 4,
        t: point.t + 120,
        pressure: point.pressure,
      };
      stroke.points.push(synthetic);
      stroke.length = Math.hypot(synthetic.x - point.x, synthetic.y - point.y);
    }
    const rawTrace = {
      ...stroke,
      createdAt: performance.now(),
      fadeDuration: 420,
      holdUntilRecognition: true,
    };
    traces.current.push(rawTrace);
    redrawTraces(canvasRef.current, traces.current, rawTrace.createdAt);
    onStrokeMove?.({
      id: stroke.id,
      phase: 'end',
      tool: stroke.tool,
      point: stroke.points[stroke.points.length - 1],
      points: stroke.points.slice(),
      previous: stroke.points[stroke.points.length - 2],
      speed: 0,
      distance: 0,
      canvasWidth: canvasSize.current.width,
      canvasHeight: canvasSize.current.height,
      stageRect: getLocalStageRect(canvasRef.current.closest('.garden-stage') || canvasRef.current),
    });
    onStroke({
      ...stroke,
      canvasWidth: canvasSize.current.width,
      canvasHeight: canvasSize.current.height,
      stageRect: getLocalStageRect(canvasRef.current.closest('.garden-stage') || canvasRef.current),
      duration: performance.now() - stroke.started,
      createdAt: Date.now(),
    });

    if (!rafRef.current) {
      rafRef.current = window.requestAnimationFrame(function tick(now) {
        redrawTraces(canvasRef.current, traces.current, now, drawing.current);
        traces.current = traces.current.filter((trace) => trace.holdUntilRecognition || now - trace.createdAt < trace.fadeDuration);
        if (traces.current.length || drawing.current) {
          rafRef.current = window.requestAnimationFrame(tick);
        } else {
          rafRef.current = 0;
        }
      });
    }
  }

  return (
    <canvas
      className="drawing-canvas"
      ref={canvasRef}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      aria-label={`当前笔刷：${activeTool.name}`}
    />
  );
}

function redrawTraces(canvas, items, now = performance.now(), activeDrawing = null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.filter = 'blur(0.1px)';
  items.forEach((trace) => {
    const age = now - (trace.createdAt || now);
    const fade = trace.holdUntilRecognition ? 0.48 : clamp((1 - age / (trace.fadeDuration || 420)) * 0.08, 0.008, 0.06);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = trace.holdUntilRecognition ? 2.6 : 2.4;
    ctx.globalAlpha = fade;
    drawSmoothPath(ctx, trace.points);
    ctx.stroke();
  });
  if (activeDrawing?.points?.length) {
    ctx.filter = 'none';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.6;
    ctx.globalAlpha = 0.68;
    drawSmoothPath(ctx, activeDrawing.points);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSmoothPath(ctx, points) {
  if (!points.length) return;
  const smoothed = smoothPoints(points);
  ctx.beginPath();
  ctx.moveTo(smoothed[0].x, smoothed[0].y);
  for (let index = 1; index < smoothed.length - 1; index += 1) {
    const current = smoothed[index];
    const next = smoothed[index + 1];
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  const last = smoothed[smoothed.length - 1];
  if (smoothed.length > 1) {
    ctx.lineTo(last.x, last.y);
  }
}

function smoothPoints(points) {
  if (points.length < 3) return points;
  const smoothed = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    smoothed.push({
      x: (points[index - 1].x + points[index].x + points[index + 1].x) / 3,
      y: (points[index - 1].y + points[index].y + points[index + 1].y) / 3,
    });
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default DrawingCanvas;
