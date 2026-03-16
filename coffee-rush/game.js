// ─────────────────────────────────────────────────────────
//  KOBIE'S COFFEE RUSH  —  Falling catcher game
//  All art drawn via canvas API, no sprites.
// ─────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const GAME_W = 480;
const GAME_H = 640;

// ── Canvas sizing ─────────────────────────────────────────
let canvasRect = null;
let _rszW = 0, _rszH = 0, _rszX = 0, _rszY = 0;

function resizeCanvas() {
  const vv = window.visualViewport || { width: window.innerWidth, height: window.innerHeight };
  const vw = Math.floor(vv.width), vh = Math.floor(vv.height);
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const reservedTop   = 40;
  const reservedBelow = isTouch ? 60 : 36;
  const availW = vw - (isTouch ? 8 : 0);
  const availH = vh - reservedTop - reservedBelow;
  const scale = Math.min(availW / GAME_W, availH / GAME_H);
  const w = Math.floor(GAME_W * scale);
  const h = Math.floor(GAME_H * scale);
  const x = Math.floor((vw - w) / 2);
  const y = reservedTop + Math.floor((availH - h) / 2);
  canvas.style.width    = w + 'px';
  canvas.style.height   = h + 'px';
  canvas.style.position = 'fixed';
  canvas.style.left     = x + 'px';
  canvas.style.top      = y + 'px';
  const r = document.documentElement.style;
  r.setProperty('--canvas-left',   x + 'px');
  r.setProperty('--canvas-top',    y + 'px');
  r.setProperty('--canvas-width',  w + 'px');
  r.setProperty('--canvas-height', h + 'px');
  _rszW = w; _rszH = h; _rszX = x; _rszY = y;
  if (canvas.width  !== GAME_W) canvas.width  = GAME_W;
  if (canvas.height !== GAME_H) canvas.height = GAME_H;
}

window.addEventListener('resize', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
window.addEventListener('load', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
resizeCanvas();
requestAnimationFrame(() => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });

function canvasPoint(clientX, clientY) {
  const rect = canvasRect || canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (GAME_W / rect.width),
    y: (clientY - rect.top)  * (GAME_H / rect.height),
  };
}

// ─────────────────────────────────────────────────────────
//  AUDIO
// ─────────────────────────────────────────────────────────
let audioCtx = null, musicBuffer = null, musicSource = null;
let musicGain = null, audioUnlocked = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

fetch('Assets/music.mp3')
  .then(r => r.arrayBuffer())
  .then(buf => {
    const ac = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    return ac.decodeAudioData(buf);
  })
  .then(d => {
    musicBuffer = d;
    if (audioUnlocked && !musicSource) startBgMusic();
    const btn = document.getElementById('start-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'START GAME'; }
  })
  .catch(() => {});

function startBgMusic() {
  const ac = getAudioCtx();
  if (!musicBuffer || !ac) return;
  if (musicSource) { try { musicSource.stop(); } catch(e) {} musicSource = null; }
  musicGain = ac.createGain();
  musicGain.gain.value = 0.45;
  musicGain.connect(ac.destination);
  musicSource = ac.createBufferSource();
  musicSource.buffer = musicBuffer;
  musicSource.loop   = true;
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
document.addEventListener('keydown', unlockAudio, { once: true });

function playTone(freq, endFreq, dur, type, gain, delay = 0) {
  const ac = getAudioCtx(), t = ac.currentTime + delay;
  const osc = ac.createOscillator(), env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + dur);
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env); env.connect(ac.destination);
  osc.start(t); osc.stop(t + dur + 0.01);
}

function playNoise(dur, gain, filterFreq = 600, delay = 0) {
  const ac = getAudioCtx(), t = ac.currentTime + delay;
  const frames = ac.sampleRate * (dur + 0.05);
  const buf = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(), filter = ac.createBiquadFilter(), env = ac.createGain();
  filter.type = 'bandpass'; filter.frequency.value = filterFreq; filter.Q.value = 0.8;
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.buffer = buf; src.connect(filter); filter.connect(env); env.connect(ac.destination);
  src.start(t); src.stop(t + dur + 0.05);
}

function sfxCatch()    { playTone(523, 784, 0.10, 'sine',     0.20); playNoise(0.06, 0.12, 1200); }
function sfxBad()      { playTone(220, 110, 0.25, 'sawtooth', 0.35); playNoise(0.20, 0.30, 200); }
function sfxMiss()     { playTone(300, 150, 0.20, 'triangle', 0.22); }
function sfxPowerUp()  { [523,659,784,1047].forEach((f,i) => playTone(f,f,0.09,'sine',0.25,i*0.06)); }
function sfxGameOver() { playTone(330,330,0.3,'square',0.3,0.0); playTone(247,247,0.3,'square',0.3,0.35); playTone(185,185,0.7,'square',0.3,0.70); }

// ─────────────────────────────────────────────────────────
//  ITEMS — what falls from the top
// ─────────────────────────────────────────────────────────
// type: 'good' = catch for points, 'bad' = dodge, 'power' = special bonus
const ITEM_DEFS = [
  // Good items — coffee and snacks
  { id: 'coffee',     type: 'good',  points: 10, label: '☕', draw: drawCoffee    },
  { id: 'latte',      type: 'good',  points: 15, label: '🥛', draw: drawLatte     },
  { id: 'croissant',  type: 'good',  points: 10, label: '🥐', draw: drawCroissant },
  { id: 'muffin',     type: 'good',  points: 12, label: '🧁', draw: drawMuffin    },
  { id: 'cookie',     type: 'good',  points: 8,  label: '🍪', draw: drawCookie    },
  // Bad items — dodge these
  { id: 'cold',       type: 'bad',   points: 0,  label: '🧊', draw: drawColdCup   },
  { id: 'rotten',     type: 'bad',   points: 0,  label: '🤢', draw: drawRottenFood},
  { id: 'alarm',      type: 'bad',   points: 0,  label: '⏰', draw: drawAlarm     },
  // Power-ups
  { id: 'star',       type: 'power', points: 50, label: '⭐', draw: drawStar      },
  { id: 'heart',      type: 'power', points: 0,  label: '❤️', draw: drawHeart, effect: 'life' },
];

// ─────────────────────────────────────────────────────────
//  DRAW HELPERS — all items drawn with canvas API
// ─────────────────────────────────────────────────────────

function drawCoffee(x, y, r) {
  // Cup body
  ctx.fillStyle = '#c8914a';
  ctx.beginPath();
  ctx.moveTo(x - r*0.7, y - r*0.5);
  ctx.lineTo(x - r*0.55, y + r*0.8);
  ctx.lineTo(x + r*0.55, y + r*0.8);
  ctx.lineTo(x + r*0.7, y - r*0.5);
  ctx.closePath();
  ctx.fill();
  // Sleeve
  ctx.fillStyle = '#8B5e3c';
  ctx.fillRect(x - r*0.68, y, r*1.36, r*0.45);
  // Coffee surface
  ctx.fillStyle = '#3d1c02';
  ctx.beginPath();
  ctx.ellipse(x, y - r*0.48, r*0.65, r*0.18, 0, 0, Math.PI*2);
  ctx.fill();
  // Steam
  ctx.strokeStyle = '#ffffff66';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i*r*0.25, y - r*0.65);
    ctx.quadraticCurveTo(x + i*r*0.25 + r*0.15, y - r*1.0, x + i*r*0.25, y - r*1.3);
    ctx.stroke();
  }
  // Handle
  ctx.strokeStyle = '#c8914a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x + r*0.82, y + r*0.15, r*0.28, -0.8, 0.8);
  ctx.stroke();
}

function drawLatte(x, y, r) {
  // Tall clear plastic cup
  ctx.fillStyle = 'rgba(220,240,255,0.35)';
  ctx.strokeStyle = '#aaddff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - r*0.55, y - r*0.85);
  ctx.lineTo(x - r*0.48, y + r*0.85);
  ctx.lineTo(x + r*0.48, y + r*0.85);
  ctx.lineTo(x + r*0.55, y - r*0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Milk layer (bottom)
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.moveTo(x - r*0.47, y + r*0.3);
  ctx.lineTo(x - r*0.47, y + r*0.85);
  ctx.lineTo(x + r*0.47, y + r*0.85);
  ctx.lineTo(x + r*0.47, y + r*0.3);
  ctx.closePath();
  ctx.fill();
  // Coffee layer (top of milk)
  ctx.fillStyle = '#7a4a1e';
  ctx.beginPath();
  ctx.moveTo(x - r*0.5, y - r*0.3);
  ctx.lineTo(x - r*0.47, y + r*0.3);
  ctx.lineTo(x + r*0.47, y + r*0.3);
  ctx.lineTo(x + r*0.5, y - r*0.3);
  ctx.closePath();
  ctx.fill();
  // Foam top
  ctx.fillStyle = '#fff8f0';
  ctx.beginPath();
  ctx.ellipse(x, y - r*0.82, r*0.5, r*0.14, 0, 0, Math.PI*2);
  ctx.fill();
  // Dome lid
  ctx.strokeStyle = '#aaddff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - r*0.82, r*0.5, Math.PI, 0);
  ctx.stroke();
  // Straw — pink, tall, prominent
  ctx.strokeStyle = '#ff69b4';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r*0.25, y + r*0.6);
  ctx.lineTo(x + r*0.35, y - r*1.5);
  ctx.stroke();
  // Straw stripe
  ctx.strokeStyle = '#ff69b488';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r*0.28, y + r*0.5);
  ctx.lineTo(x + r*0.38, y - r*1.4);
  ctx.stroke();
}

function drawCroissant(x, y, r) {
  // Crescent/horn shape using bezier curves for pointed ends
  ctx.fillStyle = '#c47a1a';
  ctx.beginPath();
  ctx.moveTo(x - r*0.85, y + r*0.2);
  ctx.bezierCurveTo(x - r*0.6, y - r*0.7, x + r*0.6, y - r*0.7, x + r*0.85, y + r*0.2);
  ctx.bezierCurveTo(x + r*0.55, y + r*0.55, x - r*0.55, y + r*0.55, x - r*0.85, y + r*0.2);
  ctx.closePath();
  ctx.fill();
  // Golden highlight layer
  ctx.fillStyle = '#e8b030';
  ctx.beginPath();
  ctx.moveTo(x - r*0.65, y + r*0.05);
  ctx.bezierCurveTo(x - r*0.4, y - r*0.55, x + r*0.4, y - r*0.55, x + r*0.65, y + r*0.05);
  ctx.bezierCurveTo(x + r*0.35, y + r*0.38, x - r*0.35, y + r*0.38, x - r*0.65, y + r*0.05);
  ctx.closePath();
  ctx.fill();
  // Pale centre shine
  ctx.fillStyle = '#f5d060';
  ctx.beginPath();
  ctx.ellipse(x, y - r*0.05, r*0.28, r*0.18, 0, 0, Math.PI*2);
  ctx.fill();
  // Layer lines along the curve
  ctx.strokeStyle = '#a05e10';
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i*r*0.35, y - r*0.38);
    ctx.quadraticCurveTo(x + i*r*0.2, y + r*0.28, x + i*r*0.42, y + r*0.45);
    ctx.stroke();
  }
}

function drawMuffin(x, y, r) {
  // Wrapper — pink with vertical stripes, clearly a muffin case
  ctx.fillStyle = '#ff69b4';
  ctx.beginPath();
  ctx.moveTo(x - r*0.6,  y + r*0.05);
  ctx.lineTo(x - r*0.45, y + r*0.85);
  ctx.lineTo(x + r*0.45, y + r*0.85);
  ctx.lineTo(x + r*0.6,  y + r*0.05);
  ctx.closePath();
  ctx.fill();
  // Wrapper stripes
  ctx.strokeStyle = '#ff4499';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i*r*0.22, y + r*0.05);
    ctx.lineTo(x + i*r*0.18, y + r*0.85);
    ctx.stroke();
  }
  // Wrapper top edge
  ctx.strokeStyle = '#ff4499';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - r*0.6, y + r*0.05);
  ctx.lineTo(x + r*0.6, y + r*0.05);
  ctx.stroke();
  // Big domed top — chocolate brown
  ctx.fillStyle = '#5a2810';
  ctx.beginPath();
  ctx.arc(x, y - r*0.18, r*0.72, Math.PI, 0);
  ctx.lineTo(x + r*0.6, y + r*0.08);
  ctx.lineTo(x - r*0.6, y + r*0.08);
  ctx.closePath();
  ctx.fill();
  // Dome highlight
  ctx.fillStyle = '#7a3a18';
  ctx.beginPath();
  ctx.arc(x - r*0.15, y - r*0.32, r*0.3, 0, Math.PI*2);
  ctx.fill();
  // Blueberries on dome — positioned relative to dome centre
  ctx.fillStyle = '#2a1050';
  for (const [dx, dy] of [[0.22, -0.05], [-0.2, -0.28], [0.0, -0.42], [-0.3, 0.08], [0.28, -0.32]]) {
    ctx.beginPath();
    ctx.arc(x + dx*r, y - r*0.18 + dy*r, r*0.1, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#4a2070';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function drawCookie(x, y, r) {
  // Cookie body — pale golden, with a bite taken out
  const biteAngle = 0.35; // bite from top-right
  ctx.fillStyle = '#e8b84b';
  ctx.beginPath();
  ctx.arc(x, y, r*0.78, biteAngle, Math.PI*2 + biteAngle - 0.05);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  // Slightly darker edge
  ctx.fillStyle = '#c8942a';
  ctx.beginPath();
  ctx.arc(x, y, r*0.78, biteAngle, Math.PI*2 + biteAngle - 0.05);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.strokeStyle = '#c8942a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner lighter surface
  ctx.fillStyle = '#f5c84a';
  ctx.beginPath();
  ctx.arc(x, y, r*0.65, biteAngle, Math.PI*2 + biteAngle - 0.05);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  // Bite crumbs — small pale pieces near the bite
  ctx.fillStyle = '#e8b84b';
  for (const [dx, dy, cr] of [[0.7, -0.55, 0.08],[0.85, -0.3, 0.06],[0.6, -0.75, 0.05]]) {
    ctx.beginPath();
    ctx.arc(x + dx*r, y + dy*r, cr*r, 0, Math.PI*2);
    ctx.fill();
  }
  // Choc chips — darker, clearly visible
  ctx.fillStyle = '#3a1a05';
  for (const [dx, dy] of [[-0.3,-0.2],[0.1,-0.35],[-0.1,0.2],[0.3,0.1],[-0.35,0.25]]) {
    ctx.beginPath();
    ctx.ellipse(x+dx*r, y+dy*r, r*0.11, r*0.09, 0.3, 0, Math.PI*2);
    ctx.fill();
  }
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(x - r*0.25, y - r*0.25, r*0.2, 0, Math.PI*2);
  ctx.fill();
}

function drawColdCup(x, y, r) {
  // Sad face
  ctx.fillStyle = '#ff4466';
  ctx.beginPath(); ctx.arc(x, y, r*0.82, 0, Math.PI*2); ctx.fill();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(x - r*0.28, y - r*0.28, r*0.28, 0, Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#1a0010';
  ctx.beginPath(); ctx.ellipse(x - r*0.28, y - r*0.15, r*0.13, r*0.16, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r*0.28, y - r*0.15, r*0.13, r*0.16, 0, 0, Math.PI*2); ctx.fill();
  // Sad mouth
  ctx.strokeStyle = '#1a0010';
  ctx.lineWidth = r*0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + r*0.38, r*0.32, Math.PI + 0.4, -0.4);
  ctx.stroke();
  // Tear drops
  ctx.fillStyle = '#88ccff';
  ctx.beginPath();
  ctx.moveTo(x - r*0.28, y + r*0.12);
  ctx.bezierCurveTo(x - r*0.38, y + r*0.28, x - r*0.38, y + r*0.42, x - r*0.28, y + r*0.48);
  ctx.bezierCurveTo(x - r*0.18, y + r*0.42, x - r*0.18, y + r*0.28, x - r*0.28, y + r*0.12);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r*0.28, y + r*0.12);
  ctx.bezierCurveTo(x + r*0.38, y + r*0.28, x + r*0.38, y + r*0.42, x + r*0.28, y + r*0.48);
  ctx.bezierCurveTo(x + r*0.18, y + r*0.42, x + r*0.18, y + r*0.28, x + r*0.28, y + r*0.12);
  ctx.closePath(); ctx.fill();
}

function drawRottenFood(x, y, r) {
  // Toxic fizzing can — unmistakably bad
  // Can body
  ctx.fillStyle = '#2a6e1a';
  ctx.beginPath();
  ctx.roundRect(x - r*0.55, y - r*0.6, r*1.1, r*1.4, [4, 4, 6, 6]);
  ctx.fill();
  // Can shine stripe
  ctx.fillStyle = '#3a8a22';
  ctx.beginPath();
  ctx.roundRect(x - r*0.18, y - r*0.55, r*0.22, r*1.3, 3);
  ctx.fill();
  // Top rim
  ctx.fillStyle = '#1a4a10';
  ctx.beginPath();
  ctx.roundRect(x - r*0.5, y - r*0.65, r*1.0, r*0.18, [4, 4, 0, 0]);
  ctx.fill();
  // Skull on can
  ctx.fillStyle = '#ccff44';
  // Skull head
  ctx.beginPath();
  ctx.arc(x, y + r*0.05, r*0.32, 0, Math.PI*2);
  ctx.fill();
  // Skull jaw
  ctx.beginPath();
  ctx.roundRect(x - r*0.22, y + r*0.22, r*0.44, r*0.2, [0, 0, 3, 3]);
  ctx.fill();
  // Skull eyes
  ctx.fillStyle = '#2a6e1a';
  ctx.beginPath(); ctx.arc(x - r*0.12, y + r*0.02, r*0.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.12, y + r*0.02, r*0.1, 0, Math.PI*2); ctx.fill();
  // Skull teeth
  ctx.fillStyle = '#2a6e1a';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.roundRect(x - r*0.18 + i*r*0.18, y + r*0.23, r*0.12, r*0.14, 1);
    ctx.fill();
  }
  // Fizz bubbles at top
  ctx.fillStyle = '#aaff44cc';
  for (const [dx, dy, br] of [[-0.25,-0.9,0.08],[0.1,-1.1,0.1],[0.35,-0.85,0.07],[-0.05,-1.25,0.06]]) {
    ctx.beginPath();
    ctx.arc(x + dx*r, y + dy*r, br*r, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawAlarm(x, y, r) {
  // Clock body
  ctx.fillStyle = '#ffcc44';
  ctx.beginPath();
  ctx.arc(x, y, r*0.72, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#cc8800';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Face
  ctx.fillStyle = '#fff8e0';
  ctx.beginPath();
  ctx.arc(x, y, r*0.58, 0, Math.PI*2);
  ctx.fill();
  // Hands pointing at 12 (urgent!)
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r*0.44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r*0.1, y); ctx.stroke();
  // Bells
  ctx.fillStyle = '#cc8800';
  ctx.beginPath(); ctx.arc(x - r*0.62, y - r*0.55, r*0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.62, y - r*0.55, r*0.2, 0, Math.PI*2); ctx.fill();
  // Vibration lines
  ctx.strokeStyle = '#ff4466';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x, y, r*0.82 + i*r*0.15, -0.5, 0.5);
    ctx.stroke();
  }
}

function drawStar(x, y, r, t = 0) {
  const points = 5;
  const outer  = r * 0.8;
  const inner  = r * 0.35;
  const rot    = t * 0.03;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, outer);
  grad.addColorStop(0, '#ffee44');
  grad.addColorStop(1, '#ff8800');
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const rad   = i % 2 === 0 ? outer : inner;
    i === 0 ? ctx.moveTo(Math.cos(angle)*rad, Math.sin(angle)*rad)
            : ctx.lineTo(Math.cos(angle)*rad, Math.sin(angle)*rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Glow
  ctx.shadowColor = '#ffee44';
  ctx.shadowBlur  = 14;
  ctx.fill();
  ctx.restore();
}

function drawHeart(x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  const grad = ctx.createRadialGradient(-r*0.1, -r*0.2, 0, 0, 0, r);
  grad.addColorStop(0, '#ff88aa');
  grad.addColorStop(1, '#ff2255');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, r*0.3);
  ctx.bezierCurveTo(-r*0.9, -r*0.2, -r*0.9, -r*0.9, 0, -r*0.4);
  ctx.bezierCurveTo(r*0.9, -r*0.9, r*0.9, -r*0.2, 0, r*0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-r*0.22, -r*0.35, r*0.18, r*0.12, -0.5, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

// Draw Kobie with a tray
function drawKobie(x, y, moving) {
  ctx.save();
  ctx.translate(x, y);

  const hairCol  = '#343432';
  const skinCol  = '#f5c6a0';
  const shirtCol = '#ff69b4';

  // Body
  ctx.fillStyle = shirtCol;
  ctx.beginPath();
  ctx.ellipse(0, -8, 20, 26, 0, 0, Math.PI*2);
  ctx.fill();

  // Shirt detail
  ctx.strokeStyle = '#ff4499';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, -18); ctx.lineTo(0, -10); ctx.lineTo(5, -18);
  ctx.stroke();

  // Legs (slight lean when moving)
  const lean = moving * 0.3;
  ctx.fillStyle = '#222244';
  ctx.beginPath();
  ctx.ellipse(-7 + lean, 16, 6, 12, lean, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7 + lean, 17, 6, 12, lean, 0, Math.PI*2);
  ctx.fill();

  // Neck
  ctx.fillStyle = skinCol;
  ctx.fillRect(-4, -30, 8, 12);

  // Head — hair back
  ctx.fillStyle = hairCol;
  ctx.beginPath();
  ctx.ellipse(0, -44, 18, 20, 0, 0, Math.PI*2);
  ctx.fill();

  // Curly hair sides
  ctx.lineWidth = 5;
  ctx.strokeStyle = hairCol;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s*14, -50);
    ctx.bezierCurveTo(s*22, -36, s*26, -16, s*20, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s*18, -20);
    ctx.bezierCurveTo(s*24, -8, s*20, 8, s*14, 14);
    ctx.stroke();
  }

  // Face
  ctx.fillStyle = skinCol;
  ctx.beginPath();
  ctx.ellipse(0, -44, 15, 17, 0, 0, Math.PI*2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.ellipse(-5, -47, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5,  -47, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-4, -48, 0.9, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,  -48, 0.9, 0, Math.PI*2); ctx.fill();

  // Eyebrows — raised/neutral based on moving
  ctx.strokeStyle = hairCol;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  const brow = moving !== 0 ? -2 : 0;
  ctx.beginPath(); ctx.moveTo(-8, -52 + brow); ctx.quadraticCurveTo(-5, -54 + brow, -2, -52 + brow); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8,  -52 + brow); ctx.quadraticCurveTo(5,  -54 + brow, 2,  -52 + brow); ctx.stroke();

  // Smile
  ctx.strokeStyle = '#c07850';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -40, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Blush
  ctx.fillStyle = 'rgba(255,150,150,0.28)';
  ctx.beginPath(); ctx.ellipse(-9, -41, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9,  -41, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();

  // Arms holding tray
  ctx.strokeStyle = skinCol;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18, -12); ctx.lineTo(-26, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, -12);  ctx.lineTo(26, 4);  ctx.stroke();

  // Tray
  ctx.fillStyle = '#c8914a';
  ctx.beginPath();
  ctx.roundRect(-30, 2, 60, 8, 3);
  ctx.fill();
  ctx.fillStyle = '#daa060';
  ctx.beginPath();
  ctx.roundRect(-28, 2, 56, 4, 2);
  ctx.fill();

  ctx.restore();
}

// Particle system
let particles = [];

function spawnCatchParticles(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      decay: 0.04 + Math.random() * 0.04,
      size: 3 + Math.random() * 4,
      color,
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= p.decay;
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = Math.max(0, p.life);
    const hex   = Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fillStyle = p.color + hex;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0, p.size * p.life), 0, Math.PI*2);
    ctx.fill();
  }
}

// Float texts
let floatTexts = [];
function addFloatText(x, y, text, color) {
  floatTexts.push({ x, y, text, color, life: 1 });
}

// Star field
const STARS = Array.from({ length: 55 }, () => {
  const a = Math.random() * 0.6 + 0.15;
  const v = Math.round(a * 255).toString(16).padStart(2, '0');
  return { x: Math.random() * GAME_W, y: Math.random() * GAME_H, r: Math.random() * 1.3 + 0.3, color: '#ff69b4' + v };
});

function drawBackground(frameCount) {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  for (const s of STARS) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();
  }
  // Scrolling floor grid for speed feel
  ctx.strokeStyle = '#ff69b410';
  ctx.lineWidth = 1;
  const gridY = GAME_H - 60;
  const scroll = (frameCount * 2) % 40;
  for (let x = -40 + scroll; x < GAME_W + 40; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x - 60, GAME_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x + 60, GAME_H);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, gridY);
  ctx.lineTo(GAME_W, gridY);
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────────────────
let state      = 'start';
let score      = 0;
let lives      = 3;
let frameCount = 0;
// Kobie
const KOBIE_Y   = GAME_H - 70;
const KOBIE_W   = 60;   // half-width of catch zone
let kobieX      = GAME_W / 2;
let kobieTarget = GAME_W / 2;
let kobieMoving = 0;   // -1 left, 0 still, 1 right — for animation

// Falling items
let items = [];
let spawnTimer  = 0;
let spawnRate   = 90;   // frames between spawns (decreases with score)
let fallSpeed   = 2.5;

// Shield power-up state
let shieldActive = false;
let shieldTimer  = 0;

// HUD
let _hudScore = -1, _hudLives = -1, _hudBest = -1, _hudPending = false;

function scheduleHUD() {
  if (_hudPending) return;
  _hudPending = true;
  requestAnimationFrame(() => {
    _hudPending = false;
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const bestEl  = document.getElementById('best');
    const best    = hsBest('kobie-coffee-rush');
    if (score !== _hudScore) { scoreEl.textContent = score; _hudScore = score; }
    if (lives !== _hudLives) {
      livesEl.textContent = '[ ' + 'I '.repeat(Math.max(0, lives)).trimEnd() + ' ]';
      _hudLives = lives;
    }
    if (best  !== _hudBest)  { bestEl.textContent  = best;  _hudBest  = best;  }
  });
}

// Overlays
const overlayEl       = document.getElementById('overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const finalScoreEl    = document.getElementById('final-score-display');
const startBtn        = document.getElementById('start-btn');

// Disable start button until audio is loaded
startBtn.disabled    = true;
startBtn.textContent = 'LOADING...';
const restartBtn      = document.getElementById('restart-btn');

function hideAllOverlays() {
  overlayEl.classList.remove('active');
  gameoverOverlay.classList.remove('active');
}

function startGame() {
  score       = 0;
  lives       = 3;
  frameCount  = 0;
  spawnTimer  = 0;
  spawnRate   = 90;
  fallSpeed   = 2.5;
  items       = [];
  particles   = [];
  floatTexts  = [];
  shieldActive = false;
  shieldTimer  = 0;
  kobieX      = GAME_W / 2;
  kobieTarget = GAME_W / 2;
  _hudScore   = _hudLives = _hudBest = -1;
  scheduleHUD();
  if (audioUnlocked && !musicSource) startBgMusic();
  state = 'playing';
}

function endGame() {
  state = 'gameover';
  sfxGameOver();
  stopBgMusic();
  hsSave('kobie-coffee-rush', score);
  finalScoreEl.textContent = `SCORE: ${score}`;
  hsRenderBest('kobie-coffee-rush', 'hs-gameover');
  gameoverOverlay.classList.add('active');
}

// ─────────────────────────────────────────────────────────
//  ITEM SPAWNING
// ─────────────────────────────────────────────────────────
function spawnItem() {
  // Weight pool — more good items than bad, rare power-ups
  const pool = [];
  for (let i = 0; i < 5; i++) pool.push('coffee', 'croissant', 'cookie');
  for (let i = 0; i < 3; i++) pool.push('latte', 'muffin');
  for (let i = 0; i < 3; i++) pool.push('cold', 'rotten', 'alarm');
  pool.push('star');
  if (lives < 3) pool.push('heart'); // more likely to spawn heart when hurt

  const id  = pool[Math.floor(Math.random() * pool.length)];
  const def = ITEM_DEFS.find(d => d.id === id);
  const r   = 22 + Math.random() * 8;
  const x   = r + Math.random() * (GAME_W - r * 2);

  items.push({
    x, y: -r,
    r,
    def,
    vy: fallSpeed + Math.random() * 1.2,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.06,
    frame: 0,
  });
}

// ─────────────────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────────────────
function update() {
  if (state !== 'playing') return;
  frameCount++;

  // Difficulty ramp — every 200 frames get slightly harder
  if (frameCount % 200 === 0) {
    fallSpeed  = Math.min(fallSpeed + 0.15, 6.5);
    spawnRate  = Math.max(spawnRate - 3, 42);
  }

  // Spawn items
  spawnTimer++;
  if (spawnTimer >= spawnRate) {
    spawnItem();
    spawnTimer = 0;
  }

  // Kobie smoothly follows target
  const dx = kobieTarget - kobieX;
  kobieX += dx * 0.18;
  kobieMoving = Math.abs(dx) > 2 ? Math.sign(dx) : 0;
  kobieX = Math.max(KOBIE_W, Math.min(GAME_W - KOBIE_W, kobieX));

  // Shield timer
  if (shieldActive) {
    shieldTimer--;
    if (shieldTimer <= 0) shieldActive = false;
  }

  // Update items
  for (const item of items) {
    item.y       += item.vy;
    item.rotation += item.spin;
    item.frame++;
  }

  // Check catches and misses
  items = items.filter(item => {
    // Caught by Kobie's tray
    const catchY = KOBIE_Y - 30;
    if (item.y + item.r >= catchY && item.y - item.r <= catchY + 12 &&
        Math.abs(item.x - kobieX) < KOBIE_W + item.r * 0.6) {

      if (item.def.type === 'good') {
        const pts = item.def.points * (shieldActive ? 2 : 1);
        score += pts;
        sfxCatch();
        spawnCatchParticles(item.x, catchY, '#ffcc44');
        addFloatText(item.x, catchY - 20, `+${pts}`, '#ffcc44');
        scheduleHUD();
      } else if (item.def.type === 'bad') {
        if (shieldActive) {
          spawnCatchParticles(item.x, catchY, '#4488ff');
          addFloatText(item.x, catchY - 20, 'BLOCKED!', '#4488ff');
        } else {
          lives--;
          sfxBad();
          spawnCatchParticles(item.x, catchY, '#ff4466');
          addFloatText(item.x, catchY - 20, '-1 LIFE', '#ff4466');
          scheduleHUD();
          if (lives <= 0) { endGame(); return false; }
        }
      } else if (item.def.type === 'power') {
        if (item.def.effect === 'life') {
          if (lives < 3) {
            lives++;
            scheduleHUD();
            addFloatText(item.x, catchY - 20, '+1 LIFE', '#ff88aa');
          } else {
            score += 20;
            scheduleHUD();
            addFloatText(item.x, catchY - 20, '+20', '#ff88aa');
          }
        } else {
          // Star — points + temporary score doubler
          score += item.def.points;
          shieldActive = true;
          shieldTimer  = 300; // 5 seconds at 60fps
          scheduleHUD();
          addFloatText(item.x, catchY - 20, '2X SCORE!', '#ffee44');
        }
        sfxPowerUp();
        spawnCatchParticles(item.x, catchY, '#ffee44');
      }
      return false; // remove item
    }

    // Fell off bottom
    if (item.y - item.r > GAME_H) {
      if (item.def.type === 'good') {
        lives--;
        sfxMiss();
        addFloatText(item.x, GAME_H - 60, 'MISSED!', '#ff4466');
        scheduleHUD();
        if (lives <= 0) { endGame(); return false; }
      }
      return false;
    }

    return true;
  });

  // Particles & float texts
  updateParticles();
  floatTexts = floatTexts.filter(f => f.life > 0);
  for (const f of floatTexts) { f.y -= 0.9; f.life -= 0.02; }
}

// ─────────────────────────────────────────────────────────
//  DRAW
// ─────────────────────────────────────────────────────────
function draw() {
  drawBackground(frameCount);

  if (state !== 'playing') return;

  // Draw falling items
  for (const item of items) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    item.def.draw(0, 0, item.r, item.frame);
    ctx.restore();
  }

  // Particles
  drawParticles();

  // Shield indicator
  if (shieldActive) {
    const alpha = 0.4 + Math.sin(frameCount * 0.15) * 0.2;
    ctx.strokeStyle = `rgba(68,136,255,${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(kobieX, KOBIE_Y - 20, KOBIE_W + 12, 55, 0, 0, Math.PI*2);
    ctx.stroke();
    // Timer bar
    const pct = shieldTimer / 300;
    ctx.fillStyle = '#4488ff44';
    ctx.fillRect(kobieX - 30, KOBIE_Y + 42, 60 * pct, 4);
    ctx.strokeStyle = '#4488ff88';
    ctx.lineWidth = 1;
    ctx.strokeRect(kobieX - 30, KOBIE_Y + 42, 60, 4);
  }

  // Kobie
  drawKobie(kobieX, KOBIE_Y, kobieMoving);

  // Float texts
  for (const f of floatTexts) {
    const alpha = Math.max(0, Math.min(1, f.life));
    const hex   = Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.save();
    ctx.font        = 'bold 15px "Courier New", monospace';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = f.color + hex;
    ctx.shadowColor = f.color + hex;
    ctx.shadowBlur  = 6;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

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
//  INPUT — mouse/touch follows cursor
// ─────────────────────────────────────────────────────────
function onMove(clientX) {
  const rect = canvasRect || canvas.getBoundingClientRect();
  kobieTarget = (clientX - rect.left) * (GAME_W / rect.width);
}

canvas.addEventListener('mousemove', e => { onMove(e.clientX); });
canvas.addEventListener('touchstart', e => { e.preventDefault(); unlockAudio(); onMove(e.touches[0].clientX); }, { passive: false });
canvas.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e.touches[0].clientX); }, { passive: false });
canvas.addEventListener('click', () => unlockAudio());

// ─────────────────────────────────────────────────────────
//  OVERLAY BUTTONS
// ─────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  unlockAudio();
  hideAllOverlays();
  startGame();
});

restartBtn.addEventListener('click', () => {
  unlockAudio();
  hideAllOverlays();
  startGame();
});