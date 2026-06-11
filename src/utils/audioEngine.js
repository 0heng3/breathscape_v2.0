let audioContext;
const liveLastPlayedAt = {};

const maxGain = {
  wind: 0.12,
  rain: 0.11,
  water: 0.1,
  plant: 0.08,
  bloom: 0.08,
  light: 0.09,
  stone: 0.08,
  bell: 0.075,
  star: 0.07,
};

export function prepareAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext ||= new AudioContext();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

export function playElementTone(type, intensity = 0.5, muted = false) {
  if (muted) return;
  const audio = prepareAudio();
  if (!audio) return;

  const speed = clamp01(intensity);
  const family = getSoundFamily(type);
  const time = audio.currentTime;

  if (family === 'wind') playWindGesture(audio, type, speed, time);
  else if (family === 'rain') playWaterGesture(audio, type, speed, time);
  else if (family === 'plant') playPlantGesture(audio, type, speed, time);
  else if (family === 'bloom') playBloomGesture(audio, type, speed, time);
  else if (family === 'light') playLightGesture(audio, type, speed, time);
  else if (family === 'stone') playStoneGesture(audio, type, speed, time);
  else if (family === 'star') playStarGesture(audio, type, speed, time);
}

export function playLiveElementTone(type, features = {}, muted = false) {
  if (muted) return;
  const audio = prepareAudio();
  if (!audio) return;

  const family = getSoundFamily(type);
  const now = audio.currentTime;
  const gap = getLiveGap(type, family);
  const key = `${family}:${type}`;
  if (liveLastPlayedAt[key] && now - liveLastPlayedAt[key] < gap) return;
  liveLastPlayedAt[key] = now;

  const speed = clamp01(features.speed || features.speedAvg || 0.35);
  const density = clamp01(features.density || features.densityLocal || 0.35);
  const intensity = clamp01(speed * 0.55 + density * 0.45);

  if (family === 'wind') playWindLive(audio, type, intensity, now);
  else if (family === 'rain') playWaterLive(audio, type, intensity, now);
  else if (family === 'plant') playPlantLive(audio, type, intensity, now);
  else if (family === 'bloom') playBloomLive(audio, type, intensity, now);
  else if (family === 'light') playLightLive(audio, type, intensity, now);
  else if (family === 'stone') playStoneLive(audio, type, intensity, now);
  else if (family === 'star') playStarLive(audio, type, intensity, now);
}

function getSoundFamily(type) {
  if (['wind', 'windLine', 'softWind', 'cloud', 'ribbon', 'floatingLeaf', 'windBell'].includes(type)) return 'wind';
  if (['rain', 'rainDrop', 'dew', 'waterLine', 'ripple', 'puddle', 'snail', 'snailTrail', 'leafBoat'].includes(type)) return 'rain';
  if (['grass', 'seed', 'reed', 'moss', 'smallTree', 'sprout', 'memorySeed'].includes(type)) return 'plant';
  if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(type)) return 'bloom';
  if (['sun', 'sunlight', 'lantern', 'firefly', 'moon', 'windowLight', 'breathLight'].includes(type)) return 'light';
  if (['stone', 'bridge', 'signpost', 'soilLine', 'shadow'].includes(type)) return 'stone';
  if (['star', 'moonbeam', 'constellationLine', 'rainbow'].includes(type)) return 'star';
  return 'plant';
}

function getLiveGap(type, family) {
  const exact = {
    rainDrop: 0.055,
    dew: 0.11,
    waterLine: 0.075,
    ripple: 0.095,
    windLine: 0.12,
    softWind: 0.18,
    windBell: 0.22,
    leafBoat: 0.14,
    firefly: 0.18,
    star: 0.2,
    stone: 0.2,
    bridge: 0.18,
  }[type];
  if (exact) return exact;
  return { wind: 0.14, rain: 0.08, plant: 0.12, bloom: 0.16, light: 0.16, stone: 0.18, star: 0.18 }[family] || 0.14;
}

function playWindGesture(audio, type, speed, time) {
  if (type === 'windBell') {
    filteredNoise(audio, { time, duration: 0.28, gain: 0.018 + speed * 0.018, filter: 'bandpass', frequency: 900, q: 1.4, attack: 0.03 });
    chime(audio, [780, 1110, 1460], time + 0.04, 0.028 + speed * 0.014);
    return;
  }
  const duration = type === 'cloud' ? 0.72 : type === 'softWind' ? 0.86 : 0.54;
  const frequency = type === 'ribbon' ? 1100 : type === 'floatingLeaf' ? 1450 : type === 'cloud' ? 520 : 820;
  filteredNoise(audio, {
    time,
    duration,
    gain: 0.028 + speed * 0.035,
    filter: type === 'cloud' ? 'lowpass' : 'bandpass',
    frequency,
    q: type === 'cloud' ? 0.45 : 0.8,
    attack: 0.08,
  });
  if (type === 'ribbon') {
    tone(audio, { time: time + 0.04, frequency: 520 + speed * 80, endFrequency: 410, duration: 0.42, gain: 0.026, type: 'triangle' });
  }
}

function playWindLive(audio, type, intensity, time) {
  if (type === 'windBell') {
    chime(audio, [840, 1260], time, 0.018 + intensity * 0.012);
    return;
  }
  filteredNoise(audio, {
    time,
    duration: type === 'softWind' ? 0.24 : 0.18,
    gain: 0.018 + intensity * 0.026,
    filter: type === 'cloud' ? 'lowpass' : 'bandpass',
    frequency: type === 'floatingLeaf' ? 1550 : type === 'ribbon' ? 1080 : 760,
    q: 0.7,
    attack: 0.025,
  });
}

function playWaterGesture(audio, type, speed, time) {
  if (type === 'leafBoat') {
    filteredNoise(audio, { time, duration: 0.58, gain: 0.026 + speed * 0.024, filter: 'lowpass', frequency: 520 + speed * 120, q: 0.55, attack: 0.06 });
    tone(audio, { time: time + 0.08, frequency: 310 + speed * 60, endFrequency: 260, duration: 0.34, gain: 0.022, type: 'triangle' });
    return;
  }
  if (type === 'snail' || type === 'snailTrail') {
    filteredNoise(audio, { time, duration: 0.64, gain: 0.018 + speed * 0.014, filter: 'lowpass', frequency: 620, q: 0.35, attack: 0.08 });
    tone(audio, { time: time + 0.1, frequency: 520, endFrequency: 360, duration: 0.46, gain: 0.018, type: 'sine' });
    return;
  }
  if (['waterLine', 'ripple', 'puddle'].includes(type)) {
    const base = type === 'waterLine' ? 360 : type === 'ripple' ? 480 : 300;
    filteredNoise(audio, { time, duration: 0.56, gain: 0.034 + speed * 0.032, filter: 'bandpass', frequency: base + speed * 180, q: 0.75, attack: 0.04 });
    [0, 0.08, 0.18].forEach((offset, index) => {
      tone(audio, { time: time + offset, frequency: base + index * 90, endFrequency: base * 0.72, duration: 0.18, gain: 0.022 + speed * 0.014, type: 'sine' });
    });
    return;
  }

  const drops = Math.round((type === 'dew' ? 3 : 5) + speed * 6);
  for (let index = 0; index < drops; index += 1) {
    playWaterPlink(audio, time + index * (0.035 + (1 - speed) * 0.018), speed, type);
  }
}

function playWaterLive(audio, type, intensity, time) {
  if (type === 'leafBoat') {
    filteredNoise(audio, { time, duration: 0.16, gain: 0.018 + intensity * 0.018, filter: 'lowpass', frequency: 460 + intensity * 120, q: 0.5, attack: 0.02 });
    return;
  }
  if (type === 'snail' || type === 'snailTrail') {
    filteredNoise(audio, { time, duration: 0.2, gain: 0.012 + intensity * 0.012, filter: 'lowpass', frequency: 540, q: 0.35, attack: 0.03 });
    return;
  }
  if (['waterLine', 'ripple', 'puddle'].includes(type)) {
    filteredNoise(audio, { time, duration: 0.14, gain: 0.022 + intensity * 0.028, filter: 'bandpass', frequency: 360 + intensity * 260, q: 0.8, attack: 0.014 });
  } else {
    playWaterPlink(audio, time, intensity, type);
  }
}

function playWaterPlink(audio, time, intensity, type) {
  const high = type === 'dew' ? 980 : (type === 'snail' || type === 'snailTrail') ? 740 : 620;
  tone(audio, {
    time,
    frequency: high + intensity * 220,
    endFrequency: 320 + intensity * 100,
    duration: type === 'dew' ? 0.16 : 0.12,
    gain: Math.min(maxGain.rain, 0.024 + intensity * 0.04),
    type: 'sine',
  });
}

function playPlantGesture(audio, type, speed, time) {
  if (type === 'seed' || type === 'memorySeed') {
    const seedBase = type === 'memorySeed' ? 250 : 190;
    tone(audio, { time, frequency: seedBase, endFrequency: type === 'memorySeed' ? 220 : 145, duration: 0.2, gain: 0.028, type: 'triangle' });
    tone(audio, { time: time + 0.12, frequency: 310 + speed * 80 + (type === 'memorySeed' ? 140 : 0), endFrequency: 390 + speed * 90 + (type === 'memorySeed' ? 160 : 0), duration: 0.34, gain: 0.026, type: 'sine' });
    return;
  }
  if (type === 'sprout') {
    tone(audio, { time, frequency: 340, endFrequency: 620 + speed * 80, duration: 0.42, gain: 0.026, type: 'sine' });
    return;
  }
  if (type === 'smallTree') {
    tone(audio, { time, frequency: 210, endFrequency: 260, duration: 0.26, gain: 0.026, type: 'triangle' });
    filteredNoise(audio, { time: time + 0.05, duration: 0.48, gain: 0.02 + speed * 0.018, filter: 'lowpass', frequency: 420, q: 0.45, attack: 0.06 });
    return;
  }
  const frequency = type === 'moss' ? 500 : type === 'reed' ? 720 : 640;
  filteredNoise(audio, { time, duration: type === 'reed' ? 0.5 : 0.42, gain: 0.026 + speed * 0.026, filter: 'lowpass', frequency, q: type === 'reed' ? 0.7 : 0.5, attack: 0.05 });
}

function playPlantLive(audio, type, intensity, time) {
  if (type === 'sprout') {
    tone(audio, { time, frequency: 380 + intensity * 120, endFrequency: 520 + intensity * 160, duration: 0.16, gain: 0.018 + intensity * 0.018, type: 'sine' });
    return;
  }
  const frequency = type === 'moss' ? 480 : type === 'reed' ? 760 : type === 'smallTree' ? 390 : 640;
  filteredNoise(audio, { time, duration: 0.14, gain: 0.018 + intensity * 0.024, filter: 'lowpass', frequency, q: 0.5, attack: 0.02 });
}

function playBloomGesture(audio, type, speed, time) {
  if (type === 'mushroom') {
    tone(audio, { time, frequency: 180, endFrequency: 150, duration: 0.2, gain: 0.028, type: 'triangle' });
    filteredNoise(audio, { time: time + 0.04, duration: 0.28, gain: 0.018, filter: 'lowpass', frequency: 430, q: 0.6, attack: 0.04 });
    return;
  }
  const notes = type === 'quietFlower' ? [520, 690] : type === 'bud' ? [430, 560] : type === 'firstFlower' ? [480, 650, 780] : [560, 740, 920];
  notes.forEach((freq, index) => {
    tone(audio, { time: time + index * 0.075, frequency: freq + speed * 50, endFrequency: freq * (type === 'firstFlower' ? 1.04 : 1.08), duration: type === 'firstFlower' ? 0.48 : 0.38, gain: 0.022 + speed * 0.012, type: 'sine' });
  });
}

function playBloomLive(audio, type, intensity, time) {
  tone(audio, {
    time,
    frequency: type === 'bud' ? 480 + intensity * 100 : type === 'firstFlower' ? 540 + intensity * 90 : 620 + intensity * 150,
    endFrequency: 680 + intensity * 160,
    duration: 0.2,
    gain: 0.024 + intensity * 0.024,
    type: 'sine',
  });
}

function playLightGesture(audio, type, speed, time) {
  if (type === 'lantern' || type === 'breathLight' || type === 'windowLight') {
    if (type === 'windowLight') {
      tone(audio, { time, frequency: 360, endFrequency: 382, duration: 0.42, gain: 0.026 + speed * 0.012, type: 'triangle' });
      tone(audio, { time: time + 0.08, frequency: 540, endFrequency: 560, duration: 0.48, gain: 0.018, type: 'sine' });
      return;
    }
    if (type === 'lantern') {
      tone(audio, { time, frequency: 420, endFrequency: 430, duration: 0.6, gain: 0.028 + speed * 0.014, type: 'sine' });
      filteredNoise(audio, { time: time + 0.04, duration: 0.24, gain: 0.012, filter: 'bandpass', frequency: 880, q: 1.2, attack: 0.04 });
      return;
    }
    const base = 390;
    tone(audio, { time, frequency: base, endFrequency: base * 1.04, duration: 0.7, gain: 0.034 + speed * 0.024, type: 'sine' });
    tone(audio, { time: time + 0.04, frequency: base * 1.5, endFrequency: base * 1.58, duration: 0.58, gain: 0.018, type: 'sine' });
    return;
  }
  if (type === 'firefly') {
    [0, 0.16, 0.31].forEach((offset, index) => {
      tone(audio, { time: time + offset, frequency: 880 + index * 110 + speed * 80, endFrequency: 960 + index * 110, duration: 0.18, gain: 0.024, type: 'sine' });
    });
    return;
  }
  if (type === 'sun') {
    filteredNoise(audio, { time, duration: 0.5, gain: 0.018 + speed * 0.016, filter: 'bandpass', frequency: 1050 + speed * 160, q: 0.55, attack: 0.05 });
    [0, 0.1, 0.22].forEach((offset, index) => {
      tone(audio, { time: time + offset, frequency: 620 + index * 130, endFrequency: 780 + index * 160, duration: 0.36, gain: 0.02, type: 'sine' });
    });
    return;
  }
  const base = type === 'moon' ? 520 : type === 'sunlight' ? 690 : 760;
  [0, 0.08, 0.18].forEach((offset, index) => {
    tone(audio, { time: time + offset, frequency: base + index * 110 + speed * 70, endFrequency: base + index * 150, duration: 0.46, gain: 0.026 + speed * 0.014, type: 'sine' });
  });
}

function playLightLive(audio, type, intensity, time) {
  const frequency = type === 'firefly' ? 980 + intensity * 260 : type === 'moon' ? 500 : type === 'windowLight' ? 420 : type === 'lantern' ? 620 : type === 'sun' ? 840 + intensity * 180 : 720 + intensity * 160;
  tone(audio, { time, frequency, endFrequency: frequency * 1.08, duration: 0.22, gain: 0.024 + intensity * 0.026, type: 'sine' });
}

function playStoneGesture(audio, type, speed, time) {
  if (type === 'bridge' || type === 'signpost') {
    [0, 0.08, 0.16].forEach((offset, index) => {
      tone(audio, { time: time + offset, frequency: 230 + index * 54, endFrequency: 190 + index * 40, duration: 0.18, gain: 0.028 + speed * 0.012, type: 'triangle' });
    });
    return;
  }
  if (type === 'soilLine') {
    filteredNoise(audio, { time, duration: 0.38, gain: 0.026, filter: 'lowpass', frequency: 260, q: 0.3, attack: 0.05 });
    return;
  }
  if (type === 'shadow') {
    filteredNoise(audio, { time, duration: 0.5, gain: 0.024, filter: 'lowpass', frequency: 340, q: 0.35, attack: 0.08 });
    return;
  }
  tone(audio, { time, frequency: type === 'stone' ? 180 : 240, endFrequency: 120, duration: 0.24, gain: 0.034 + speed * 0.014, type: 'triangle' });
}

function playStoneLive(audio, type, intensity, time) {
  if (type === 'soilLine' || type === 'shadow') {
    filteredNoise(audio, { time, duration: 0.16, gain: 0.014 + intensity * 0.012, filter: 'lowpass', frequency: type === 'shadow' ? 300 : 240, q: 0.3, attack: 0.03 });
    return;
  }
  tone(audio, { time, frequency: type === 'bridge' ? 260 + intensity * 70 : type === 'signpost' ? 320 + intensity * 50 : 170 + intensity * 60, endFrequency: 125, duration: 0.14, gain: 0.024 + intensity * 0.018, type: 'triangle' });
}

function playStarGesture(audio, type, speed, time) {
  if (type === 'constellationLine') {
    chime(audio, [620, 880, 1240, 1560], time, 0.026 + speed * 0.014);
    filteredNoise(audio, { time, duration: 0.28, gain: 0.01, filter: 'bandpass', frequency: 1400, q: 1.1, attack: 0.03 });
    return;
  }
  if (type === 'rainbow') {
    [520, 660, 820].forEach((freq, index) => {
      tone(audio, { time: time + index * 0.08, frequency: freq, endFrequency: freq * 1.18, duration: 0.42, gain: 0.022, type: 'sine' });
    });
    return;
  }
  if (type === 'moonbeam') {
    tone(audio, { time, frequency: 520, endFrequency: 780, duration: 0.72, gain: 0.026 + speed * 0.012, type: 'sine' });
    filteredNoise(audio, { time, duration: 0.5, gain: 0.012, filter: 'lowpass', frequency: 820, q: 0.35, attack: 0.08 });
    return;
  }
  chime(audio, [920, 1320, 1760], time, 0.026 + speed * 0.014);
}

function playStarLive(audio, type, intensity, time) {
  const frequency = type === 'constellationLine' ? 760 + intensity * 220 : type === 'moonbeam' ? 560 + intensity * 120 : type === 'rainbow' ? 640 + intensity * 160 : 980 + intensity * 360;
  tone(audio, { time, frequency, endFrequency: frequency * 1.16, duration: 0.2, gain: 0.022 + intensity * 0.018, type: 'sine' });
}

function chime(audio, frequencies, time, gainValue) {
  frequencies.forEach((frequency, index) => {
    tone(audio, {
      time: time + index * 0.07,
      frequency,
      endFrequency: frequency * 0.997,
      duration: 0.72 - index * 0.08,
      gain: gainValue * (1 - index * 0.16),
      type: 'sine',
    });
  });
}

function tone(audio, { time, frequency, endFrequency, duration, gain, type }) {
  const output = audio.createGain();
  output.gain.setValueAtTime(0.0001, time);
  output.gain.exponentialRampToValueAtTime(Math.max(0.0002, Math.min(0.12, gain)), time + Math.min(0.04, duration * 0.25));
  output.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  output.connect(audio.destination);

  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, frequency), time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency || frequency), time + duration * 0.8);
  osc.connect(output);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

function filteredNoise(audio, { time, duration, gain, filter, frequency, q, attack }) {
  const buffer = audio.createBuffer(1, Math.max(1, Math.round(audio.sampleRate * duration)), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const fade = 1 - index / data.length;
    data[index] = (Math.random() * 2 - 1) * fade;
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;

  const biquad = audio.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.setValueAtTime(frequency, time);
  biquad.Q.setValueAtTime(q, time);

  const output = audio.createGain();
  output.gain.setValueAtTime(0.0001, time);
  output.gain.exponentialRampToValueAtTime(Math.max(0.0002, Math.min(0.12, gain)), time + attack);
  output.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  source.connect(biquad);
  biquad.connect(output);
  output.connect(audio.destination);
  source.start(time);
  source.stop(time + duration + 0.02);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
