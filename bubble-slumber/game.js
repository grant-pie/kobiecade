// ─────────────────────────────────────────────────────────
//  BUBBLE SLUMBER  —  Bubble Shooter
//  All art drawn via canvas API, no sprites.
// ─────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

let GAME_W = 480;
let GAME_H = 700;
let SHOOTER_X = GAME_W / 2;
let SHOOTER_Y = GAME_H - 80;
let R = 22, COLS = 8, COL_W = R*2;
let GRID_X = (GAME_W-COLS*COL_W)/2, GRID_TOP = 48;
let ROW_H = R*1.85, DANGER_Y = GAME_H - 175;

function recalcLayout() {
  R        = Math.floor(GAME_W / (COLS * 2 + 1));
  COL_W    = R * 2;
  GRID_X   = (GAME_W - COLS * COL_W) / 2;
  GRID_TOP = Math.round(GAME_H * 0.06);
  ROW_H    = R * 1.85;
  DANGER_Y = GAME_H - Math.round(GAME_H * 0.22);
  SHOOTER_X = GAME_W / 2;
  SHOOTER_Y = GAME_H - Math.round(GAME_H * 0.11);
}

// ── Canvas sizing (letterbox) ─────────────────────────────
let canvasRect = null;
let _rszW = 0, _rszH = 0, _rszX = 0, _rszY = 0;

// ─────────────────────────────────────────────────────────
//  STAR FIELD — declared here so generateStars() is available
//  when resizeCanvas() is first called below.
// ─────────────────────────────────────────────────────────
let STARS = [];
function generateStars() {
  STARS = Array.from({ length: 60 }, () => {
    const a = Math.random() * 0.6 + 0.15;
    const v = Math.round(a * 255).toString(16).padStart(2, '0');
    const cols = ['#cc88ff', '#8844ff', '#4488ff', '#ffccff', '#ffffff'];
    const col = cols[Math.floor(Math.random() * cols.length)];
    return { x: Math.random() * GAME_W, y: Math.random() * GAME_H, r: Math.random() * 1.4 + 0.3, color: col + v };
  });
}

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
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  GAME_W = w; GAME_H = h;
  recalcLayout();
  generateStars();
}

window.addEventListener('resize', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
window.addEventListener('load', () => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });
resizeCanvas();
requestAnimationFrame(() => { resizeCanvas(); canvasRect = canvas.getBoundingClientRect(); });

function canvasPoint(clientX, clientY) {
  const rect  = canvasRect || canvas.getBoundingClientRect();
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
    // Re-enable start button now that audio is ready
    const btn = document.getElementById('start-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'ENTER DREAMWORLD'; }
  })
  .catch(() => {
    // Even on failure, unblock the button
    const btn = document.getElementById('start-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'ENTER DREAMWORLD'; }
  });

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
  getAudioCtx().resume().then(startBgMusic).catch(() => {});
}
document.addEventListener('keydown', unlockAudio, { once: true });

function playTone(freq, endFreq, dur, type, gain, delay = 0) {
  const ac = getAudioCtx(), t = ac.currentTime + delay;
  const osc = ac.createOscillator(), env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq,1), t + dur);
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

function sfxShoot()   { playTone(400, 800, 0.08, 'sine', 0.15); playNoise(0.05, 0.1, 800); }
function sfxPop()     { playTone(600, 300, 0.12, 'sine', 0.22); playNoise(0.10, 0.25, 1000); }
function sfxCombo()   { [523,659,784,1047].forEach((f,i) => playTone(f,f,0.10,'sine',0.20,i*0.07)); }
function sfxDrop()    { playTone(200, 60,  0.40, 'sawtooth', 0.35); playNoise(0.3, 0.4, 200); }
function sfxGameOver(){ playTone(330,330,0.3,'square',0.3,0.0); playTone(247,247,0.3,'square',0.3,0.35); playTone(185,185,0.7,'square',0.3,0.70); }
function sfxWin()     { [392,494,587,698,784].forEach((f,i) => playTone(f,f,0.14,'sine',0.25,i*0.09)); }

// ─────────────────────────────────────────────────────────
//  BUBBLE COLOURS — 4 dream categories
// ─────────────────────────────────────────────────────────
const COLOURS = [
  { fill: '#cc44ff', stroke: '#dd88ff', label: 'NIGHTMARE' },  // 0 purple
  { fill: '#4488ff', stroke: '#88bbff', label: 'DAYDREAM'  },  // 1 blue
  { fill: '#ffcc44', stroke: '#ffdd88', label: 'MEMORY'    },  // 2 gold
  { fill: '#44ddaa', stroke: '#88eebb', label: 'LUCID'     },  // 3 teal
];
const NUM_COLOURS = COLOURS.length;

// ─────────────────────────────────────────────────────────
//  SPECIAL BUBBLE TYPES
//  Stored as negative sentinel values so they never clash
//  with normal colour indices (0-3) or empty (-1).
// ─────────────────────────────────────────────────────────
const BUBBLE_WILDCARD = -10;  // matches any colour
const BUBBLE_BOMB     = -20;  // pops all bubbles within blast radius

// Every WILDCARD_INTERVAL shots the player receives a wildcard.
// Every BOMB_INTERVAL shots the player receives a bomb.
// If both would fire on the same shot, bomb takes priority.
const WILDCARD_INTERVAL = 8;
const BOMB_INTERVAL     = 15;

// ─────────────────────────────────────────────────────────
//  GRID CONSTANTS
// ─────────────────────────────────────────────────────────
// layout vars declared at top of file

// ─────────────────────────────────────────────────────────
//  DRAW HELPERS
// ─────────────────────────────────────────────────────────

// Draw a dream bubble at cx,cy with radius r
function drawDreamBubble(cx, cy, r, colIdx) {
  // ── Special: WILDCARD ─────────────────────────────────
  if (colIdx === BUBBLE_WILDCARD) {
    drawWildcardBubble(cx, cy, r);
    return;
  }
  // ── Special: BOMB ─────────────────────────────────────
  if (colIdx === BUBBLE_BOMB) {
    drawBombBubble(cx, cy, r);
    return;
  }

  const c = COLOURS[colIdx];

  ctx.save();

  // Outer glow
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = c.fill + '22';
  ctx.fill();

  // Bubble body
  const grd = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
  grd.addColorStop(0, c.fill + 'dd');
  grd.addColorStop(1, c.fill + '88');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Shine
  ctx.beginPath();
  ctx.arc(cx - r*0.28, cy - r*0.28, r*0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();

  // ── Dream icon — unique per category ──────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.strokeStyle = 'rgba(255,255,255,0.80)';

  if (colIdx === 0) {
    // NIGHTMARE — jagged lightning bolt
    ctx.beginPath();
    ctx.moveTo(cx + r*0.1, cy - r*0.5);
    ctx.lineTo(cx - r*0.15, cy - r*0.05);
    ctx.lineTo(cx + r*0.08, cy - r*0.05);
    ctx.lineTo(cx - r*0.1, cy + r*0.5);
    ctx.lineTo(cx + r*0.18, cy + r*0.05);
    ctx.lineTo(cx - r*0.05, cy + r*0.05);
    ctx.closePath();
    ctx.fill();
  } else if (colIdx === 1) {
    // DAYDREAM — crescent moon
    ctx.beginPath();
    ctx.arc(cx, cy, r*0.42, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = c.fill + 'dd';
    ctx.beginPath();
    ctx.arc(cx + r*0.14, cy - r*0.08, r*0.34, 0, Math.PI*2);
    ctx.fill();
    // small stars
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    for (const [sx, sy, sr] of [[r*0.38, -r*0.38, 2.5], [-r*0.3, r*0.3, 2]]) {
      ctx.beginPath(); ctx.arc(cx+sx, cy+sy, sr, 0, Math.PI*2); ctx.fill();
    }
  } else if (colIdx === 2) {
    // MEMORY — small hourglass shape
    ctx.lineWidth = 1.5;
    const hw = r*0.28, hh = r*0.44;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh); ctx.lineTo(cx + hw, cy - hh);
    ctx.lineTo(cx - hw, cy + hh); ctx.lineTo(cx + hw, cy + hh);
    ctx.closePath(); ctx.stroke();
    // sand fill top
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh);
    ctx.lineTo(cx + hw, cy - hh);
    ctx.lineTo(cx, cy);
    ctx.closePath(); ctx.fill();
    // sand fill bottom (half full)
    ctx.beginPath();
    ctx.moveTo(cx, cy + r*0.05);
    ctx.lineTo(cx - hw*0.5, cy + hh);
    ctx.lineTo(cx + hw*0.5, cy + hh);
    ctx.closePath(); ctx.fill();
  } else if (colIdx === 3) {
    // LUCID — eye symbol
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - r*0.45, cy);
    ctx.quadraticCurveTo(cx, cy - r*0.38, cx + r*0.45, cy);
    ctx.quadraticCurveTo(cx, cy + r*0.38, cx - r*0.45, cy);
    ctx.closePath(); ctx.stroke();
    // Iris
    ctx.beginPath(); ctx.arc(cx, cy, r*0.2, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    // Pupil
    ctx.beginPath(); ctx.arc(cx, cy, r*0.1, 0, Math.PI*2);
    ctx.fillStyle = c.fill + 'cc'; ctx.fill();
  }

  ctx.restore();
}

// ── Wildcard bubble — rainbow spinning ring ────────────────
function drawWildcardBubble(cx, cy, r) {
  ctx.save();

  // Animated rainbow glow ring
  const now = Date.now() / 600;
  for (let i = 0; i < 6; i++) {
    const hue = ((i / 6) * 360 + now * 60) % 360;
    const a = (i / 6) * Math.PI * 2 + now;
    const px = cx + Math.cos(a) * (r * 0.35);
    const py = cy + Math.sin(a) * (r * 0.35);
    ctx.beginPath();
    ctx.arc(px, py, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue},100%,70%,0.55)`;
    ctx.fill();
  }

  // White body
  const grd = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.05, cx, cy, r);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(1, 'rgba(200,180,255,0.75)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shine
  ctx.beginPath();
  ctx.arc(cx - r*0.28, cy - r*0.28, r*0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  // Star icon
  ctx.fillStyle = 'rgba(180,100,255,0.95)';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outer = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const inner = outer + Math.PI / 5;
    const ox = cx + Math.cos(outer) * r * 0.45;
    const oy = cy + Math.sin(outer) * r * 0.45;
    const ix = cx + Math.cos(inner) * r * 0.2;
    const iy = cy + Math.sin(inner) * r * 0.2;
    i === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ── Bomb bubble — dark with fuse spark ────────────────────
function drawBombBubble(cx, cy, r) {
  ctx.save();

  // Outer red glow
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,60,0,0.18)';
  ctx.fill();

  // Dark body
  const grd = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
  grd.addColorStop(0, '#555566');
  grd.addColorStop(1, '#1a1a2a');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = '#ff4422';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shine
  ctx.beginPath();
  ctx.arc(cx - r*0.28, cy - r*0.28, r*0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();

  // Fuse
  ctx.strokeStyle = '#aa8855';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + r*0.1, cy - r*0.7);
  ctx.quadraticCurveTo(cx + r*0.55, cy - r*1.0, cx + r*0.4, cy - r*1.35);
  ctx.stroke();

  // Fuse spark (animated)
  const spark = (Date.now() / 150) % 1;
  const sparkAlpha = 0.6 + Math.sin(Date.now() / 80) * 0.4;
  ctx.beginPath();
  ctx.arc(cx + r*0.4, cy - r*1.35, r*0.18, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,200,50,${sparkAlpha})`;
  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Skull icon
  ctx.fillStyle = 'rgba(255,80,40,0.90)';
  // Skull dome
  ctx.beginPath();
  ctx.arc(cx, cy + r*0.05, r*0.32, Math.PI, 0);
  ctx.lineTo(cx + r*0.32, cy + r*0.32);
  ctx.lineTo(cx - r*0.32, cy + r*0.32);
  ctx.closePath();
  ctx.fill();
  // Eye sockets
  ctx.fillStyle = '#1a1a2a';
  ctx.beginPath(); ctx.arc(cx - r*0.13, cy + r*0.04, r*0.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r*0.13, cy + r*0.04, r*0.1, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

// Draw Kobie in pyjamas — dream shooter at bottom
function drawKobie(cx, cy, aimAngle) {
  ctx.save();
  ctx.translate(cx, cy);

  const hairCol  = '#343432';
  const skinCol  = '#f5c6a0';
  const pyjamaCol = '#8844cc';   // purple pyjamas
  const pyjamaStripe = '#aa66ee';

  // ── Pyjama body ───────────────────────────────────────
  ctx.fillStyle = pyjamaCol;
  ctx.beginPath();
  ctx.ellipse(0, 12, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pyjama stripes
  ctx.strokeStyle = pyjamaStripe;
  ctx.lineWidth = 2;
  for (let i = -12; i <= 12; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, -4);
    ctx.lineTo(i - 3, 32);
    ctx.stroke();
  }

  // Stars on pyjamas
  ctx.fillStyle = 'rgba(255,220,100,0.5)';
  for (const [sx, sy] of [[-8, 8], [7, 16], [-4, 24]]) {
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI*2); ctx.fill();
  }

  // ── Neck ──────────────────────────────────────────────
  ctx.fillStyle = skinCol;
  ctx.fillRect(-4, -6, 8, 10);

  // ── Head ──────────────────────────────────────────────
  ctx.fillStyle = skinCol;
  ctx.beginPath();
  ctx.ellipse(0, -18, 14, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Long curly hair — back layer ──────────────────────
  ctx.fillStyle = hairCol;
  ctx.beginPath();
  ctx.ellipse(0, -18, 17, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Long hair falling down sides
  ctx.beginPath();
  ctx.moveTo(-14, -24);
  ctx.bezierCurveTo(-22, -10, -24, 10, -18, 28);
  ctx.bezierCurveTo(-22, 32, -20, 38, -14, 36);
  ctx.bezierCurveTo(-10, 42, -8, 36, -12, 30);
  ctx.bezierCurveTo(-16, 18, -14, 4, -10, -8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(14, -24);
  ctx.bezierCurveTo(22, -10, 24, 10, 18, 28);
  ctx.bezierCurveTo(22, 32, 20, 38, 14, 36);
  ctx.bezierCurveTo(10, 42, 8, 36, 12, 30);
  ctx.bezierCurveTo(16, 18, 14, 4, 10, -8);
  ctx.closePath();
  ctx.fill();

  // Individual curls
  ctx.strokeStyle = hairCol;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  [
    [[-16, 14], [-22, 20], [-18, 28], [-14, 24]],
    [[-15, 24], [-22, 30], [-17, 38], [-12, 34]],
    [[16, 14],  [22, 20],  [18, 28],  [14, 24]],
    [[15, 24],  [22, 30],  [17, 38],  [12, 34]],
  ].forEach(pts => {
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    ctx.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]);
    ctx.stroke();
  });

  // Hair highlight
  ctx.strokeStyle = '#555553';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, -34); ctx.bezierCurveTo(-2, -30, 2, -30, 6, -34);
  ctx.stroke();

  // ── Face ─────────────────────────────────────────────
  ctx.fillStyle = skinCol;
  ctx.beginPath();
  ctx.ellipse(0, -18, 13, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sleepy half-closed eyes
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.ellipse(-5, -20, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5,  -20, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
  // Eyelids (half closed — sleepy)
  ctx.fillStyle = skinCol;
  ctx.beginPath(); ctx.ellipse(-5, -21.5, 2.8, 1.8, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5,  -21.5, 2.8, 1.8, 0, Math.PI, 0); ctx.fill();
  // Eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-4.2, -21, 0.9, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(5.8,  -21, 0.9, 0, Math.PI*2); ctx.fill();

  // Eyebrows
  ctx.strokeStyle = hairCol; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-7.5, -24); ctx.quadraticCurveTo(-5, -26, -2.5, -24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7.5,  -24); ctx.quadraticCurveTo(5,  -26, 2.5,  -24); ctx.stroke();

  // Small smile
  ctx.strokeStyle = '#c07850'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -12, 4, 0.3, Math.PI - 0.3); ctx.stroke();

  // Blush
  ctx.fillStyle = 'rgba(255,150,150,0.30)';
  ctx.beginPath(); ctx.ellipse(-8, -14, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8,  -14, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();

  // ZZZ floating above head
  ctx.fillStyle = 'rgba(180,140,255,0.7)';
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('z z z', 0, -42);

  // ── Dream wand arm ────────────────────────────────────
  ctx.strokeStyle = pyjamaCol;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const armLen = 28;
  ctx.lineTo(Math.cos(aimAngle) * armLen, Math.sin(aimAngle) * armLen);
  ctx.stroke();

  // Wand tip — glowing star
  const wx = Math.cos(aimAngle) * armLen;
  const wy = Math.sin(aimAngle) * armLen;
  ctx.shadowColor = '#ffdd44';
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = '#ffdd44';
  ctx.beginPath(); ctx.arc(wx, wy, 5, 0, Math.PI*2); ctx.fill();
  // Star sparkle
  ctx.strokeStyle = '#ffee88'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(a)*3, wy + Math.sin(a)*3);
    ctx.lineTo(wx + Math.cos(a)*7, wy + Math.sin(a)*7);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  ctx.restore();
}

// Pop burst particles
function drawBurst(cx, cy, colIdx, progress) {
  // Special bubbles use a white/gold burst
  const c = (colIdx >= 0) ? COLOURS[colIdx]
          : colIdx === BUBBLE_WILDCARD ? { fill: '#ffffff' }
          : { fill: '#ff6622' }; // bomb
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist  = progress * R * 2.2;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const alpha = Math.max(0, 1 - progress);
    const size  = Math.max(0, (1 - progress) * 5);
    const hex   = Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fillStyle = c.fill + hex;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────
//  HIGHSCORE SAFE WRAPPERS
//  hsBest / hsSave / hsRenderBest are defined in an external script.
//  These fallbacks prevent crashes if that script hasn't loaded yet.
// ─────────────────────────────────────────────────────────
if (typeof hsBest       !== 'function') window.hsBest       = () => 0;
if (typeof hsSave       !== 'function') window.hsSave       = () => {};
if (typeof hsRenderBest !== 'function') window.hsRenderBest = () => {};

// ─────────────────────────────────────────────────────────
//  STAR FIELD
// ─────────────────────────────────────────────────────────

function drawBackground() {
  // Deep dream sky gradient
  const bgGrd = ctx.createLinearGradient(0, 0, 0, GAME_H);
  bgGrd.addColorStop(0, '#08041a');
  bgGrd.addColorStop(0.5, '#0d0820');
  bgGrd.addColorStop(1, '#120a28');
  ctx.fillStyle = bgGrd;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  for (const s of STARS) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Danger line — soft lavender
  ctx.strokeStyle = '#cc88ff40';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(0, DANGER_Y);
  ctx.lineTo(GAME_W, DANGER_Y);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ─────────────────────────────────────────────────────────
//  GRID  —  hex-offset bubble grid
// ─────────────────────────────────────────────────────────
// grid[row][col] = colIdx (0-3) or -1 (empty)
let grid = [];

// gridRowParity[row] stores the visual parity (0 or 1) for each row.
// Set at row creation time and never changes — immune to index drift.
// parity 0 = even (full COLS wide, no x offset)
// parity 1 = odd  (COLS-1 wide, shifted right by R)
let gridRowParity = [];

// Track the parity of the next row to be added at the top.
// Starts at 0, flips each time a row is prepended via pushGridDown.
let nextTopParity = 0;

// Convert grid row/col to pixel centre
function bubblePos(row, col) {
  const parity = gridRowParity[row] ?? 0;
  const offset = parity === 1 ? R : 0;
  return {
    x: GRID_X + offset + col * COL_W + R,
    y: GRID_TOP + row * ROW_H + R,
  };
}

// How many cols in a given row.
// Uses actual array length when available — ground truth, immune to parity drift.
// Falls back to parity calculation only for rows not yet created.
function colsInRow(row) {
  if (grid[row] && grid[row].length > 0) return grid[row].length;
  // For a not-yet-created row, derive from the parity we'd assign it
  const parity = gridRowParity[row] ?? nextTopParity;
  return parity === 0 ? COLS : COLS - 1;
}

function createGrid(wave) {
  grid = [];
  gridRowParity = [];
  nextTopParity = 1; // row 0 is even (parity 0), so next prepended row is odd (parity 1)

  // Calculate how many rows can physically fit between GRID_TOP and DANGER_Y,
  // leaving at least 2 rows of breathing room so the bottom row doesn't
  // immediately trigger a loss on wave start.
  const maxSafeRows = Math.max(1, Math.floor((DANGER_Y - GRID_TOP - R * 2) / ROW_H) - 2);
  const rows = Math.min(4 + wave, 9, maxSafeRows);
  for (let r = 0; r < rows; r++) {
    const parity = r % 2; // row 0 = even, row 1 = odd, etc.
    gridRowParity[r] = parity;
    const cols = parity === 0 ? COLS : COLS - 1;
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const maxCol = Math.min(1 + wave, NUM_COLOURS);
      grid[r][c] = Math.floor(Math.random() * maxCol);
    }
  }
}

// Find all bubbles reachable from the ceiling (to detect floating ones).
// Seeds from the first row that actually contains a bubble, not just row 0,
// so a cleared top row doesn't cause all remaining bubbles to appear disconnected.
function findConnected() {
  const visited = new Set();
  const queue   = [];

  // Find the topmost row that has at least one bubble and seed from there.
  for (let r = 0; r < grid.length; r++) {
    const hasBubble = grid[r] && grid[r].some(c => c >= 0);
    if (hasBubble) {
      for (let c = 0; c < colsInRow(r); c++) {
        if (grid[r][c] >= 0) {
          const key = r + ',' + c;
          if (!visited.has(key)) { visited.add(key); queue.push([r, c]); }
        }
      }
      break; // Only seed the first occupied row
    }
  }

  while (queue.length) {
    const [r, c] = queue.pop();
    for (const [nr, nc] of neighbours(r, c)) {
      const key = nr + ',' + nc;
      if (!visited.has(key) && grid[nr] && grid[nr][nc] >= 0) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return visited;
}

// Hex-grid neighbours for offset grid.
// Even rows sit at x = GRID_X + col*COL_W + R  (no offset)
// Odd  rows sit at x = GRID_X + col*COL_W + R + R  (shifted right by R)
// So from an even-row cell (r,c), the two neighbours in the odd row above/below
// are (r±1, c) and (r±1, c-1)  [odd row is shifted right, so its col c
// aligns between even cols c and c+1, meaning even col c borders odd cols c and c-1]
// From an odd-row cell (r,c), the two neighbours in the even row above/below
// are (r±1, c) and (r±1, c+1)
function neighbours(row, col) {
  const visualParity = gridRowParity[row] ?? 0;
  const odd = visualParity === 1;
  const candidates = odd ? [
    [row - 1, col],     [row - 1, col + 1],
    [row,     col - 1], [row,     col + 1],
    [row + 1, col],     [row + 1, col + 1],
  ] : [
    [row - 1, col - 1], [row - 1, col],
    [row,     col - 1], [row,     col + 1],
    [row + 1, col - 1], [row + 1, col],
  ];
  return candidates.filter(([r, c]) => r >= 0 && c >= 0 && grid[r] && c < colsInRow(r));
}

// Snap a pixel position to the nearest *empty* grid cell adjacent to an
// existing bubble (or the top row if the grid is empty).
function snapToGrid(px, py) {
  // Collect candidate cells: empty cells that are adjacent to a filled cell,
  // plus all cells in row 0 (the ceiling).
  const candidates = new Set();

  // Always include top-row empty cells as valid landing spots
  for (let c = 0; c < colsInRow(0); c++) {
    if (!grid[0] || grid[0][c] < 0) candidates.add('0,' + c);
  }

  // Only allow extending the grid below bubbles that are ceiling-connected.
  // Floating bubbles should not act as anchors for new placements.
  const connected = findConnected();

  // Add empty neighbours of every filled, ceiling-connected cell
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (grid[r][c] < 0) continue;
      if (!connected.has(r + ',' + c)) continue; // skip floating bubbles
      for (const [nr, nc] of neighbours(r, c)) {
        if (grid[nr] && grid[nr][nc] < 0) candidates.add(nr + ',' + nc);
      }
    }
  }

  // Allow the row just below the last ceiling-connected bubble's row
  let maxConnectedRow = -1;
  for (const key of connected) {
    const r = parseInt(key.split(',')[0]);
    if (r > maxConnectedRow) maxConnectedRow = r;
  }
  if (maxConnectedRow >= 0) {
    const nextRow = maxConnectedRow + 1;
    // Derive the parity for this new bottom row from the row above it,
    // not from nextTopParity (which tracks the top, not the bottom).
    if (!gridRowParity[nextRow]) {
      const aboveParity = gridRowParity[nextRow - 1] ?? 0;
      gridRowParity[nextRow] = aboveParity === 0 ? 1 : 0;
    }
    for (let c = 0; c < colsInRow(nextRow); c++) {
      candidates.add(nextRow + ',' + c);
    }
  } else {
    // No connected bubbles at all — allow full bottom row as fallback
    const nextRow = grid.length;
    if (!gridRowParity[nextRow]) {
      const aboveParity = gridRowParity[nextRow - 1] ?? 0;
      gridRowParity[nextRow] = aboveParity === 0 ? 1 : 0;
    }
    for (let c = 0; c < colsInRow(nextRow); c++) {
      candidates.add(nextRow + ',' + c);
    }
  }

  let bestDist = Infinity, bestR = 0, bestC = 0;
  for (const key of candidates) {
    const [r, c] = key.split(',').map(Number);
    const pos = bubblePos(r, c);
    const d = Math.hypot(px - pos.x, py - pos.y);
    if (d < bestDist) { bestDist = d; bestR = r; bestC = c; }
  }
  return [bestR, bestC];
}

// Find all connected same-colour bubbles from (row,col) — flood fill
function findGroup(row, col) {
  const colour = grid[row]?.[col];
  if (colour === undefined || colour < 0) return [];
  const visited = new Set();
  const queue   = [[row, col]];
  const result  = [];
  while (queue.length) {
    const [r, c] = queue.pop();
    const key = r + ',' + c;
    if (visited.has(key)) continue;
    visited.add(key);
    if (!grid[r] || grid[r][c] !== colour) continue;
    result.push([r, c]);
    for (const [nr, nc] of neighbours(r, c)) {
      if (!visited.has(nr + ',' + nc)) queue.push([nr, nc]);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────────────────
let state       = 'start';
let score       = 0;
let wave        = 1;
let frameCount  = 0;

// Shooter state
// SHOOTER_X/Y declared at top of file
let   aimAngle  = -Math.PI / 2;   // straight up
let   nextBubbleColour = 0;
let   currentBubbleColour = 0;

// Active projectile
let projectile = null;  // { x, y, vx, vy, colour, angle }

let shotCount = 0; // tracks shots fired, separate from frameCount which counts frames

// Mouse position for aim tracking — updated on every mousemove/touchmove
let mousePos = null;  // { x, y } in canvas coords, null when cursor not over canvas

// Pop animations
let popAnims = [];   // { x, y, colIdx, progress }

// Float texts
let floatTexts = [];

// HUD dirty flags
let _hudScore = -1, _hudWave = -1, _hudBest = -1, _hudPending = false;

function scheduleHUD() {
  // HUD is drawn on canvas each frame
}

function addFloatText(x, y, text, color) {
  floatTexts.push({ x, y, text, color, life: 1 });
}

// ─────────────────────────────────────────────────────────
//  OVERLAY HELPERS
// ─────────────────────────────────────────────────────────
const overlayEl        = document.getElementById('overlay');
const gameoverOverlay  = document.getElementById('gameover-overlay');
const winOverlay       = document.getElementById('win-overlay');
const startBtn         = document.getElementById('start-btn');
const restartBtn       = document.getElementById('restart-btn');

// Disable start button until audio is loaded
startBtn.disabled    = true;
startBtn.textContent = 'LOADING...';
const nextwaveBtn      = document.getElementById('nextwave-btn');
const finalScoreEl     = document.getElementById('final-score-display');
const winScoreEl       = document.getElementById('win-score-display');

function hideAllOverlays() {
  overlayEl.classList.remove('active');
  gameoverOverlay.classList.remove('active');
  winOverlay.classList.remove('active');
}

// ─────────────────────────────────────────────────────────
//  GAME INIT
// ─────────────────────────────────────────────────────────
//  COLOUR PICKER — weighted toward colours with more grid presence
// ─────────────────────────────────────────────────────────
function pickUsefulColour() {
  // Count how many of each colour exist in the grid
  const counts = {};
  for (const row of grid) {
    for (const c of row) {
      if (c >= 0) counts[c] = (counts[c] || 0) + 1;
    }
  }

  const colours = Object.keys(counts).map(Number);
  if (colours.length === 0) return Math.floor(Math.random() * NUM_COLOURS);

  // Build a weighted pool — each colour appears proportional to its count.
  // This means colours with more bubbles are more likely to be picked,
  // making it easier to find matches in later waves.
  const pool = [];
  for (const col of colours) {
    const weight = counts[col];
    for (let i = 0; i < weight; i++) pool.push(col);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function pickNextBubble() {
  // shotCount reflects shots already fired; the next shot will be shotCount+1.
  const next = shotCount + 1;
  if (next % BOMB_INTERVAL === 0)     return BUBBLE_BOMB;
  if (next % WILDCARD_INTERVAL === 0) return BUBBLE_WILDCARD;
  return pickUsefulColour();
}

function startGame(keepWave = false) {
  if (!keepWave) { wave = 1; score = 0; }
  _hudScore = _hudWave = _hudBest = -1;
  createGrid(wave);
  projectile  = null;
  mousePos    = null;
  popAnims    = [];
  floatTexts  = [];
  currentBubbleColour = pickUsefulColour();
  nextBubbleColour    = pickNextBubble();
  frameCount = 0;
  shotCount  = 0;
  scheduleHUD();
  if (audioUnlocked && !musicSource) startBgMusic();
  state = 'playing';
}

function endGame() {
  state = 'gameover';
  sfxGameOver();
  stopBgMusic();
  hsSave('bubble-slumber', score);
  finalScoreEl.textContent = `SCORE: ${score}`;
  hsRenderBest('bubble-slumber', 'hs-gameover');
  gameoverOverlay.classList.add('active');
}

function winWave() {
  state = 'win';
  sfxWin();
  winScoreEl.textContent = `SCORE: ${score}`;
  winOverlay.classList.add('active');
}

// ─────────────────────────────────────────────────────────
//  PROJECTILE PHYSICS
// ─────────────────────────────────────────────────────────
const BUBBLE_SPEED = 10;

function fireProjectile() {
  if (projectile) return;

  // Sweep any pre-existing disconnected bubbles before firing so the player
  // sees them pop as an immediate consequence rather than on the next shot.
  const connectedPre = findConnected();
  for (let gr = 0; gr < grid.length; gr++) {
    for (let gc = 0; gc < colsInRow(gr); gc++) {
      if (grid[gr][gc] >= 0 && !connectedPre.has(gr + ',' + gc)) {
        const pos = bubblePos(gr, gc);
        popAnims.push({ x: pos.x, y: pos.y, colIdx: grid[gr][gc], progress: 0 });
        grid[gr][gc] = -1;
      }
    }
  }
  while (grid.length && grid[grid.length - 1].every(c => c < 0)) { grid.pop(); gridRowParity.pop(); }
  if (isGridEmpty()) { winWave(); return; }

  const dx = Math.cos(aimAngle);
  const dy = Math.sin(aimAngle);
  projectile = {
    x: SHOOTER_X,
    y: SHOOTER_Y,
    vx: dx * BUBBLE_SPEED,
    vy: dy * BUBBLE_SPEED,
    colour: currentBubbleColour,
  };
  sfxShoot();
  // Advance the queue — nextBubbleColour becomes current.
  // nextBubbleColour is refreshed authoritatively in landProjectile after the
  // pop, so we don't set a preliminary value here (it would cause a visual flicker).
  currentBubbleColour = nextBubbleColour;
}

function isGridEmpty() {
  return grid.length === 0 || grid.every(row => row.every(c => c < 0));
}

function updateProjectile() {
  if (!projectile) return;

  // If grid is already empty, no need to land — just win immediately
  if (isGridEmpty()) {
    projectile = null;
    winWave();
    return;
  }

  projectile.x += projectile.vx;
  projectile.y += projectile.vy;

  // Bounce off left/right walls
  const leftWall  = GRID_X;
  const rightWall = GRID_X + COLS * COL_W;
  let bounced = false;
  if (projectile.x - R < leftWall)  { projectile.x = leftWall + R;  projectile.vx *= -1; bounced = true; }
  if (projectile.x + R > rightWall) { projectile.x = rightWall - R; projectile.vx *= -1; bounced = true; }

  // Skip collision detection on the frame of a bounce to prevent phantom landings
  if (bounced) return;

  // Off the top — snap to top row
  if (projectile.y - R < GRID_TOP) {
    landProjectile();
    return;
  }

  // Off the bottom — discard; do NOT count as a shot toward grid push
  if (projectile.y > GAME_H + 20) {
    projectile = null;
    nextBubbleColour = pickNextBubble();
    addFloatText(SHOOTER_X, SHOOTER_Y - 60, 'MISS!', '#ff4444');
    return;
  }

  // Check collision with existing bubbles
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (grid[r][c] < 0) continue;
      const pos = bubblePos(r, c);
      if (Math.hypot(projectile.x - pos.x, projectile.y - pos.y) < R * 1.75) {
        landProjectile();
        return;
      }
    }
  }
}

function landProjectile() {
  if (!projectile) return;

  const colour = projectile.colour;

  // ── BOMB: detonate on impact, never placed in grid ────────
  if (colour === BUBBLE_BOMB) {
    const bx = projectile.x, by = projectile.y;
    projectile = null;
    shotCount++;
    const blastRadius = R * 3.2;
    let blasted = 0;
    for (let gr = 0; gr < grid.length; gr++) {
      for (let gc = 0; gc < colsInRow(gr); gc++) {
        if (grid[gr][gc] < 0) continue;
        const pos = bubblePos(gr, gc);
        if (Math.hypot(bx - pos.x, by - pos.y) <= blastRadius) {
          popAnims.push({ x: pos.x, y: pos.y, colIdx: grid[gr][gc], progress: 0 });
          grid[gr][gc] = -1;
          blasted++;
        }
      }
    }
    // Also drop anything now floating
    const connectedAfterBlast = findConnected();
    let dropped = 0;
    for (let gr = 0; gr < grid.length; gr++) {
      for (let gc = 0; gc < colsInRow(gr); gc++) {
        if (grid[gr][gc] >= 0 && !connectedAfterBlast.has(gr + ',' + gc)) {
          const pos = bubblePos(gr, gc);
          popAnims.push({ x: pos.x, y: pos.y, colIdx: grid[gr][gc], progress: 0 });
          grid[gr][gc] = -1;
          dropped++;
        }
      }
    }
    const totalCleared = blasted + dropped;
    const pts = totalCleared * 10 * wave;
    score += pts;
    sfxCombo();
    addFloatText(SHOOTER_X, SHOOTER_Y - 90, `BOOM! +${pts}`, '#ff6622');
    scheduleHUD();
    while (grid.length && grid[grid.length - 1].every(c => c < 0)) { grid.pop(); gridRowParity.pop(); }
    if (isGridEmpty()) { winWave(); return; }
    nextBubbleColour = pickNextBubble();
    // Danger check
    for (let gr = 0; gr < grid.length; gr++) {
      for (let gc = 0; gc < colsInRow(gr); gc++) {
        if (grid[gr][gc] >= 0 && bubblePos(gr, gc).y + R >= DANGER_Y) { endGame(); return; }
      }
    }
    if (shotCount % 10 === 0) pushGridDown();
    return;
  }

  const [r, c] = snapToGrid(projectile.x, projectile.y);

  // Ensure grid has enough rows, assigning parity for each new row
  while (grid.length <= r) {
    const lastParity = gridRowParity.length > 0 ? gridRowParity[gridRowParity.length - 1] : 0;
    const newParity = lastParity === 0 ? 1 : 0;
    gridRowParity.push(newParity);
    const cols = newParity === 0 ? COLS : COLS - 1;
    grid.push(Array(cols).fill(-1));
  }

  // Place bubble — guard against out-of-bounds column
  const placed = c < colsInRow(r);
  if (placed) { grid[r][c] = colour; shotCount++; }

  projectile = null;

  // ── WILDCARD: treat as the most common colour at landing site ──
  let effectiveColour = colour;
  if (colour === BUBBLE_WILDCARD && placed) {
    // Find which colour among the neighbours has the most presence in the grid,
    // and adopt it — maximising the chance of a 3-match.
    const nbrColours = {};
    for (const [nr, nc] of neighbours(r, c)) {
      const nc2 = grid[nr]?.[nc];
      if (nc2 >= 0) nbrColours[nc2] = (nbrColours[nc2] || 0) + 1;
    }
    if (Object.keys(nbrColours).length > 0) {
      effectiveColour = Number(Object.entries(nbrColours).sort((a, b) => b[1] - a[1])[0][0]);
    } else {
      // No neighbours — fall back to most common colour in grid
      const counts = {};
      for (const row of grid) for (const v of row) if (v >= 0) counts[v] = (counts[v] || 0) + 1;
      if (Object.keys(counts).length > 0)
        effectiveColour = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
      else effectiveColour = 0;
    }
    grid[r][c] = effectiveColour;
  }

  // Check for match — only if bubble was actually placed
  const group = placed ? findGroup(r, c) : [];
  if (group.length >= 3) {
    // Pop the matched group
    for (const [gr, gc] of group) {
      const pos = bubblePos(gr, gc);
      popAnims.push({ x: pos.x, y: pos.y, colIdx: grid[gr][gc], progress: 0 });
      grid[gr][gc] = -1;
    }
    const pts = group.length * 10 * wave;
    score += pts;

    // Drop any bubbles now disconnected from the ceiling after the pop
    const connectedAfterPop = findConnected();
    let dropped = 0;
    for (let gr = 0; gr < grid.length; gr++) {
      for (let gc = 0; gc < colsInRow(gr); gc++) {
        if (grid[gr][gc] >= 0 && !connectedAfterPop.has(gr + ',' + gc)) {
          const pos = bubblePos(gr, gc);
          popAnims.push({ x: pos.x, y: pos.y, colIdx: grid[gr][gc], progress: 0 });
          grid[gr][gc] = -1;
          dropped++;
        }
      }
    }

    // Score and feedback — escalate based on total cleared
    const totalCleared = group.length + dropped;
    const dropPts = dropped * 5 * wave;
    score += dropPts;

    if (colour === BUBBLE_WILDCARD) {
      sfxCombo();
      addFloatText(SHOOTER_X, SHOOTER_Y - 90, `DREAM MATCH! +${pts + dropPts}`, '#ffffff');
    } else if (totalCleared >= 8) {
      sfxCombo();
      addFloatText(SHOOTER_X, SHOOTER_Y - 90, `LUCID! +${pts + dropPts}`, '#ffcc44');
    } else if (dropped > 0) {
      sfxDrop();
      sfxPop();
      addFloatText(SHOOTER_X, SHOOTER_Y - 70, `AWOKEN! +${pts + dropPts}`, '#44ddaa');
    } else {
      sfxPop();
      addFloatText(SHOOTER_X, SHOOTER_Y - 60, `+${pts}`, '#cc88ff');
    }

    scheduleHUD();

    // Remove empty trailing rows
    while (grid.length && grid[grid.length - 1].every(c => c < 0)) { grid.pop(); gridRowParity.pop(); }

    if (isGridEmpty()) { winWave(); return; }
  } else if (colour === BUBBLE_WILDCARD && placed) {
    // Wildcard landed but didn't form a group — still give feedback
    sfxPop();
    addFloatText(SHOOTER_X, SHOOTER_Y - 60, 'WILD!', '#ffffff');
  }

  // Refresh next bubble to reflect colours still in the grid.
  // Must run unconditionally (not just on a pop) so non-matching shots
  // still produce a useful next bubble.
  nextBubbleColour = pickNextBubble();

  // Danger check
  for (let gr = 0; gr < grid.length; gr++) {
    for (let gc = 0; gc < colsInRow(gr); gc++) {
      if (grid[gr][gc] >= 0) {
        if (bubblePos(gr, gc).y + R >= DANGER_Y) { endGame(); return; }
      }
    }
  }

  // Push a new row every 10 shots
  if (shotCount % 10 === 0) pushGridDown();
}

function pushGridDown() {
  // Don't push if the current bottom row is already dangerously close —
  // adding another row on top would shift everything down and instant-kill.
  // Instead, check what the lowest occupied row's Y would be after a push
  // by simulating one extra row's worth of ROW_H shift.
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (grid[r][c] >= 0) {
        // bubblePos gives the Y for row r; after prepending a row every
        // existing row index increases by 1, shifting its Y down by ROW_H.
        if (bubblePos(r, c).y + ROW_H + R >= DANGER_Y) {
          endGame();
          return;
        }
      }
    }
  }

  // The new top row alternates parity with whatever row 0 currently is.
  // Prepend parity for the new row, shifting all existing parities down by 1.
  const newParity = nextTopParity;
  gridRowParity.unshift(newParity);
  // Next time we prepend, flip parity
  nextTopParity = newParity === 0 ? 1 : 0;

  const cols = newParity === 0 ? COLS : COLS - 1;
  const newRow = Array(cols).fill(0).map(() => {
    const maxCol = Math.min(1 + wave, NUM_COLOURS);
    return Math.floor(Math.random() * maxCol);
  });
  grid.unshift(newRow);

  // Danger check after the push
  let dangerTriggered = false;
  outer: for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (grid[r][c] >= 0 && bubblePos(r, c).y + R >= DANGER_Y) {
        dangerTriggered = true;
        break outer;
      }
    }
  }
  if (dangerTriggered) { endGame(); return; }
}

// ─────────────────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────────────────
function update() {
  if (state !== 'playing') return;
  frameCount++;
  updateProjectile();

  // Persistent win check — runs every frame so it catches any path
  // that empties the grid, not just the ones inside landProjectile
  if (isGridEmpty() && !projectile) {
    winWave();
    return;
  }

  // Update aim angle toward current mouse/touch position
  if (mousePos) {
    const dx = mousePos.x - SHOOTER_X;
    const dy = mousePos.y - SHOOTER_Y;
    let angle = Math.atan2(dy, dx);
    if (angle > -0.15)           angle = -0.15;
    if (angle < -Math.PI + 0.15) angle = -Math.PI + 0.15;
    aimAngle = angle;
  }

  // Pop animations
  popAnims = popAnims.filter(p => p.progress < 1);
  for (const p of popAnims) p.progress += 0.07;

  // Float texts
  floatTexts = floatTexts.filter(f => f.life > 0);
  for (const f of floatTexts) { f.y -= 0.8; f.life -= 0.018; }
}

// ─────────────────────────────────────────────────────────
//  DRAW
// ─────────────────────────────────────────────────────────
function draw() {
  drawBackground();

  if (state !== 'playing') return;

  // Grid bubbles
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (grid[r][c] >= 0) {
        const pos = bubblePos(r, c);
        drawDreamBubble(pos.x, pos.y, R, grid[r][c]);
      }
    }
  }

  // Pop animations
  for (const p of popAnims) {
    drawBurst(p.x, p.y, p.colIdx, p.progress);
  }

  // Aim guide — shown whenever we know where the mouse is
  if (mousePos) {
    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = '#cc88ff88';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    let px = SHOOTER_X, py = SHOOTER_Y;
    let vx = Math.cos(aimAngle) * 8, vy = Math.sin(aimAngle) * 8;
    ctx.moveTo(px, py);
    for (let i = 0; i < 40; i++) {
      px += vx; py += vy;
      if (px - R < GRID_X)             { px = GRID_X + R;              vx *= -1; }
      if (px + R > GRID_X + COLS*COL_W) { px = GRID_X + COLS*COL_W - R; vx *= -1; }
      ctx.lineTo(px, py);
      if (py < GRID_TOP + ROW_H * 2) break;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Next bubble preview (top-left)
  ctx.save();
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#cc88ffaa';
  ctx.textAlign = 'left';
  const nextLabel = nextBubbleColour === BUBBLE_WILDCARD ? 'WILD'
                  : nextBubbleColour === BUBBLE_BOMB     ? 'BOMB'
                  : 'DREAM';
  ctx.fillText(nextLabel, 12, SHOOTER_Y - 28);
  drawDreamBubble(28, SHOOTER_Y - 8, R * 0.65, nextBubbleColour);
  ctx.restore();

  // Current bubble on shooter
  drawDreamBubble(SHOOTER_X, SHOOTER_Y - 10, R, currentBubbleColour);

  // Kobie
  drawKobie(SHOOTER_X, SHOOTER_Y + 30, aimAngle);

  // Projectile in flight
  if (projectile) {
    drawDreamBubble(projectile.x, projectile.y, R, projectile.colour);
  }

  // Float texts
  for (const f of floatTexts) {
    const alpha = Math.max(0, Math.min(1, f.life));
    const hex   = Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.save();
    ctx.font        = 'bold 16px "Courier New", monospace';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = f.color + hex;
    ctx.shadowColor = f.color + hex;
    ctx.shadowBlur  = 6;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  // On-canvas HUD bar at bottom
  const HUD_H = 36;
  ctx.fillStyle = 'rgba(8,4,26,0.75)';
  ctx.fillRect(0, GAME_H - HUD_H, GAME_W, HUD_H);
  ctx.strokeStyle = '#cc88ff30';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, GAME_H - HUD_H); ctx.lineTo(GAME_W, GAME_H - HUD_H); ctx.stroke();
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#cc88ff';
  ctx.textBaseline = 'middle';
  const hudY = GAME_H - HUD_H / 2;
  ctx.textAlign = 'left';  ctx.fillText('SCORE: ' + score, 12, hudY);
  ctx.textAlign = 'center'; ctx.fillText('WAVE: ' + wave, GAME_W / 2, hudY);
  ctx.textAlign = 'right'; ctx.fillText('BEST: ' + hsBest('bubble-slumber'), GAME_W - 12, hudY);
  ctx.textBaseline = 'alphabetic';
}

// ─────────────────────────────────────────────────────────
//  DEV HELPERS  (callable from browser console)
// ─────────────────────────────────────────────────────────

// testStuck() — simulates the floating-straggler stuck state and verifies
// the cleanup logic clears them and triggers winWave().
// Usage: open DevTools console and call testStuck()
function testStuck() {
  state = 'playing';
  projectile = null;
  popAnims = [];
  floatTexts = [];

  // Build a 15-row all-empty grid with 3 floating stragglers in the last column
  grid = [];
  for (let i = 0; i < 15; i++) grid.push(new Array(colsInRow(i)).fill(-1));
  grid[10][colsInRow(10) - 1] = 2;
  grid[12][colsInRow(12) - 1] = 3;
  grid[14][colsInRow(14) - 1] = 1;

  console.log('--- testStuck() ---');
  console.log('Before cleanup:');
  console.log('  state:', state);
  console.log('  isGridEmpty():', isGridEmpty());
  console.log('  stragglers at [10], [12], [14] last col:', grid[10][colsInRow(10)-1], grid[12][colsInRow(12)-1], grid[14][colsInRow(14)-1]);

  // Run the cleanup logic directly (mirrors what landProjectile now does)
  const connected = findConnected();
  for (let gr = 0; gr < grid.length; gr++) {
    for (let gc = 0; gc < colsInRow(gr); gc++) {
      if (grid[gr][gc] >= 0 && !connected.has(gr + ',' + gc)) {
        grid[gr][gc] = -1;
      }
    }
  }
  while (grid.length && grid[grid.length - 1].every(c => c < 0)) { grid.pop(); gridRowParity.pop(); }

  console.log('After cleanup:');
  console.log('  isGridEmpty():', isGridEmpty(), '(expect: true)');
  console.log('  grid.length:', grid.length,     '(expect: 0)');

  if (isGridEmpty()) {
    winWave();
    console.log('  state:', state, '(expect: win) ✓ PASS');
  } else {
    console.error('  FAIL — grid not empty, stragglers remain');
    grid.forEach((row, i) => { if (row.some(c => c >= 0)) console.log('  row', i, row); });
  }
}

// ─────────────────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────────────────
let _lastTs = 0;
function loop(ts = 0) {
  requestAnimationFrame(loop);
  if (ts - _lastTs < 16.5) return;
  _lastTs = ts;
  update();
  draw();
}
// Single game loop start — do NOT add a second requestAnimationFrame(loop) call here
loop();

// ─────────────────────────────────────────────────────────
//  INPUT — click/tap to fire toward that point
// ─────────────────────────────────────────────────────────
function onPointerMove(clientX, clientY) {
  mousePos = canvasPoint(clientX, clientY);
}

function onPointerLeave() {
  mousePos = null;
}

function onFire(clientX, clientY) {
  unlockAudio();
  if (state !== 'playing') return;
  // Update aim to click point then fire immediately
  mousePos = canvasPoint(clientX, clientY);
  const dx = mousePos.x - SHOOTER_X;
  const dy = mousePos.y - SHOOTER_Y;
  let angle = Math.atan2(dy, dx);
  // Reject clicks that are at or below the shooter (angle >= 0 means downward/horizontal)
  if (angle >= 0 || angle <= -Math.PI) return;
  if (angle > -0.15)          angle = -0.15;
  if (angle < -Math.PI + 0.15) angle = -Math.PI + 0.15;
  aimAngle = angle;
  fireProjectile();
}

// Mouse
canvas.addEventListener('mousemove',  e => { e.preventDefault(); onPointerMove(e.clientX, e.clientY); });
canvas.addEventListener('mouseleave', () => onPointerLeave());
canvas.addEventListener('click',      e => { e.preventDefault(); onFire(e.clientX, e.clientY); });

// Touch — touchmove updates aim preview, touchend fires
canvas.addEventListener('touchmove',  e => { e.preventDefault(); const t = e.touches[0]; onPointerMove(t.clientX, t.clientY); }, { passive: false });
canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; onPointerMove(t.clientX, t.clientY); }, { passive: false });
canvas.addEventListener('touchend',   e => { e.preventDefault(); const t = e.changedTouches[0]; onFire(t.clientX, t.clientY); }, { passive: false });

// ─────────────────────────────────────────────────────────
//  OVERLAY BUTTONS
// ─────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  unlockAudio();
  hideAllOverlays();
  startGame(false);
});

restartBtn.addEventListener('click', () => {
  unlockAudio();
  hideAllOverlays();
  startGame(false);
});

nextwaveBtn.addEventListener('click', () => {
  unlockAudio();
  hideAllOverlays();
  wave++;
  startGame(true);
});