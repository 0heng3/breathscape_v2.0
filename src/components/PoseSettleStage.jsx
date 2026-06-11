import { Camera, CameraOff } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VISION_TASKS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const POSE_MODEL_CANDIDATES = [
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
];
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const DETECT_INTERVAL_MS = 66;
const EMIT_INTERVAL_MS = 120;
const UI_INTERVAL_MS = 160;
const GESTURE_LOCK_MS = 220;

const GUIDES = [
  {
    id: 'cup_light',
    title: '双手靠近',
    prompt: '把两只手放进视频里，再慢慢靠近。',
    matchLabel: '捧亮小灯',
  },
  {
    id: 'raise_soft',
    title: '慢慢抬手',
    prompt: '把手从胸前慢慢抬高，再轻轻停住。',
    matchLabel: '抬起暖光',
  },
  {
    id: 'one_hand_wind',
    title: '单手带风',
    prompt: '一只手慢慢左右移动，带动云和彩带。',
    matchLabel: '慢风经过',
  },
  {
    id: 'still_stand',
    title: '安静站住',
    prompt: '身体和双手轻轻停住，让花园慢下来。',
    matchLabel: '安静站住',
  },
];

const REST_GESTURE = {
  action: 'still_stand',
  confirmed: false,
  hold: 0.18,
  slow: 0.55,
  glow: 0.08,
  wind: 0,
  confidence: 0,
};

function PoseSettleStage({ children, onGesture, cameraDockTargetId = null }) {
  const videoRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const autoStartRef = useRef(false);
  const frameRef = useRef(0);
  const streamRef = useRef(null);
  const lastFrameRef = useRef(null);
  const lastDetectRef = useRef(0);
  const lastUiRef = useRef(0);
  const lastEmitRef = useRef(0);
  const stableRef = useRef({ id: 'none', since: 0, count: 0 });
  const smoothedRef = useRef({ glow: 0.08, hold: 0.18, slow: 0.55, wind: 0 });
  const guideEmitTimersRef = useRef([]);

  const [cameraState, setCameraState] = useState('idle');
  const [modelLabel, setModelLabel] = useState('手部+姿势');
  const [guideIndex, setGuideIndex] = useState(0);
  const [poseInfo, setPoseInfo] = useState({
    label: '等待摄像头',
    confidence: 0,
    hint: '打开摄像头后，跟着动作卡慢慢做。',
  });
  const guide = useMemo(() => GUIDES[guideIndex % GUIDES.length], [guideIndex]);
  const [dockTarget, setDockTarget] = useState(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      guideEmitTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      guideEmitTimersRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());
      poseLandmarkerRef.current?.close?.();
      handLandmarkerRef.current?.close?.();
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || !cameraDockTargetId) {
      setDockTarget(null);
      return;
    }
    setDockTarget(document.getElementById(cameraDockTargetId));
  }, [cameraDockTargetId]);

  useEffect(() => {
    if (!dockTarget || cameraState !== 'idle' || autoStartRef.current) return;
    autoStartRef.current = true;
    startCamera();
  }, [dockTarget, cameraState]);

  useEffect(() => {
    if (cameraState !== 'ready') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, [cameraState, dockTarget]);

  async function startCamera() {
    try {
      setCameraState('loading');
      const [{ FilesetResolver, PoseLandmarker, HandLandmarker }, stream] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 960 },
            height: { ideal: 720 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user',
          },
          audio: false,
        }),
      ]);

      const resolver = await FilesetResolver.forVisionTasks(VISION_TASKS_URL);
      const models = await createVisionModels({ PoseLandmarker, HandLandmarker, resolver });
      poseLandmarkerRef.current = models.pose;
      handLandmarkerRef.current = models.hand;
      setModelLabel(models.label);

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraState('ready');
      setPoseInfo({ label: '正在寻找动作', confidence: 0.25, hint: guide.prompt });
      detectPose();
    } catch (error) {
      console.error(error);
      setCameraState('blocked');
      setPoseInfo({
        label: '摄像头没有打开',
        confidence: 0,
        hint: '也可以先跟着小灯呼吸，稍后再试。',
      });
    }
  }

  function stopCamera() {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    lastFrameRef.current = null;
    stableRef.current = { id: 'none', since: 0, count: 0 };
    smoothedRef.current = { glow: 0.08, hold: 0.18, slow: 0.55, wind: 0 };
    setCameraState('idle');
    setPoseInfo({ label: '等待摄像头', confidence: 0, hint: '摄像头已关闭。' });
    onGesture?.(REST_GESTURE);
  }

  function detectPose(now = performance.now()) {
    const video = videoRef.current;
    if (!video || cameraState === 'blocked') return;

    if (video.readyState >= 2 && now - lastDetectRef.current >= DETECT_INTERVAL_MS) {
      lastDetectRef.current = now;
      const poseResult = poseLandmarkerRef.current?.detectForVideo(video, now);
      const handResult = handLandmarkerRef.current?.detectForVideo(video, now);
      const frame = normalizeVisionFrame(poseResult, handResult);

      const estimate = estimateGesture(frame, lastFrameRef.current, guide.id, stableRef.current, now);
      lastFrameRef.current = frame;
      stableRef.current = estimate.stable;

      const nextValues = smoothGesture(smoothedRef.current, estimate.values, estimate.confirmed ? 0.26 : 0.12);
      smoothedRef.current = nextValues;

      if (now - lastEmitRef.current >= EMIT_INTERVAL_MS) {
        lastEmitRef.current = now;
        onGesture?.({
          ...nextValues,
          action: estimate.id,
          confirmed: estimate.confirmed,
          confidence: estimate.confidence,
        });
      }
      if (now - lastUiRef.current >= UI_INTERVAL_MS) {
        lastUiRef.current = now;
        setPoseInfo({
          label: estimate.confirmed ? estimate.label : estimate.pendingLabel,
          confidence: estimate.confidence,
          hint: estimate.confirmed ? estimate.hint : guide.prompt,
        });
      }
    }

    frameRef.current = requestAnimationFrame(detectPose);
  }

  return (
    <div className={`pose-settle-stage camera-${cameraState}`}>
      {dockTarget
        ? createPortal(
            <div className={`pose-control-dock pose-control-dock--stacked camera-${cameraState}`}>
              <div className="pose-camera-shell">
                <video className="pose-camera-feed" ref={videoRef} playsInline muted autoPlay aria-hidden="true" />
                {cameraState !== 'ready' && (
                  <div className="pose-camera-placeholder" aria-hidden="true">
                    <Camera size={18} />
                    <span>摄像头预览</span>
                  </div>
                )}
              </div>
              <div className="pose-guide-card" aria-label="动作提示">
                {GUIDES.map((item, index) => (
                  <button
                    className={item.id === guide.id ? 'active' : ''}
                    type="button"
                    onClick={() => {
                      setGuideIndex(index);
                      emitGuideGesture(item.id, true);
                    }}
                    key={item.id}
                  >
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
              <div className="pose-camera-panel">
                <div>
                  <p className="pose-camera-title">{guide.matchLabel} · {modelLabel}</p>
                  <p>{poseInfo.hint}</p>
                  <div className="pose-detection-readout" aria-live="polite">
                    <span>{poseInfo.label}</span>
                    <i style={{ '--confidence': poseInfo.confidence }} />
                  </div>
                </div>
                {cameraState === 'ready' ? (
                  <button type="button" onClick={stopCamera} aria-label="关闭摄像头">
                    <CameraOff size={18} />
                  </button>
                ) : (
                  <button type="button" onClick={startCamera} disabled={cameraState === 'loading'} aria-label="打开摄像头">
                    <Camera size={18} />
                  </button>
                )}
              </div>
            </div>,
            dockTarget,
          )
          : (
            <div className={`pose-control-dock pose-control-dock--stacked camera-${cameraState}`}>
              <div className="pose-camera-shell">
                <video className="pose-camera-feed" ref={videoRef} playsInline muted autoPlay aria-hidden="true" />
                {cameraState !== 'ready' && (
                  <div className="pose-camera-placeholder" aria-hidden="true">
                    <Camera size={18} />
                    <span>摄像头预览</span>
                  </div>
                )}
              </div>
              <div className="pose-guide-card" aria-label="动作提示">
                {GUIDES.map((item, index) => (
                  <button
                    className={item.id === guide.id ? 'active' : ''}
                    type="button"
                    onClick={() => {
                      setGuideIndex(index);
                      emitGuideGesture(item.id, true);
                    }}
                    key={item.id}
                  >
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
              <div className="pose-camera-panel">
                <div>
                  <p className="pose-camera-title">{guide.matchLabel} · {modelLabel}</p>
                  <p>{poseInfo.hint}</p>
                  <div className="pose-detection-readout" aria-live="polite">
                    <span>{poseInfo.label}</span>
                    <i style={{ '--confidence': poseInfo.confidence }} />
                  </div>
                </div>
                {cameraState === 'ready' ? (
                  <button type="button" onClick={stopCamera} aria-label="关闭摄像头">
                    <CameraOff size={18} />
                  </button>
                ) : (
                  <button type="button" onClick={startCamera} disabled={cameraState === 'loading'} aria-label="打开摄像头">
                    <Camera size={18} />
                  </button>
                )}
              </div>
            </div>
          )}
      <div className="pose-garden-frame">{children}</div>
    </div>
  );

  function emitGuideGesture(id, confirmed = false) {
    const preset = createGesturePreset(id, { wind: id === 'one_hand_wind' ? 0.8 : 0 });
    const gesture = {
      ...preset.values,
      action: id,
      confirmed,
      confidence: confirmed ? 1 : 0.62,
      manualBoost: confirmed,
    };
    smoothedRef.current = preset.values;
    guideEmitTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    guideEmitTimersRef.current = [];
    [0, 140, 300, 480].forEach((delay, index) => {
      const emit = () => onGesture?.({
        ...gesture,
        confidence: Math.max(0.76, gesture.confidence - index * 0.05),
      });
      if (delay === 0) {
        emit();
        return;
      }
      const timerId = window.setTimeout(emit, delay);
      guideEmitTimersRef.current.push(timerId);
    });
    setPoseInfo({
      label: preset.label,
      confidence: gesture.confidence,
      hint: preset.hint,
    });
  }
}

async function createVisionModels({ PoseLandmarker, HandLandmarker, resolver }) {
  const [poseModel, handModel] = await Promise.all([
    createPoseLandmarker(PoseLandmarker, resolver),
    createHandLandmarker(HandLandmarker, resolver),
  ]);
  return {
    pose: poseModel.instance,
    hand: handModel.instance,
    label: handModel.instance ? `手部关键点 + ${poseModel.label}` : poseModel.label,
  };
}

async function createPoseLandmarker(PoseLandmarker, resolver) {
  const attempts = [];
  for (const modelAssetPath of POSE_MODEL_CANDIDATES) {
    for (const delegate of ['GPU', 'CPU']) {
      try {
        const instance = await PoseLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.38,
          minPosePresenceConfidence: 0.38,
          minTrackingConfidence: 0.45,
        });
        return {
          instance,
          label: modelAssetPath.includes('full') ? '姿势 Full' : '姿势 Lite',
        };
      } catch (error) {
        attempts.push(`${modelAssetPath} ${delegate}: ${error?.message || error}`);
      }
    }
  }
  throw new Error(attempts.join('\n'));
}

async function createHandLandmarker(HandLandmarker, resolver) {
  for (const delegate of ['GPU', 'CPU']) {
    try {
      return {
        instance: await HandLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.34,
          minHandPresenceConfidence: 0.34,
          minTrackingConfidence: 0.42,
        }),
      };
    } catch (error) {
      console.warn('Hand landmarker unavailable:', error);
    }
  }
  return { instance: null };
}

function normalizeVisionFrame(poseResult, handResult) {
  const pose = poseResult?.landmarks?.[0] || null;
  const hands = (handResult?.landmarks || []).map((landmarks, index) => {
    const handedness = handResult?.handedness?.[index]?.[0];
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];
    const middleTip = landmarks[12];
    const center = averagePoint([wrist, indexMcp, pinkyMcp, middleTip]);
    return {
      landmarks,
      center,
      wrist,
      label: handedness?.categoryName || `hand-${index}`,
      score: handedness?.score || 0.75,
    };
  });
  return { pose, hands };
}

function estimateGesture(frame, previous, guideId, stable, now) {
  const handEstimate = estimateFromHands(frame, previous);
  const poseEstimate = estimateFromPose(frame, previous);
  const source = handEstimate.confidence >= 0.28 ? handEstimate : poseEstimate;

  if (source.id === 'low_visibility') {
    return {
      ...source,
      pendingLabel: '还没有看清动作',
      stable: { id: 'low_visibility', since: now, count: 0 },
    };
  }

  const scores = { ...source.scores };
  if (guideId === 'cup_light') scores.cup_light += source.handCount >= 2 ? 0.1 : 0.02;
  if (guideId === 'raise_soft') scores.raise_soft += 0.08;
  if (guideId === 'one_hand_wind') scores.one_hand_wind += source.handCount >= 1 ? 0.1 : 0.02;
  if (guideId === 'still_stand') scores.still_stand += source.motion < 0.012 ? 0.08 : 0;

  const id = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const confidence = clamp(scores[id], 0, 1);
  const stableCount = stable.id === id ? stable.count + 1 : 1;
  const stableSince = stable.id === id ? stable.since : now;
  const confirmed = confidence > 0.28 && stableCount >= 2 && now - stableSince >= GESTURE_LOCK_MS;
  const preset = createGesturePreset(id, source);

  return {
    id,
    label: preset.label,
    pendingLabel: source.handCount ? `看到${source.handCount}只手，动作在靠近` : '动作还在靠近',
    hint: guideId === id ? preset.hint : `看到的是${preset.label}，也可以继续试试动作卡。`,
    confidence,
    confirmed,
    stable: { id, since: stableSince, count: stableCount },
    values: confirmed ? preset.values : {
      glow: preset.values.glow * 0.58,
      hold: preset.values.hold * 0.64,
      slow: preset.values.slow,
      wind: preset.values.wind * 0.56,
    },
  };
}

function estimateFromHands(frame, previous) {
  const hands = frame.hands || [];
  if (!hands.length) return { id: 'low_visibility', confidence: 0, values: REST_GESTURE };

  const previousHands = previous?.hands || [];
  const motion = getHandMotion(hands, previousHands);
  const stillness = clamp(1 - motion * 22, 0, 1);
  const first = hands[0];
  const second = hands[1];
  const handCount = hands.length;
  const twoHandDistance = second ? distance(first.center, second.center) : 1;
  const closeHands = handCount >= 2 && twoHandDistance < 0.24;
  const bothHandsMid = handCount >= 2 && first.center.y < 0.68 && second.center.y < 0.68;
  const raised = hands.some((hand) => hand.center.y < 0.48 || hand.wrist.y < 0.5);
  const horizontalTravel = Math.abs(getDominantHandTravel(hands, previousHands).x);
  const wind = clamp(getDominantHandTravel(hands, previousHands).x * 5.8 || (first.center.x - 0.5) * 2, -1, 1);
  const handQuality = clamp(hands.reduce((sum, hand) => sum + hand.score, 0) / handCount, 0, 1);

  return {
    confidence: handQuality,
    handCount,
    motion,
    wind,
    scores: {
      cup_light: clamp((closeHands ? 0.72 : 0) + (1 - twoHandDistance) * 0.28 + stillness * 0.16, 0, 1) * handQuality,
      raise_soft: clamp((raised ? 0.58 : 0) + (bothHandsMid ? 0.18 : 0) + stillness * 0.14, 0, 1) * handQuality,
      one_hand_wind: clamp(horizontalTravel * 28 + (handCount === 1 ? 0.2 : 0.06) + (1 - stillness) * 0.16, 0, 1) * handQuality,
      still_stand: clamp(stillness * 0.82 + (handCount >= 1 ? 0.1 : 0), 0, 1) * handQuality,
    },
  };
}

function estimateFromPose(frame, previous) {
  const landmarks = frame.pose;
  const previousPose = previous?.pose;
  if (!landmarks?.length) {
    return {
      id: 'low_visibility',
      confidence: 0,
      label: '还没有看清动作',
      hint: '把上半身和双手放进视频里，再慢慢做动作。',
      values: { glow: 0.08, hold: 0.18, slow: 0.55, wind: 0 },
    };
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const shoulderCenter = midpoint(leftShoulder, rightShoulder);
  const handCenter = midpoint(leftWrist, rightWrist);
  const torsoWidth = Math.max(0.16, distance(leftShoulder, rightShoulder));
  const visibility = averageVisibility([leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist]);
  const motion = previousPose ? averageMotion(landmarks, previousPose) : 0.03;
  const stillness = clamp(1 - motion * 16, 0, 1);
  const handDistance = distance(leftWrist, rightWrist);
  const relativeHandDistance = handDistance / torsoWidth;
  const handsTogether = relativeHandDistance < 1.05 && Math.abs(handCenter.x - shoulderCenter.x) < torsoWidth * 0.72;
  const leftRaised = leftWrist.y < leftShoulder.y - 0.035;
  const rightRaised = rightWrist.y < rightShoulder.y - 0.035;
  const bothRaised = leftRaised && rightRaised;
  const oneHandRaised = leftRaised !== rightRaised;
  const travel = previousPose ? wristTravel(landmarks, previousPose) : { x: 0, y: 0, amount: 0 };
  const horizontalTravel = Math.abs(travel.x);
  const wind = clamp((travel.x || handCenter.x - shoulderCenter.x) * 4.2, -1, 1);

  return {
    confidence: visibility,
    handCount: 0,
    motion,
    wind,
    scores: {
      cup_light: clamp((handsTogether ? 0.6 : 0) + (1.18 - relativeHandDistance) * 0.22 + stillness * 0.14, 0, 1) * visibility,
      raise_soft: clamp((bothRaised ? 0.68 : 0) + stillness * 0.16 + Math.max(0, 0.55 - handCenter.y) * 0.36, 0, 1) * visibility,
      one_hand_wind: clamp(horizontalTravel * 20 + (oneHandRaised ? 0.25 : 0) + (1 - stillness) * 0.14, 0, 1) * visibility,
      still_stand: clamp(stillness * 0.86 + (handsTogether || bothRaised ? 0 : 0.12), 0, 1) * visibility,
    },
  };
}

function createGesturePreset(id, source) {
  const wind = clamp(source.wind || 0, -1, 1);
  const presets = {
    cup_light: {
      label: '捧亮小灯',
      hint: '双手靠近，小灯和光晕会慢慢变亮。',
      values: { glow: 0.96, hold: 0.58, slow: 0.78, wind: 0 },
    },
    raise_soft: {
      label: '抬起暖光',
      hint: '手慢慢抬起，花园上方会多一点暖光。',
      values: { glow: 0.7, hold: 0.42, slow: 0.7, wind: wind * 0.16 },
    },
    one_hand_wind: {
      label: '慢风经过',
      hint: '手在移动，云、风带和花草会跟着方向慢慢动。',
      values: { glow: 0.16, hold: 0.1, slow: 0.42, wind: wind || 0.5 },
    },
    still_stand: {
      label: '安静站住',
      hint: '动作停住，花园会轻轻收慢。',
      values: { glow: 0.2, hold: 0.76, slow: 0.94, wind: 0 },
    },
  };
  return presets[id] || presets.still_stand;
}

function getHandMotion(hands, previousHands) {
  if (!previousHands.length) return 0.02;
  const motions = hands.map((hand) => {
    const previous = findPreviousHand(hand, previousHands);
    return previous ? distance(hand.center, previous.center) : 0.03;
  });
  return motions.reduce((sum, item) => sum + item, 0) / Math.max(1, motions.length);
}

function getDominantHandTravel(hands, previousHands) {
  let best = { x: 0, y: 0, amount: 0 };
  hands.forEach((hand) => {
    const previous = findPreviousHand(hand, previousHands);
    if (!previous) return;
    const x = hand.center.x - previous.center.x;
    const y = hand.center.y - previous.center.y;
    const amount = Math.hypot(x, y);
    if (amount > best.amount) best = { x, y, amount };
  });
  return best;
}

function findPreviousHand(hand, previousHands) {
  return previousHands.find((item) => item.label === hand.label) || previousHands[0];
}

function smoothGesture(current, target, amount) {
  return {
    glow: lerp(current.glow, target.glow, amount),
    hold: lerp(current.hold, target.hold, amount),
    slow: lerp(current.slow, target.slow, amount),
    wind: lerp(current.wind, target.wind, amount * 0.7),
  };
}

function averagePoint(points) {
  const valid = points.filter(Boolean);
  return {
    x: valid.reduce((sum, point) => sum + point.x, 0) / valid.length,
    y: valid.reduce((sum, point) => sum + point.y, 0) / valid.length,
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function wristTravel(current, previous) {
  const left = {
    x: current[15].x - previous[15].x,
    y: current[15].y - previous[15].y,
  };
  const right = {
    x: current[16].x - previous[16].x,
    y: current[16].y - previous[16].y,
  };
  const chosen = Math.hypot(left.x, left.y) > Math.hypot(right.x, right.y) ? left : right;
  return {
    ...chosen,
    amount: Math.hypot(chosen.x, chosen.y),
  };
}

function averageMotion(current, previous) {
  const indexes = [11, 12, 13, 14, 15, 16];
  const total = indexes.reduce((sum, index) => sum + distance(current[index], previous[index]), 0);
  return total / indexes.length;
}

function averageVisibility(points) {
  const total = points.reduce((sum, point) => sum + (Number.isFinite(point.visibility) ? point.visibility : 0.72), 0);
  return total / points.length;
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default PoseSettleStage;
