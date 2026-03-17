// ─────────────────────────────────────────────────────────
//  BEAST FEEDER  —  game.js
// ─────────────────────────────────────────────────────────

const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');

// ── HUD references ────────────────────────────────────────
const scoreEl = document.getElementById('score');
const waveEl  = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const bestEl  = document.getElementById('best');

// ── Overlay references ────────────────────────────────────
const overlay        = document.getElementById('overlay');
const gameoverOverlay= document.getElementById('gameover-overlay');
const startBtn       = document.getElementById('start-btn');

// Disable start button until audio is loaded
startBtn.disabled    = true;
startBtn.textContent = 'LOADING...';
const restartBtn     = document.getElementById('restart-btn');
const finalScoreDisplay = document.getElementById('final-score-display');

// ─────────────────────────────────────────────────────────
//  CANVAS SIZING  (letterbox, same as reference game)
// ─────────────────────────────────────────────────────────
let GAME_W = 800;
let GAME_H = 600;
let LAUNCHER_X = GAME_W / 2;
let LAUNCHER_Y = GAME_H - 120;

function recalcLayout() {
  LAUNCHER_X = GAME_W / 2;
  LAUNCHER_Y = GAME_H - Math.round(GAME_H * 0.20);
}

let _rszW = 0, _rszH = 0, _rszX = 0, _rszY = 0;

function resizeCanvas() {
  const vv = window.visualViewport || { width: window.innerWidth, height: window.innerHeight };
  const vw = Math.floor(vv.width);
  const vh = Math.floor(vv.height);
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  let w, h, x, y;
  if (isTouch) {
    w = vw; h = vh; x = 0; y = 0;
  } else {
    const maxW = 560;
    const scale = Math.min(maxW / GAME_W, vh / GAME_H);
    w = Math.floor(GAME_W * scale);
    h = Math.floor(GAME_H * scale);
    x = Math.floor((vw - w) / 2);
    y = Math.floor((vh - h) / 2);
  }
  canvas.style.width    = w + 'px';
  canvas.style.height   = h + 'px';
  canvas.style.position = 'fixed';
  canvas.style.left     = x + 'px';
  canvas.style.top      = y + 'px';
  const root = document.documentElement.style;
  root.setProperty('--canvas-left',   x + 'px');
  root.setProperty('--canvas-top',    y + 'px');
  root.setProperty('--canvas-width',  w + 'px');
  root.setProperty('--canvas-height', h + 'px');
  _rszW = w; _rszH = h; _rszX = x; _rszY = y;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  GAME_W = w; GAME_H = h;
  recalcLayout();
}

let canvasRect = null;
window.addEventListener('resize', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
window.addEventListener('load', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
resizeCanvas();
requestAnimationFrame(() => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });

// ─────────────────────────────────────────────────────────
//  AUDIO  — Web Audio API (matches reference game pattern)
//  MP3 music fetched at load; SFX synthesised via oscillators.
//  AudioContext is created and resumed only inside a user
//  gesture so iOS Safari allows playback.
// ─────────────────────────────────────────────────────────
let audioCtx      = null;
let musicBuffer   = null;   // decoded AudioBuffer for the MP3
let musicSource   = null;   // currently playing BufferSourceNode
let musicGain     = null;   // GainNode so we can control volume
let audioUnlocked = false;  // true after first gesture

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Fetch the MP3 immediately — no gesture needed for fetch itself
fetch('Assets/music.mp3')
  .then(r => r.arrayBuffer())
  .then(buf => {
    const ac = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    return ac.decodeAudioData(buf);
  })
  .then(decoded => {
    musicBuffer = decoded;
    if (audioUnlocked && !musicSource) startBgMusic();
    const btn = document.getElementById('start-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'FEED THE BEASTS'; }
  })
  .catch(() => {}); // silently ignore missing asset during development

function startBgMusic() {
  const ac = getAudioCtx();
  if (!musicBuffer || !ac) return;
  if (musicSource) { try { musicSource.stop(); } catch(e) {} musicSource = null; }
  musicGain             = ac.createGain();
  musicGain.gain.value  = 0.45;
  musicGain.connect(ac.destination);
  musicSource           = ac.createBufferSource();
  musicSource.buffer    = musicBuffer;
  musicSource.loop      = true;
  musicSource.connect(musicGain);
  musicSource.start(0);
}

function stopBgMusic() {
  if (musicSource) { try { musicSource.stop(); } catch(e) {} musicSource = null; }
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  getAudioCtx().resume().catch(() => {});
}

// Unlock on first keyboard press too
document.addEventListener('keydown', unlockAudio, { once: true });

// ── Low-level synth helpers ───────────────────────────────
function playTone(freq, endFreq, duration, type, gain, delay = 0) {
  const ac  = getAudioCtx();
  const t   = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq)
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + duration);
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(env);
  env.connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

function playNoise(duration, gain, filterFreq = 800, delay = 0) {
  const ac     = getAudioCtx();
  const t      = ac.currentTime + delay;
  const frames = ac.sampleRate * (duration + 0.05);
  const buf    = ac.createBuffer(1, frames, ac.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src    = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const env    = ac.createGain();
  filter.type            = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value         = 0.6;
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.buffer = buf;
  src.connect(filter);
  filter.connect(env);
  env.connect(ac.destination);
  src.start(t);
  src.stop(t + duration + 0.05);
}

// ── Sound effects ─────────────────────────────────────────

// Bottle fired — swooshy rising squirt
function sfxFire() {
  playTone(300, 900, 0.10, 'sine',     0.15);
  playTone(600, 200, 0.08, 'triangle', 0.08, 0.05);
}

// Kitten hit — soft satisfying "pap" + happy squeak
function sfxKittenHit() {
  playTone(520, 780, 0.07, 'sine',     0.22);
  playTone(900, 600, 0.10, 'triangle', 0.12, 0.06);
  playNoise(0.06, 0.18, 1200);
}

// Kitten reaches launcher — low thud + distressed tone
function sfxLifeLost() {
  playTone(200, 60,  0.35, 'sawtooth', 0.40);
  playTone(150, 40,  0.45, 'square',   0.25, 0.04);
  playNoise(0.30, 0.45, 200);
}

// Wave cleared — ascending chime arpeggio
function sfxWaveClear() {
  [330, 415, 523, 659, 784, 1047].forEach((f, i) =>
    playTone(f, f, 0.14, 'sine', 0.22, i * 0.09));
}

// Game over — descending minor phrase
function sfxGameOver() {
  playTone(392, 392, 0.30, 'square', 0.32, 0.00);
  playTone(330, 330, 0.30, 'square', 0.32, 0.35);
  playTone(262, 262, 0.70, 'square', 0.32, 0.70);
}


//  Replace these with image loads — just swap drawXxx()
//  to ctx.drawImage(img, x, y, w, h)
// ─────────────────────────────────────────────────────────

// Biscuit launcher — sits at bottom-centre
function drawBottle(x, y, angle, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Main biscuit body
  ctx.fillStyle = '#e8b84b';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Darker edge
  ctx.strokeStyle = '#c8942a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Inner lighter surface
  ctx.fillStyle = '#f5c84a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dot pattern
  ctx.fillStyle = '#c8942a';
  for (const [dx, dy] of [[-6,-4],[6,-4],[0,4],[-10,0],[10,0]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Projectile biscuit (small, tumbling)
function drawProjectileBottle(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = '#e8b84b';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8942a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#f5c84a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dots
  ctx.fillStyle = '#c8942a';
  for (const [dx, dy] of [[-3,-2],[3,-2],[0,3]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Kitten colours
const KITTEN_COLORS     = ['#f4a460', '#888', '#ff9999', '#ccc', '#c8a882'];
const KITTEN_EAR_COLORS = ['#ffb6c1', '#aaa', '#ffaaaa', '#ddd', '#d4b896'];

// Dog colours
const DOG_COLORS        = ['#c8a05a', '#8B5e3c', '#d4c4a0', '#555', '#e8d0a0'];
const DOG_SNOUT_COLORS  = ['#d4b070', '#aa7050', '#e0d0b0', '#777', '#f0e0c0'];

function drawKitten(x, y, size, colorIdx, frame) {
  const c  = KITTEN_COLORS[colorIdx % KITTEN_COLORS.length];
  const ec = KITTEN_EAR_COLORS[colorIdx % KITTEN_COLORS.length];
  const bob = Math.sin(frame * 0.15) * 2;

  ctx.save();
  ctx.translate(x, y + bob);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.55, size * 0.4, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.2, size * 0.35, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -size * 0.15, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.beginPath();
  ctx.moveTo(-size * 0.22, -size * 0.34);
  ctx.lineTo(-size * 0.32, -size * 0.54);
  ctx.lineTo(-size * 0.1,  -size * 0.36);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(size * 0.22, -size * 0.34);
  ctx.lineTo(size * 0.32, -size * 0.54);
  ctx.lineTo(size * 0.1,  -size * 0.36);
  ctx.closePath();
  ctx.fill();

  // Inner ears
  ctx.fillStyle = ec;
  ctx.beginPath();
  ctx.moveTo(-size * 0.21, -size * 0.37);
  ctx.lineTo(-size * 0.29, -size * 0.51);
  ctx.lineTo(-size * 0.13, -size * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(size * 0.21, -size * 0.37);
  ctx.lineTo(size * 0.29, -size * 0.51);
  ctx.lineTo(size * 0.13, -size * 0.38);
  ctx.closePath();
  ctx.fill();

  // Eyes (blinking)
  const blink = (frame % 90 < 6);
  ctx.fillStyle = '#222';
  if (blink) {
    ctx.fillRect(-size * 0.12, -size * 0.19, size * 0.1, size * 0.03);
    ctx.fillRect(size * 0.02, -size * 0.19, size * 0.1, size * 0.03);
  } else {
    ctx.beginPath();
    ctx.arc(-size * 0.09, -size * 0.18, size * 0.065, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.09, -size * 0.18, size * 0.065, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-size * 0.07, -size * 0.20, size * 0.022, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.11, -size * 0.20, size * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose
  ctx.fillStyle = '#ff9999';
  ctx.beginPath();
  ctx.arc(0, -size * 0.09, size * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-size * 0.06, -size * 0.05);
  ctx.quadraticCurveTo(-size * 0.1, -size * 0.01, -size * 0.14, -size * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.06, -size * 0.05);
  ctx.quadraticCurveTo(size * 0.1, -size * 0.01, size * 0.14, -size * 0.05);
  ctx.stroke();

  // Whiskers
  ctx.strokeStyle = '#fff8';
  ctx.lineWidth = 0.8;
  for (let s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const ay = -size * 0.09 + (i - 1) * size * 0.06;
      ctx.beginPath();
      ctx.moveTo(s * size * 0.05, ay);
      ctx.lineTo(s * size * 0.28, ay + (i - 1) * size * 0.04);
      ctx.stroke();
    }
  }

  // Tail
  ctx.strokeStyle = c;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.28);
  const tailWag = Math.sin(frame * 0.12) * 15;
  ctx.quadraticCurveTo(
    size * 0.55 + tailWag * 0.1, size * 0.1,
    size * 0.5,  -size * 0.1 + Math.sin(frame * 0.12) * size * 0.15
  );
  ctx.stroke();

  // Hungry speech bubble
  if (frame % 120 < 30) {
    const bubbleText = 'TREAT!';
    const fontSize = Math.max(10, size * 0.18);
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    const textW = ctx.measureText(bubbleText).width;
    const padX = size * 0.12;
    const padY = size * 0.1;
    const bubbleW = textW + padX * 2;
    const bubbleH = fontSize + padY * 2;
    const bubbleX = -bubbleW / 2;
    const bubbleTop = -size * 0.58 - bubbleH;
    const bubbleMidX = bubbleX + bubbleW / 2;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleTop, bubbleW, bubbleH, 4);
    ctx.fill();
    ctx.stroke();
    // Tail of bubble
    ctx.beginPath();
    ctx.moveTo(bubbleMidX - size * 0.06, bubbleTop + bubbleH);
    ctx.lineTo(bubbleMidX - size * 0.12, bubbleTop + bubbleH + size * 0.1);
    ctx.lineTo(bubbleMidX + size * 0.06, bubbleTop + bubbleH);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff69b4';
    ctx.textBaseline = 'middle';
    ctx.fillText(bubbleText, bubbleMidX, bubbleTop + bubbleH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.restore();
}

// Dog sprite
function drawDog(x, y, size, colorIdx, frame) {
  const c  = DOG_COLORS[colorIdx % DOG_COLORS.length];
  const sc = DOG_SNOUT_COLORS[colorIdx % DOG_COLORS.length];
  const bob = Math.sin(frame * 0.15) * 2;

  ctx.save();
  ctx.translate(x, y + bob);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.55, size * 0.45, size * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body — slightly chunkier than cat
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.2, size * 0.42, size * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head — rounder
  ctx.beginPath();
  ctx.arc(0, -size * 0.12, size * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Floppy ears — hang down from sides of head
  ctx.fillStyle = darkenColor(c, 0.15);
  ctx.beginPath();
  ctx.ellipse(-size * 0.38, -size * 0.05, size * 0.13, size * 0.24, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size * 0.38, -size * 0.05, size * 0.13, size * 0.24, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Snout / muzzle
  ctx.fillStyle = sc;
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.02, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (blinking)
  const blink = (frame % 90 < 6);
  ctx.fillStyle = '#222';
  if (blink) {
    ctx.fillRect(-size * 0.14, -size * 0.2, size * 0.1, size * 0.03);
    ctx.fillRect(size * 0.04,  -size * 0.2, size * 0.1, size * 0.03);
  } else {
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.2, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.1, -size * 0.2, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-size * 0.08, -size * 0.22, size * 0.025, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.12, -size * 0.22, size * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose — bigger than cat's
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.04, size * 0.07, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-size * 0.07, size * 0.01);
  ctx.quadraticCurveTo(-size * 0.12, size * 0.06, -size * 0.17, size * 0.01);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.07, size * 0.01);
  ctx.quadraticCurveTo(size * 0.12, size * 0.06, size * 0.17, size * 0.01);
  ctx.stroke();

  // Tongue (panting) — shows periodically
  if (frame % 60 < 40) {
    ctx.fillStyle = '#ff8888';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.1, size * 0.08, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail — wagging stub
  ctx.strokeStyle = c;
  ctx.lineWidth = size * 0.1;
  ctx.lineCap = 'round';
  const tailWag = Math.sin(frame * 0.2) * 20; // faster wag than cat
  ctx.beginPath();
  ctx.moveTo(size * 0.38, size * 0.15);
  ctx.quadraticCurveTo(
    size * 0.6 + tailWag * 0.08, size * 0.0,
    size * 0.55, -size * 0.08 + Math.sin(frame * 0.2) * size * 0.12
  );
  ctx.stroke();

  // Hungry speech bubble
  if (frame % 120 < 30) {
    const bubbleText = 'BISCUIT!';
    const fontSize = Math.max(10, size * 0.18);
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    const textW = ctx.measureText(bubbleText).width;
    const padX = size * 0.12;
    const padY = size * 0.1;
    const bubbleW = textW + padX * 2;
    const bubbleH = fontSize + padY * 2;
    const bubbleX = -bubbleW / 2;
    const bubbleTop = -size * 0.58 - bubbleH;
    const bubbleMidX = bubbleX + bubbleW / 2;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleTop, bubbleW, bubbleH, 4);
    ctx.fill();
    ctx.stroke();
    // Tail of bubble
    ctx.beginPath();
    ctx.moveTo(bubbleMidX - size * 0.06, bubbleTop + bubbleH);
    ctx.lineTo(bubbleMidX - size * 0.12, bubbleTop + bubbleH + size * 0.1);
    ctx.lineTo(bubbleMidX + size * 0.06, bubbleTop + bubbleH);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff69b4';
    ctx.textBaseline = 'middle';
    ctx.fillText(bubbleText, bubbleMidX, bubbleTop + bubbleH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.restore();
}

// Helper to slightly darken a hex colour
function darkenColor(hex, amt) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return '#' + [r,g,b].map(v => Math.max(0,Math.round(v*(1-amt))).toString(16).padStart(2,'0')).join('');
}
let particles = [];

function spawnParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.03 + Math.random() * 0.04,
      size: 3 + Math.random() * 5,
      color,
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // gravity
    p.life -= p.decay;
  }
}

function drawParticles() {
  for (const p of particles) {
    const radius = Math.max(0, p.size * p.life);
    const alpha  = Math.max(0, Math.min(1, p.life));
    const hex    = Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fillStyle = p.color + hex;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────
//  STAR FIELD (background)
// ─────────────────────────────────────────────────────────
const STARS = Array.from({ length: 80 }, () => ({
  x: Math.random() * GAME_W,
  y: Math.random() * GAME_H,
  r: Math.random() * 1.5 + 0.3,
  a: Math.random(),
}));

function drawBackground() {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  for (const s of STARS) {
    ctx.globalAlpha = s.a * 0.6 + 0.2;
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Ground line
  ctx.strokeStyle = '#ff69b430';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, GAME_H - 2);
  ctx.lineTo(GAME_W, GAME_H - 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ─────────────────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────────────────
let state = 'start'; // 'start' | 'playing' | 'gameover'
let score  = 0;
let lives  = 3;
let wave   = 1;
let frame  = 0;
let kittens      = [];
let projectiles  = [];
let nextSpawnIn  = 120;
let waveKittensLeft = 0;
let betweenWaves = false;
let betweenTimer = 0;

// Launcher — LAUNCHER_X/Y declared at top of file

// Drag / aim state
let isDragging   = false;
let dragStart    = null;  // {x, y} canvas coords
let dragCurrent  = null;

// Active float text
let floatTexts = [];

// ─────────────────────────────────────────────────────────
//  WAVE CONFIG
// ─────────────────────────────────────────────────────────
function waveConfig(w) {
  return {
    count:      5 + (w - 1) * 2,
    speed:      0.4 + (w - 1) * 0.08,
    size:       Math.round(GAME_W * 0.13) + Math.random() * Math.round(GAME_W * 0.03),
    spawnRate:  Math.max(60, 130 - (w - 1) * 8),
  };
}

// ─────────────────────────────────────────────────────────
//  GAME INIT / RESET
// ─────────────────────────────────────────────────────────
function startGame() {
  score      = 0;
  lives      = 3;
  wave       = 1;
  frame      = 0;
  kittens    = [];
  projectiles= [];
  particles  = [];
  floatTexts = [];
  betweenWaves = false;
  betweenTimer = 0;

  const cfg = waveConfig(wave);
  nextSpawnIn = cfg.spawnRate;
  waveKittensLeft = cfg.count;

  _hudScore = _hudWave = _hudLives = _hudBest = -1;
  updateHUD();
  if (audioUnlocked && !musicSource) startBgMusic();
  state = 'playing';
}

// ─────────────────────────────────────────────────────────
//  SPAWN KITTEN
// ─────────────────────────────────────────────────────────
function spawnKitten() {
  const cfg  = waveConfig(wave);
  const side = Math.random() < 0.5 ? -1 : 1;
  const x    = side === -1 ? -40 : GAME_W + 40;
  const y    = 80 + Math.random() * (GAME_H - 200);
  const isDog = Math.random() < 0.5;

  kittens.push({
    x, y,
    vx:       side * cfg.speed,
    vy:       0,
    size:     cfg.size,
    colorIdx: Math.floor(Math.random() * (isDog ? DOG_COLORS.length : KITTEN_COLORS.length)),
    hp:       1,
    frame:    Math.floor(Math.random() * 200),
    phase: 'approach',
    isDog,
    id: Math.random(),
  });
}

// ─────────────────────────────────────────────────────────
//  FIRE PROJECTILE
// ─────────────────────────────────────────────────────────
function fireBottle(dx, dy) {
  // dx, dy = vector from launcher to drag point (we invert to get launch dir)
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 10) return; // too small a drag
  const maxSpeed = 18;
  const speed = Math.min(len * 0.18, maxSpeed);
  const nx = -dx / len;
  const ny = -dy / len;

  projectiles.push({
    x:  LAUNCHER_X,
    y:  LAUNCHER_Y,
    vx: nx * speed,
    vy: ny * speed,
    angle: 0,
    spin:  (Math.random() - 0.5) * 0.3,
    active: true,
  });
}

// ─────────────────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────────────────
function update() {
  frame++;

  // ── Wave management
  if (!betweenWaves) {
    if (waveKittensLeft > 0) {
      nextSpawnIn--;
      if (nextSpawnIn <= 0) {
        spawnKitten();
        waveKittensLeft--;
        nextSpawnIn = waveConfig(wave).spawnRate;
      }
    } else if (kittens.length === 0) {
      // All kittens cleared → start between-wave pause
      sfxWaveClear();
      betweenWaves = true;
      betweenTimer = 120; // 2 s at 60fps
      wave++;
    }
  } else {
    betweenTimer--;
    if (betweenTimer <= 0) {
      betweenWaves = false;
      const cfg = waveConfig(wave);
      waveKittensLeft = cfg.count;
      nextSpawnIn = cfg.spawnRate;
    }
  }

  // ── Update kittens
  for (const k of kittens) {
    k.frame++;

    // Simple AI: head toward launcher
    const tdx = LAUNCHER_X - k.x;
    const tdy = LAUNCHER_Y - k.y;
    const dist = Math.sqrt(tdx * tdx + tdy * tdy);
    const spd  = waveConfig(wave).speed;

    if (dist > 1) {
      k.vx += (tdx / dist) * spd * 0.04;
      k.vy += (tdy / dist) * spd * 0.04;
    }

    // Cap speed
    const kspd = Math.sqrt(k.vx * k.vx + k.vy * k.vy);
    if (kspd > spd * 1.6) {
      k.vx = (k.vx / kspd) * spd * 1.6;
      k.vy = (k.vy / kspd) * spd * 1.6;
    }

    k.x += k.vx;
    k.y += k.vy;
  }

  // ── Kittens reaching launcher → lose a life
  kittens = kittens.filter(k => {
    const dx = k.x - LAUNCHER_X;
    const dy = k.y - LAUNCHER_Y;
    if (Math.sqrt(dx * dx + dy * dy) < 36) {
      lives--;
      sfxLifeLost();
      spawnParticles(k.x, k.y, '#ff4466');
      addFloatText(k.x, k.y - 20, '-1 LIFE', '#ff4466');
      updateHUD();
      if (lives <= 0) endGame();
      return false;
    }
    return true;
  });

  // ── Update projectiles
  for (const p of projectiles) {
    p.x    += p.vx;
    p.y    += p.vy;
    p.angle += p.spin;
    // Slight gravity
    p.vy   += 0.18;
  }

  // ── Projectile–kitten collision
  for (const p of projectiles) {
    if (!p.active) continue;
    for (const k of kittens) {
      const dx = p.x - k.x;
      const dy = p.y - k.y;
      if (Math.sqrt(dx * dx + dy * dy) < k.size) {
        k.hp--;
        p.active = false;
        sfxKittenHit();
        spawnParticles(p.x, p.y, '#e8f4f8');
        if (k.hp <= 0) {
          const pts = 10 * wave;
          score += pts;
          spawnParticles(k.x, k.y, k.isDog ? DOG_COLORS[k.colorIdx] : KITTEN_COLORS[k.colorIdx]);
          addFloatText(k.x, k.y - 30, `+${pts}`, '#ff69b4');
          updateHUD();
        }
        break;
      }
    }
  }

  // Remove dead kittens and off-screen / inactive projectiles
  kittens     = kittens.filter(k => k.hp > 0);
  projectiles = projectiles.filter(p =>
    p.active &&
    p.x > -50 && p.x < GAME_W + 50 &&
    p.y > -50 && p.y < GAME_H + 200
  );

  // ── Particles & float texts
  updateParticles();
  floatTexts = floatTexts.filter(f => f.life > 0);
  for (const f of floatTexts) {
    f.y   -= 0.8;
    f.life -= 0.02;
  }
}

// ─────────────────────────────────────────────────────────
//  DRAW
// ─────────────────────────────────────────────────────────
function draw() {
  drawBackground();

  // ── Animals
  for (const k of kittens) {
    if (k.isDog) {
      drawDog(k.x, k.y, k.size, k.colorIdx, k.frame);
    } else {
      drawKitten(k.x, k.y, k.size, k.colorIdx, k.frame);
    }
  }

  // ── Projectiles
  for (const p of projectiles) {
    drawProjectileBottle(p.x, p.y, p.angle);
  }

  // ── Particles
  drawParticles();

  // ── Launcher (milk bottle at bottom)
  if (isDragging && dragStart && dragCurrent) {
    drawAimGuide();
  }
  drawBottle(LAUNCHER_X, LAUNCHER_Y, 0, 1);

  // ── Aim line while dragging
  if (isDragging && dragStart && dragCurrent) {
    // Already drawn in drawAimGuide()
  }

  // ── Float texts
  for (const f of floatTexts) {
    ctx.globalAlpha = f.life;
    ctx.fillStyle   = f.color;
    ctx.font        = 'bold 18px "Courier New", monospace';
    ctx.textAlign   = 'center';
    ctx.shadowColor = f.color;
    ctx.shadowBlur  = 8;
    ctx.fillText(f.text, f.x, f.y);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }

  // ── Between-wave banner
  if (betweenWaves) {
    ctx.fillStyle = '#ff69b4';
    ctx.font      = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff69b4';
    ctx.shadowBlur  = 20;
    ctx.fillText(`WAVE ${wave} INCOMING!`, GAME_W / 2, GAME_H / 2);
    ctx.shadowBlur  = 0;
  }

  // ── On-canvas HUD bar at bottom
  const HUD_H = 36;
  ctx.fillStyle = 'rgba(10,10,26,0.75)';
  ctx.fillRect(0, GAME_H - HUD_H, GAME_W, HUD_H);
  ctx.strokeStyle = '#ff69b430';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, GAME_H - HUD_H); ctx.lineTo(GAME_W, GAME_H - HUD_H); ctx.stroke();
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#ff69b4';
  ctx.textBaseline = 'middle';
  const hudY = GAME_H - HUD_H / 2;
  const q = GAME_W / 4;
  ctx.textAlign = 'center'; ctx.fillText('SCORE: ' + score, q * 0.5, hudY);
  ctx.textAlign = 'center'; ctx.fillText('WAVE: ' + wave, q * 1.5, hudY);
  ctx.textAlign = 'center'; ctx.fillText('[ ' + 'I '.repeat(Math.max(0,lives)).trimEnd() + ' ]', q * 2.5, hudY);
  ctx.textAlign = 'center'; ctx.fillText('BEST: ' + (typeof hsBest === 'function' ? hsBest('hungry-hungry-kittens') : 0), q * 3.5, hudY);
  ctx.textBaseline = 'alphabetic';
}

function drawAimGuide() {
  const dx = dragCurrent.x - dragStart.x;
  const dy = dragCurrent.y - dragStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 5) return;

  // Direction of fire (inverse of drag)
  const nx = -dx / len;
  const ny = -dy / len;
  const speed = Math.min(len * 0.18, 18);

  // Draw dotted trajectory
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = '#ff69b488';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();

  let px = LAUNCHER_X;
  let py = LAUNCHER_Y;
  let pvx = nx * speed;
  let pvy = ny * speed;
  ctx.moveTo(px, py);
  for (let i = 0; i < 28; i++) {
    px  += pvx;
    py  += pvy;
    pvy += 0.18;
    ctx.lineTo(px, py);
    if (py > GAME_H + 20) break;
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Drag circle at drag point
  ctx.strokeStyle = '#ff69b4';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(dragStart.x + dx, dragStart.y + dy, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Power indicator
  const power = Math.min(len / 120, 1);
  ctx.fillStyle = `hsl(${330 - power * 60}, 100%, 65%)`;
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`PWR ${Math.round(power * 100)}%`, dragStart.x + dx, dragStart.y + dy - 22);
}

// ─────────────────────────────────────────────────────────
//  FLOAT TEXT
// ─────────────────────────────────────────────────────────
function addFloatText(x, y, text, color) {
  floatTexts.push({ x, y, text, color, life: 1 });
}

// ─────────────────────────────────────────────────────────
//  HUD — DOM writes run on their own rAF, completely
//  separate from the canvas draw loop so they can never
//  trigger a compositor flush mid-frame.
// ─────────────────────────────────────────────────────────
let _hudScore = -1, _hudWave = -1, _hudLives = -1, _hudBest = -1;
let _hudPending = false;

function scheduleHUD() {
  // HUD is drawn on canvas each frame — nothing to do here
}

function updateHUD() { scheduleHUD(); }

// ─────────────────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────────────────
function endGame() {
  state = 'gameover';
  sfxGameOver();
  stopBgMusic();
  hsSave('hungry-hungry-kittens', score);
  finalScoreDisplay.textContent = `SCORE: ${score}`;
  hsRenderBest('hungry-hungry-kittens', 'hs-gameover');
  gameoverOverlay.classList.add('active');
}

let lastTime = 0;
let _lastTs = 0;
function loop(ts = 0) {
  requestAnimationFrame(loop);
  if (ts - _lastTs < 16.5) return; // cap at ~60fps
  _lastTs = ts;
  if (state === 'playing') {
    update();
    draw();
  }
}
requestAnimationFrame(loop);

// ─────────────────────────────────────────────────────────
//  INPUT — unified mouse + touch → canvas coords
// ─────────────────────────────────────────────────────────
function canvasPoint(clientX, clientY) {
  const rect  = canvasRect || canvas.getBoundingClientRect();
  const scaleX = GAME_W / rect.width;
  const scaleY = GAME_H / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top)  * scaleY,
  };
}

function onPointerDown(clientX, clientY) {
  if (state !== 'playing') return;
  const pt = canvasPoint(clientX, clientY);
  // Only start drag near the launcher area (bottom third)
  isDragging   = true;
  dragStart    = { x: LAUNCHER_X, y: LAUNCHER_Y };
  dragCurrent  = pt;
}

function onPointerDown(clientX, clientY) {
  unlockAudio();
  if (state !== 'playing') return;
  const pt = canvasPoint(clientX, clientY);
  // Only start drag near the launcher area (bottom third)
  isDragging   = true;
  dragStart    = { x: LAUNCHER_X, y: LAUNCHER_Y };
  dragCurrent  = pt;
}

function onPointerMove(clientX, clientY) {
  if (!isDragging) return;
  dragCurrent = canvasPoint(clientX, clientY);
}

function onPointerUp(clientX, clientY) {
  if (!isDragging) return;
  isDragging = false;
  if (dragStart && dragCurrent) {
    const dx = dragCurrent.x - dragStart.x;
    const dy = dragCurrent.y - dragStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len >= 10) sfxFire();
    fireBottle(dx, dy);
  }
  dragStart   = null;
  dragCurrent = null;
}

// Mouse
canvas.addEventListener('mousedown',  e => { e.preventDefault(); onPointerDown(e.clientX, e.clientY); });
canvas.addEventListener('mousemove',  e => { e.preventDefault(); onPointerMove(e.clientX, e.clientY); });
canvas.addEventListener('mouseup',    e => { e.preventDefault(); onPointerUp(e.clientX, e.clientY); });
canvas.addEventListener('mouseleave', e => { onPointerUp(e.clientX, e.clientY); });

// Touch
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  onPointerDown(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  onPointerMove(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  onPointerUp(t.clientX, t.clientY);
}, { passive: false });

// ─────────────────────────────────────────────────────────
//  OVERLAY BUTTONS
// ─────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  unlockAudio();
  overlay.classList.remove('active');
  startGame();
});

restartBtn.addEventListener('click', () => {
  unlockAudio();
  gameoverOverlay.classList.remove('active');
  startGame();
});