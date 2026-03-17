// ─────────────────────────────────────────────────────────
//  COLOUR CAPTURE  —  Tap the right coloured objects
//  All art drawn via canvas API, no sprites.
// ─────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

let GAME_W = 480;
let GAME_H = 640;

function recalcLayout() {
  // Nothing extra needed — drawTargetPanel uses GAME_W/H directly
}

// ── Canvas sizing ─────────────────────────────────────────
let canvasRect = null;
let _rszW = 0, _rszH = 0, _rszX = 0, _rszY = 0;

function resizeCanvas() {
  const vv = window.visualViewport || { width: window.innerWidth, height: window.innerHeight };
  const vw = Math.floor(vv.width), vh = Math.floor(vv.height);
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  let w, h, x, y;
  if (isTouch) {
    w = vw; h = vh; x = 0; y = 0;
  } else {
    const maxW = 420;
    const scale = Math.min(maxW / GAME_W, vh / GAME_H);
    w = Math.floor(GAME_W * scale);
    h = Math.floor(GAME_H * scale);
    x = Math.floor((vw - w) / 2);
    y = Math.floor((vh - h) / 2);
  }
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  canvas.style.position = 'fixed'; canvas.style.left = x + 'px'; canvas.style.top = y + 'px';
  const r = document.documentElement.style;
  r.setProperty('--canvas-left', x + 'px'); r.setProperty('--canvas-top', y + 'px');
  r.setProperty('--canvas-width', w + 'px'); r.setProperty('--canvas-height', h + 'px');
  _rszW = w; _rszH = h; _rszX = x; _rszY = y;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  GAME_W = w; GAME_H = h;
  recalcLayout();
}
window.addEventListener('resize', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
window.addEventListener('load', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
resizeCanvas();
requestAnimationFrame(() => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });

function canvasPoint(clientX, clientY) {
  const rect = canvasRect || canvas.getBoundingClientRect();
  return { x: (clientX - rect.left) * (GAME_W / rect.width), y: (clientY - rect.top) * (GAME_H / rect.height) };
}

// ─────────────────────────────────────────────────────────
//  AUDIO
// ─────────────────────────────────────────────────────────
let audioCtx = null, musicBuffer = null, musicSource = null, musicGain = null, audioUnlocked = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

fetch('Assets/music.mp3').then(r => r.arrayBuffer())
  .then(buf => { const ac = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); return ac.decodeAudioData(buf); })
  .then(d => {
    musicBuffer = d;
    if (audioUnlocked && !musicSource) startBgMusic();
    const btn = document.getElementById('start-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'START GAME'; }
  }).catch(() => {});

function startBgMusic() {
  const ac = getAudioCtx(); if (!musicBuffer) return;
  if (musicSource) { try { musicSource.stop(); } catch(e) {} musicSource = null; }
  musicGain = ac.createGain(); musicGain.gain.value = 0.45; musicGain.connect(ac.destination);
  musicSource = ac.createBufferSource(); musicSource.buffer = musicBuffer;
  musicSource.loop = true; musicSource.connect(musicGain); musicSource.start(0);
}
function stopBgMusic() { if (musicSource) { try { musicSource.stop(); } catch(e) {} musicSource = null; } }
function unlockAudio() {
  if (audioUnlocked) return; audioUnlocked = true;
  getAudioCtx().resume().catch(() => {});
}
document.addEventListener('keydown', unlockAudio, { once: true });

function playTone(freq, endFreq, dur, type, gain, delay = 0) {
  const ac = getAudioCtx(), t = ac.currentTime + delay;
  const osc = ac.createOscillator(), env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + dur);
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env); env.connect(ac.destination); osc.start(t); osc.stop(t + dur + 0.01);
}
function playNoise(dur, gain, freq = 600) {
  const ac = getAudioCtx(), t = ac.currentTime;
  const frames = ac.sampleRate * (dur + 0.05), buf = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buf.getChannelData(0); for (let i = 0; i < frames; i++) data[i] = Math.random()*2-1;
  const src = ac.createBufferSource(), flt = ac.createBiquadFilter(), env = ac.createGain();
  flt.type = 'bandpass'; flt.frequency.value = freq; flt.Q.value = 0.8;
  env.gain.setValueAtTime(gain, t); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.buffer = buf; src.connect(flt); flt.connect(env); env.connect(ac.destination);
  src.start(t); src.stop(t + dur + 0.05);
}

function sfxCorrect()  { playTone(523, 784, 0.10, 'sine', 0.25); playNoise(0.06, 0.1, 1200); }
function sfxWrong()    { playTone(220, 110, 0.18, 'sawtooth', 0.30); playNoise(0.12, 0.2, 200); }
function sfxColourChange() { [392, 523, 659].forEach((f,i) => playTone(f,f,0.08,'sine',0.18,i*0.06)); }
function sfxGameOver() { playTone(330,330,0.3,'square',0.3,0.0); playTone(247,247,0.3,'square',0.3,0.35); playTone(185,185,0.7,'square',0.3,0.70); }

// ─────────────────────────────────────────────────────────
//  TARGET COLOURS — the colours Kobie hunts for
// ─────────────────────────────────────────────────────────
const TARGET_COLOURS = [
  { name: 'RED',    num: 1, hex: '#ff3344', variants: ['#ff3344','#cc2233','#ff4455','#dd1122','#ff6677'] },
  { name: 'BLUE',   num: 2, hex: '#3388ff', variants: ['#3388ff','#2266dd','#4499ff','#1155cc','#5599ee'] },
  { name: 'YELLOW', num: 3, hex: '#ffdd00', variants: ['#ffdd00','#eebb00','#ffee33','#ccaa00','#ffcc11'] },
  { name: 'GREEN',  num: 4, hex: '#33cc66', variants: ['#33cc66','#22aa44','#44dd77','#119933','#55bb55'] },
  { name: 'PURPLE', num: 5, hex: '#aa44ff', variants: ['#aa44ff','#8822dd','#bb55ff','#7711cc','#9933ee'] },
  { name: 'ORANGE', num: 6, hex: '#ff8800', variants: ['#ff8800','#ee6600','#ff9911','#dd7700','#ffaa22'] },
  { name: 'PINK',   num: 7, hex: '#ff69b4', variants: ['#ff69b4','#ee4488','#ff88cc','#dd3377','#ff55aa'] },
];

// ─────────────────────────────────────────────────────────
//  OBJECT TYPES — everyday items drawn in various colours
// ─────────────────────────────────────────────────────────
const OBJ_TYPES = ['balloon', 'flower', 'umbrella', 'car', 'star', 'gem', 'hat', 'heart'];

// Draw a balloon
function drawBalloon(ctx, x, y, r, col) {
  // Body
  const grd = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.05, x, y, r);
  grd.addColorStop(0, lighten(col, 0.4));
  grd.addColorStop(1, darken(col, 0.2));
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(x - r*0.28, y - r*0.3, r*0.22, r*0.15, -0.5, 0, Math.PI*2); ctx.fill();
  // Knot
  ctx.fillStyle = darken(col, 0.3);
  ctx.beginPath(); ctx.arc(x, y + r + 2, 4, 0, Math.PI*2); ctx.fill();
  // String
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + r + 4);
  ctx.quadraticCurveTo(x + r*0.3, y + r*1.8, x, y + r*2.5); ctx.stroke();
}

// Draw a flower
function drawFlower(ctx, x, y, r, col) {
  // Petals
  ctx.fillStyle = col;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a)*r*0.55, y + Math.sin(a)*r*0.55, r*0.38, r*0.25, a, 0, Math.PI*2);
    ctx.fill();
  }
  // Centre
  ctx.fillStyle = '#ffee44';
  ctx.beginPath(); ctx.arc(x, y, r*0.32, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#cc8800';
  ctx.beginPath(); ctx.arc(x, y, r*0.18, 0, Math.PI*2); ctx.fill();
  // Stem
  ctx.strokeStyle = '#44aa44'; ctx.lineWidth = r*0.18; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + r*0.32); ctx.lineTo(x, y + r*1.3); ctx.stroke();
}

// Draw an umbrella
function drawUmbrella(ctx, x, y, r, col) {
  // Canopy
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r*0.85, Math.PI, 0); ctx.closePath(); ctx.fill();
  // Panels
  ctx.strokeStyle = darken(col, 0.25); ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a)*r*0.85, y + Math.sin(a)*r*0.85); ctx.stroke();
  }
  // Rim
  ctx.strokeStyle = lighten(col, 0.2); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r*0.85, Math.PI, 0); ctx.stroke();
  // Handle
  ctx.strokeStyle = '#8B5e3c'; ctx.lineWidth = r*0.14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + r*1.1);
  ctx.arc(x - r*0.22, y + r*1.1, r*0.22, 0, Math.PI); ctx.stroke();
}

// Draw a car (side view)
function drawCar(ctx, x, y, r, col) {
  // Body
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.roundRect(x - r*0.9, y, r*1.8, r*0.7, 6); ctx.fill();
  // Roof
  ctx.fillStyle = lighten(col, 0.15);
  ctx.beginPath();
  ctx.moveTo(x - r*0.5, y);
  ctx.lineTo(x - r*0.7, y - r*0.55);
  ctx.lineTo(x + r*0.5, y - r*0.55);
  ctx.lineTo(x + r*0.65, y);
  ctx.closePath(); ctx.fill();
  // Windows
  ctx.fillStyle = '#88ccff88';
  ctx.beginPath(); ctx.roundRect(x - r*0.62, y - r*0.48, r*0.48, r*0.38, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - r*0.04, y - r*0.48, r*0.48, r*0.38, 3); ctx.fill();
  // Wheels
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x - r*0.55, y + r*0.7, r*0.28, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.55, y + r*0.7, r*0.28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#aaa';
  ctx.beginPath(); ctx.arc(x - r*0.55, y + r*0.7, r*0.14, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.55, y + r*0.7, r*0.14, 0, Math.PI*2); ctx.fill();
  // Headlight
  ctx.fillStyle = '#ffffaa';
  ctx.beginPath(); ctx.ellipse(x + r*0.88, y + r*0.2, r*0.1, r*0.14, 0, 0, Math.PI*2); ctx.fill();
}

// Draw a star
function drawStar(ctx, x, y, r, col) {
  const outer = r*0.82, inner = r*0.36;
  const grd = ctx.createRadialGradient(x, y, 0, x, y, outer);
  grd.addColorStop(0, lighten(col, 0.3)); grd.addColorStop(1, col);
  ctx.fillStyle = grd;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI/2;
    const rad = i % 2 === 0 ? outer : inner;
    i === 0 ? ctx.moveTo(x + Math.cos(a)*rad, y + Math.sin(a)*rad)
            : ctx.lineTo(x + Math.cos(a)*rad, y + Math.sin(a)*rad);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(x - r*0.2, y - r*0.25, r*0.2, r*0.12, -0.5, 0, Math.PI*2); ctx.fill();
}

// Draw a gem / diamond
function drawGem(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  // Top facet
  ctx.beginPath();
  ctx.moveTo(x, y - r*0.88);
  ctx.lineTo(x - r*0.72, y - r*0.18);
  ctx.lineTo(x + r*0.72, y - r*0.18);
  ctx.closePath(); ctx.fill();
  // Bottom facet
  ctx.fillStyle = darken(col, 0.2);
  ctx.beginPath();
  ctx.moveTo(x - r*0.72, y - r*0.18);
  ctx.lineTo(x, y + r*0.88);
  ctx.lineTo(x + r*0.72, y - r*0.18);
  ctx.closePath(); ctx.fill();
  // Left facet
  ctx.fillStyle = lighten(col, 0.25);
  ctx.beginPath();
  ctx.moveTo(x - r*0.72, y - r*0.18);
  ctx.lineTo(x, y - r*0.88);
  ctx.lineTo(x, y + r*0.88);
  ctx.closePath(); ctx.fill();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(x - r*0.3, y - r*0.72);
  ctx.lineTo(x - r*0.62, y - r*0.22);
  ctx.lineTo(x - r*0.1, y - r*0.28);
  ctx.closePath(); ctx.fill();
}

// Draw a party hat
function drawHat(ctx, x, y, r, col) {
  // Hat cone
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r*0.92);
  ctx.lineTo(x - r*0.7, y + r*0.55);
  ctx.lineTo(x + r*0.7, y + r*0.55);
  ctx.closePath(); ctx.fill();
  // Stripes
  ctx.strokeStyle = lighten(col, 0.35); ctx.lineWidth = r*0.12;
  for (let i = 0.25; i < 1.0; i += 0.28) {
    const py = y - r*0.92 + (r*1.47)*i;
    const hw = r*0.7 * i;
    ctx.beginPath(); ctx.moveTo(x - hw, py); ctx.lineTo(x + hw, py); ctx.stroke();
  }
  // Brim
  ctx.fillStyle = darken(col, 0.15);
  ctx.beginPath(); ctx.ellipse(x, y + r*0.55, r*0.72, r*0.2, 0, 0, Math.PI*2); ctx.fill();
  // Pompom
  ctx.fillStyle = '#ffee44';
  ctx.beginPath(); ctx.arc(x, y - r*0.92, r*0.18, 0, Math.PI*2); ctx.fill();
}

// Draw a heart
function drawHeart(ctx, x, y, r, col) {
  const grd = ctx.createRadialGradient(x - r*0.1, y - r*0.2, 0, x, y, r);
  grd.addColorStop(0, lighten(col, 0.3)); grd.addColorStop(1, col);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(x, y + r*0.35);
  ctx.bezierCurveTo(x - r, y - r*0.15, x - r, y - r*0.85, x, y - r*0.35);
  ctx.bezierCurveTo(x + r, y - r*0.85, x + r, y - r*0.15, x, y + r*0.35);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.ellipse(x - r*0.25, y - r*0.38, r*0.22, r*0.14, -0.5, 0, Math.PI*2); ctx.fill();
}

// Colour helpers
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return [r, g, b];
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function lighten(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r + (255-r)*amt, g + (255-g)*amt, b + (255-b)*amt);
}
function darken(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r*(1-amt), g*(1-amt), b*(1-amt));
}

const DRAW_FNS = { balloon: drawBalloon, flower: drawFlower, umbrella: drawUmbrella,
                   car: drawCar, star: drawStar, gem: drawGem, hat: drawHat, heart: drawHeart };

// ─────────────────────────────────────────────────────────
//  STARS BACKGROUND
// ─────────────────────────────────────────────────────────
const STARS = Array.from({ length: 50 }, () => {
  const a = Math.random()*0.6+0.15, v = Math.round(a*255).toString(16).padStart(2,'0');
  return { x: Math.random()*GAME_W, y: Math.random()*GAME_H, r: Math.random()*1.3+0.3, color:'#ff69b4'+v };
});

// ─────────────────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────────────────
let state      = 'start';
let score      = 0;
let lives      = 3;
let frameCount = 0;

// Scrolling objects
let objects       = [];
let spawnTimer    = 0;
let spawnRate     = 75;
let maxObjects    = 6;

// Target colour
let targetIdx      = 0;
let targetColour   = TARGET_COLOURS[0];
let targetTimer    = 0;
const TARGET_INTERVAL = 60 * 8;

// Flash feedback
let flashAnims    = []; // { x, y, correct, life }

// Float texts
let floatTexts    = [];

// HUD
let _hudScore = -1, _hudBest = -1, _hudLives = -1, _hudPending = false;

function scheduleHUD() {
  // HUD is drawn on canvas each frame — nothing to do here
}

function addFloatText(x, y, text, color) { floatTexts.push({ x, y, text, color, life: 1 }); }

// Overlays
const overlayEl       = document.getElementById('overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const finalScoreEl    = document.getElementById('final-score-display');
const startBtn        = document.getElementById('start-btn');

// Disable start button until audio is loaded
startBtn.disabled    = true;
startBtn.textContent = 'LOADING...';
const restartBtn      = document.getElementById('restart-btn');

function hideAllOverlays() { overlayEl.classList.remove('active'); gameoverOverlay.classList.remove('active'); }

// ─────────────────────────────────────────────────────────
//  GAME INIT
// ─────────────────────────────────────────────────────────
function pickNewTarget() {
  let idx;
  do { idx = Math.floor(Math.random() * TARGET_COLOURS.length); } while (idx === targetIdx);
  targetIdx = idx;
  targetColour = TARGET_COLOURS[idx];
  sfxColourChange();
}

function startGame() {
  score = 0; lives = 3; frameCount = 0; spawnTimer = 0; targetTimer = 0;
  spawnRate = 75; maxObjects = 6;
  objects = []; flashAnims = []; floatTexts = [];
  targetIdx = -1; pickNewTarget();
  _hudScore = _hudBest = _hudLives = -1;
  scheduleHUD();
  if (audioUnlocked && !musicSource) startBgMusic();
  state = 'playing';
}

function endGame() {
  state = 'gameover';
  sfxGameOver(); stopBgMusic();
  hsSave('colour-capture', score);
  finalScoreEl.textContent = `SCORE: ${score}`;
  hsRenderBest('colour-capture', 'hs-gameover');
  gameoverOverlay.classList.add('active');
}

// ─────────────────────────────────────────────────────────
//  OBJECT SPAWNING
// ─────────────────────────────────────────────────────────
function randomColourFor(targetCol) {
  // 40% chance to be the target colour, 60% chance to be a distractor
  if (Math.random() < 0.4) {
    const variants = targetCol.variants;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  // Pick a distractor from a different colour
  const others = TARGET_COLOURS.filter(c => c !== targetCol);
  const other  = others[Math.floor(Math.random() * others.length)];
  return other.variants[Math.floor(Math.random() * other.variants.length)];
}

function isTargetColour(hex) {
  return targetColour.variants.some(v => v === hex);
}

function spawnObject() {
  const type  = OBJ_TYPES[Math.floor(Math.random() * OBJ_TYPES.length)];
  const col   = randomColourFor(targetColour);
  const r     = 24 + Math.random() * 16;
  const lanes = [80, 160, 240, 320, 400];
  const x     = lanes[Math.floor(Math.random() * lanes.length)] + (Math.random()-0.5)*20;
  // Find the colour number for this hex
  const colDef = TARGET_COLOURS.find(c => c.variants.includes(col));
  const num    = colDef ? colDef.num : '?';
  objects.push({
    x, y: -r * 2,
    r, type, col, num,
    speed: 1.8 + Math.random() * 0.6,
    wobble: Math.random() * Math.PI * 2,
    isTarget: isTargetColour(col),
    tapped: false,
  });
}

// ─────────────────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────────────────
function update() {
  if (state !== 'playing') return;
  frameCount++;

  // Rotate target colour every TARGET_INTERVAL frames
  targetTimer++;
  if (targetTimer >= TARGET_INTERVAL) {
    targetTimer = 0;
    pickNewTarget();
    for (const o of objects) { o.isTarget = isTargetColour(o.col); }
  }

  // Difficulty ramp every 300 frames — more objects on screen
  if (frameCount % 300 === 0) {
    spawnRate  = Math.max(spawnRate - 4, 28);
    maxObjects = Math.min(maxObjects + 1, 14);
  }

  // Spawn objects
  spawnTimer++;
  if (spawnTimer >= spawnRate && objects.length < maxObjects) { spawnObject(); spawnTimer = 0; }
  else if (spawnTimer >= spawnRate) { spawnTimer = 0; }

  // Update objects
  for (const o of objects) {
    o.y += o.speed;
    o.wobble += 0.04;
  }

  // Remove objects that scrolled off — missing a target costs a life
  objects = objects.filter(o => {
    if (o.y < GAME_H + 60) return true;
    if (o.isTarget && !o.tapped) {
      lives--;
      addFloatText(o.x, GAME_H - 60, 'MISSED!', '#ff4466');
      scheduleHUD();
      if (lives <= 0) { endGame(); return false; }
    }
    return false;
  });

  // Flash anims
  flashAnims = flashAnims.filter(f => f.life > 0);
  for (const f of flashAnims) { f.life -= 0.06; f.r += 0.8; }

  // Float texts
  floatTexts = floatTexts.filter(f => f.life > 0);
  for (const f of floatTexts) { f.y -= 1; f.life -= 0.022; }
}

// ─────────────────────────────────────────────────────────
//  DRAW
// ─────────────────────────────────────────────────────────
function drawBackground() {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  for (const s of STARS) {
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
  }
}

function drawLives() {
  const cx = GAME_W / 2, y = GAME_H - 22;
  ctx.fillStyle = '#ff69b470'; ctx.font = '9px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LIVES', cx, y - 6);
  for (let i = 0; i < 3; i++) {
    const hx = cx + (i - 1) * 28;
    const filled = i < lives;
    // Heart shape
    ctx.save(); ctx.translate(hx, y + 2);
    const grad = ctx.createRadialGradient(-3, -4, 0, 0, 0, 10);
    grad.addColorStop(0, filled ? '#ff88aa' : '#333355');
    grad.addColorStop(1, filled ? '#ff2255' : '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-10, -2, -10, -10, 0, -5);
    ctx.bezierCurveTo(10, -10, 10, -2, 0, 4);
    ctx.closePath(); ctx.fill();
    if (!filled) {
      ctx.strokeStyle = '#ff225544'; ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

function drawTargetPanel() {
  const panelH  = Math.round(GAME_H * 0.14);
  const swatchW = Math.round(GAME_W * 0.5);
  const swatchH = Math.round(panelH * 0.55);
  const swatchX = GAME_W/2 - swatchW/2;
  const swatchY = Math.round(panelH * 0.22);

  // Panel background
  ctx.fillStyle = '#111128';
  ctx.beginPath(); ctx.roundRect(0, 0, GAME_W, panelH, [0,0,12,12]); ctx.fill();
  ctx.strokeStyle = '#ff69b430'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, panelH); ctx.lineTo(GAME_W, panelH); ctx.stroke();

  // "CAPTURE THIS COLOUR" label
  ctx.fillStyle = '#ff69b4aa';
  ctx.font = `${Math.round(GAME_W * 0.022)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('CAPTURE THIS COLOUR', GAME_W/2, Math.round(panelH * 0.18));

  // Colour swatch
  ctx.fillStyle = targetColour.hex;
  ctx.beginPath(); ctx.roundRect(swatchX, swatchY, swatchW, swatchH, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.roundRect(swatchX + 6, swatchY + 5, swatchW - 12, 10, 4); ctx.fill();

  // Colour name
  const nameY  = swatchY + swatchH/2 + Math.round(swatchH * 0.2);
  const nameCX = GAME_W / 2;
  const nameFontSize = Math.round(GAME_W * 0.055);
  ctx.font = `bold ${nameFontSize}px "Courier New", monospace`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(targetColour.name, nameCX, nameY);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
  ctx.fillText(targetColour.name, nameCX, nameY);
  ctx.shadowBlur = 0;

  // Score / lives / best bar at bottom
  const HUD_H = Math.round(GAME_H * 0.056);
  ctx.fillStyle = 'rgba(10,10,26,0.75)';
  ctx.fillRect(0, GAME_H - HUD_H, GAME_W, HUD_H);
  ctx.strokeStyle = '#ff69b430'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, GAME_H - HUD_H); ctx.lineTo(GAME_W, GAME_H - HUD_H); ctx.stroke();
  const hudFontSize = Math.round(GAME_W * 0.03);
  ctx.font = `bold ${hudFontSize}px "Courier New", monospace`;
  ctx.fillStyle = '#ff69b4';
  ctx.textBaseline = 'middle';
  const hudY = GAME_H - HUD_H / 2;
  ctx.textAlign = 'left';   ctx.fillText('SCORE: ' + score, 12, hudY);
  ctx.textAlign = 'center'; ctx.fillText('[ ' + 'I '.repeat(Math.max(0,lives)).trimEnd() + ' ]', GAME_W / 2, hudY);
  ctx.textAlign = 'right';  ctx.fillText('BEST: ' + (typeof hsBest === 'function' ? hsBest('colour-capture') : 0), GAME_W - 12, hudY);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

function draw() {
  drawBackground();
  if (state !== 'playing') return;

  // Objects
  for (const o of objects) {
    ctx.save();
    ctx.translate(Math.sin(o.wobble) * 3, 0);
    DRAW_FNS[o.type](ctx, o.x, o.y, o.r, o.col);
    ctx.restore();
  }

  // Flash rings on tap
  for (const f of flashAnims) {
    const alpha = Math.max(0, f.life);
    const hex   = Math.round(alpha * 255).toString(16).padStart(2,'0');
    ctx.strokeStyle = (f.correct ? '#44ff88' : '#ff4466') + hex;
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.stroke();
  }

  // Float texts
  for (const f of floatTexts) {
    const alpha = Math.max(0, Math.min(1, f.life));
    const hex   = Math.round(alpha * 255).toString(16).padStart(2,'0');
    ctx.save();
    ctx.font        = 'bold 16px "Courier New", monospace';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = f.color + hex;
    ctx.shadowColor = f.color + hex; ctx.shadowBlur = 6;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  drawTargetPanel();
}

// ─────────────────────────────────────────────────────────
//  TAP / CLICK HANDLER
// ─────────────────────────────────────────────────────────
function onTap(clientX, clientY) {
  unlockAudio();
  if (state !== 'playing') return;
  const pt = canvasPoint(clientX, clientY);

  // Find topmost tapped object
  let hit = null;
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.tapped) continue;
    if (Math.hypot(pt.x - o.x, pt.y - o.y) < o.r * 1.1) { hit = o; break; }
  }

  if (!hit) return;
  hit.tapped = true;

  if (hit.isTarget) {
    score += 10;
    sfxCorrect();
    flashAnims.push({ x: hit.x, y: hit.y, r: hit.r, correct: true, life: 1 });
    addFloatText(hit.x, hit.y - hit.r - 10, '+10', '#44ff88');
    objects.splice(objects.indexOf(hit), 1);
    scheduleHUD();
  } else {
    lives--;
    sfxWrong();
    flashAnims.push({ x: hit.x, y: hit.y, r: hit.r, correct: false, life: 1 });
    addFloatText(hit.x, hit.y - hit.r - 10, '-1 LIFE', '#ff4466');
    objects.splice(objects.indexOf(hit), 1);
    scheduleHUD();
    if (lives <= 0) { endGame(); return; }
  }
}

canvas.addEventListener('click',      e => { e.preventDefault(); onTap(e.clientX, e.clientY); });
canvas.addEventListener('touchstart', e => { e.preventDefault(); unlockAudio(); const t = e.touches[0]; onTap(t.clientX, t.clientY); }, { passive: false });

// ─────────────────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────────────────
let _lastTs = 0;
function loop(ts = 0) {
  requestAnimationFrame(loop);
  if (ts - _lastTs < 16.5) return; // cap at ~60fps
  _lastTs = ts;
  update();
  draw();
}
requestAnimationFrame(loop);

// ─────────────────────────────────────────────────────────
//  OVERLAY BUTTONS
// ─────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => { unlockAudio(); hideAllOverlays(); startGame(); });
restartBtn.addEventListener('click', () => { unlockAudio(); hideAllOverlays(); startGame(); });