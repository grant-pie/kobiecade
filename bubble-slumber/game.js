// ─────────────────────────────────────────────────────────
//  BUBBLE SLUMBER  —  Bubble Shooter
//  All art drawn via canvas API, no sprites.
// ─────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const GAME_W = 480;
const GAME_H = 700;

// ── Canvas sizing (letterbox) ─────────────────────────────
let canvasRect = null;
let _rszW = 0, _rszH = 0, _rszX = 0, _rszY = 0;

function resizeCanvas() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const reservedTop   = 40;
  const reservedBelow = isTouch ? 60 : 36;
  const availH = vh - reservedTop - reservedBelow;
  const scale = Math.min(vw / GAME_W, availH / GAME_H);
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
resizeCanvas();
requestAnimationFrame(() => { canvasRect = canvas.getBoundingClientRect(); });

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
  .then(d => { musicBuffer = d; if (audioUnlocked && !musicSource) startBgMusic(); })
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
//  GRID CONSTANTS
// ─────────────────────────────────────────────────────────
const R        = 22;          // bubble radius
const COLS     = 10;
const COL_W    = R * 2;       // 44px per column
const GRID_X   = (GAME_W - COLS * COL_W) / 2;  // left edge of grid
const GRID_TOP = 48;          // y of first row
const ROW_H    = R * 1.85;    // row height (slight overlap)

// Danger line — if any bubble reaches here Kobie loses a life
const DANGER_Y = GAME_H - 175;

// ─────────────────────────────────────────────────────────
//  DRAW HELPERS
// ─────────────────────────────────────────────────────────

// Draw a dream bubble at cx,cy with radius r
function drawEmailBubble(cx, cy, r, colIdx) {
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

  // Category label
  ctx.font = `bold ${Math.max(6, r * 0.28)}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.fillText(c.label, cx, cy + r * 0.82);

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
  const c = COLOURS[colIdx];
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
//  STAR FIELD
// ─────────────────────────────────────────────────────────
const STARS = Array.from({ length: 60 }, () => {
  const a = Math.random() * 0.6 + 0.15;
  const v = Math.round(a * 255).toString(16).padStart(2, '0');
  const cols = ['#cc88ff', '#8844ff', '#4488ff', '#ffccff', '#ffffff'];
  const col = cols[Math.floor(Math.random() * cols.length)];
  return { x: Math.random() * GAME_W, y: Math.random() * GAME_H, r: Math.random() * 1.4 + 0.3, color: col + v };
});

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

// gridParityOffset compensates for parity when rows are prepended via unshift.
// Decrements on each push so existing rows keep their visual x-position.
// y-position uses the raw row index — after unshift the new row is always at
// index 0 (top) and existing rows naturally move down one index each push.
let gridParityOffset = 0;

// Convert grid row/col to pixel centre
function bubblePos(row, col) {
  const parity = (((row + gridParityOffset) % 2) + 2) % 2; // always 0 or 1
  const offset = parity === 1 ? R : 0;
  return {
    x: GRID_X + offset + col * COL_W + R,
    y: GRID_TOP + row * ROW_H + R,
  };
}

// How many cols in a given row — based on visual parity
function colsInRow(row) {
  const parity = (((row + gridParityOffset) % 2) + 2) % 2;
  return parity === 0 ? COLS : COLS - 1;
}

function createGrid(wave) {
  grid = [];
  const rows = Math.min(4 + wave, 10);
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    const cols = colsInRow(r);
    for (let c = 0; c < cols; c++) {
      // Higher waves introduce more colour variety
      const maxCol = Math.min(1 + wave, NUM_COLOURS);
      grid[r][c] = Math.floor(Math.random() * maxCol);
    }
  }
}

// Find all bubbles reachable from the top row (to detect floating ones)
function findConnected() {
  const visited = new Set();
  const queue   = [];
  // Seed from row 0
  for (let c = 0; c < colsInRow(0); c++) {
    if (grid[0] && grid[0][c] >= 0) {
      const key = '0,' + c;
      if (!visited.has(key)) { visited.add(key); queue.push([0, c]); }
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
  const visualParity = (((row + gridParityOffset) % 2) + 2) % 2;
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

  // Add empty neighbours of every filled cell
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (grid[r][c] < 0) continue;
      for (const [nr, nc] of neighbours(r, c)) {
        if (grid[nr] && grid[nr][nc] < 0) candidates.add(nr + ',' + nc);
        // Also allow one row beyond the current grid bottom
      }
    }
  }

  // Also allow the row just below the grid
  const nextRow = grid.length;
  for (let c = 0; c < colsInRow(nextRow); c++) {
    candidates.add(nextRow + ',' + c);
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
const SHOOTER_X = GAME_W / 2;
const SHOOTER_Y = GAME_H - 80;
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
  if (_hudPending) return;
  _hudPending = true;
  requestAnimationFrame(() => {
    _hudPending = false;
    const scoreEl = document.getElementById('score');
    const waveEl  = document.getElementById('wave');
    const bestEl  = document.getElementById('best');
    const best    = hsBest('bubble-slumber');
    if (score !== _hudScore) { scoreEl.textContent = score; _hudScore = score; }
    if (wave  !== _hudWave)  { waveEl.textContent  = wave;  _hudWave  = wave;  }
    if (best  !== _hudBest)  { bestEl.textContent  = best;  _hudBest  = best;  }
  });
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
function pickRandomColour() {
  // Only pick colours that exist in the current grid
  const present = new Set();
  for (const row of grid) for (const c of row) if (c >= 0) present.add(c);
  const options = present.size > 0 ? [...present] : [0,1,2,3];
  return options[Math.floor(Math.random() * options.length)];
}

function startGame(keepWave = false) {
  if (!keepWave) { wave = 1; score = 0; }
  _hudScore = _hudWave = _hudBest = -1;
  createGrid(wave);
  gridParityOffset = 0;
  projectile  = null;
  mousePos    = null;
  popAnims    = [];
  floatTexts  = [];
  currentBubbleColour = pickRandomColour();
  nextBubbleColour    = pickRandomColour();
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
  // Advance the queue — nextBubbleColour becomes current,
  // new next is picked AFTER landing (in landProjectile) so it
  // reflects the post-pop grid state. For now set a placeholder.
  currentBubbleColour = nextBubbleColour;
  nextBubbleColour    = pickRandomColour(); // preliminary; refreshed after land
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
  if (projectile.x - R < leftWall)  { projectile.x = leftWall + R;  projectile.vx *= -1; }
  if (projectile.x + R > rightWall) { projectile.x = rightWall - R; projectile.vx *= -1; }

  // Off the top — snap to top row
  if (projectile.y - R < GRID_TOP) {
    landProjectile();
    return;
  }

  // Off the bottom — discard silently
  if (projectile.y > GAME_H + 20) {
    projectile = null;
    return;
  }

  // Check collision with existing bubbles
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (grid[r][c] < 0) continue;
      const pos = bubblePos(r, c);
      if (Math.hypot(projectile.x - pos.x, projectile.y - pos.y) < R * 1.9) {
        landProjectile();
        return;
      }
    }
  }
}

function landProjectile() {
  if (!projectile) return;
  const [r, c] = snapToGrid(projectile.x, projectile.y);

  // Ensure grid has enough rows
  while (grid.length <= r) {
    const newRow = grid.length;
    grid.push(Array(colsInRow(newRow)).fill(-1));
  }

  // Place bubble — guard against out-of-bounds column
  const placed = c < colsInRow(r);
  if (placed) { grid[r][c] = projectile.colour; shotCount++; }

  projectile = null;

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

    // Drop any bubbles now disconnected from the ceiling
    const connected = findConnected();
    let dropped = 0;
    for (let gr = 0; gr < grid.length; gr++) {
      for (let gc = 0; gc < colsInRow(gr); gc++) {
        if (grid[gr][gc] >= 0 && !connected.has(gr + ',' + gc)) {
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

    if (totalCleared >= 8) {
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

    // Refresh next bubble to only show colours still in the grid
    nextBubbleColour = pickRandomColour();

    // Remove empty trailing rows
    while (grid.length && grid[grid.length - 1].every(c => c < 0)) grid.pop();

    if (isGridEmpty()) { winWave(); return; }

  } else {
    while (grid.length && grid[grid.length - 1].every(c => c < 0)) grid.pop();
    if (isGridEmpty()) { winWave(); return; }
  }

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
  // Decrement parity offset so existing rows keep their visual x-position.
  // y-position is handled naturally by row index — unshift moves all existing
  // rows from index n to n+1, which shifts them down by exactly one ROW_H.
  gridParityOffset--;

  const newRow = Array(colsInRow(0)).fill(0).map(() => {
    const maxCol = Math.min(1 + wave, NUM_COLOURS);
    return Math.floor(Math.random() * maxCol);
  });
  grid.unshift(newRow);

  // Danger check
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
        drawEmailBubble(pos.x, pos.y, R, grid[r][c]);
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
  ctx.fillText('DREAM', 12, SHOOTER_Y - 28);
  drawEmailBubble(28, SHOOTER_Y - 8, R * 0.65, nextBubbleColour);
  ctx.restore();

  // Current bubble on shooter
  drawEmailBubble(SHOOTER_X, SHOOTER_Y - 10, R, currentBubbleColour);

  // Kobie
  drawKobie(SHOOTER_X, SHOOTER_Y + 30, aimAngle);

  // Projectile in flight
  if (projectile) {
    drawEmailBubble(projectile.x, projectile.y, R, projectile.colour);
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
}

// ─────────────────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  update();
  draw();
}
requestAnimationFrame(loop);

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