// ─────────────────────────────────────────────────────────
//  KobieCade — landing.js
//  Animates the two preview canvases on the game cards
// ─────────────────────────────────────────────────────────

// ── Shared helpers ────────────────────────────────────────
function makeStars(n, w, h) {
  return Array.from({ length: n }, () => {
    const a = Math.random() * 0.7 + 0.15;
    const v = Math.round(a * 255).toString(16).padStart(2, '0');
    return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.3, color: '#ff69b4' + v };
  });
}

// ── Bubble Slumber preview — dream bubble shooter ────────
(function () {
  const canvas = document.getElementById('preview-todos');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const stars = makeStars(30, W, H).map(s => ({
    ...s,
    color: ['#cc88ff','#8844ff','#4488ff','#ffccff','#ffffff'][Math.floor(Math.random()*5)]
          + Math.round((Math.random()*0.5+0.15)*255).toString(16).padStart(2,'0')
  }));

  // Dream colours matching the game
  const COLOURS = [
    { fill: '#cc44ff', stroke: '#dd88ff' },
    { fill: '#4488ff', stroke: '#88bbff' },
    { fill: '#ffcc44', stroke: '#ffdd88' },
    { fill: '#44ddaa', stroke: '#88eebb' },
  ];

  const R = 11, COLS = 7, COL_W = R * 2.1;
  const GX = (W - COLS * COL_W) / 2, GY = 10, ROW_H = R * 1.85;

  let grid = [];
  function resetGrid() {
    grid = [];
    for (let r = 0; r < 4; r++) {
      grid[r] = [];
      const cols = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < cols; c++) grid[r][c] = Math.floor(Math.random() * 4);
    }
  }
  resetGrid();

  function bubblePos(row, col) {
    const offset = row % 2 === 1 ? R : 0;
    return { x: GX + offset + col * COL_W + R, y: GY + row * ROW_H + R };
  }

  function drawMiniDream(cx, cy, r, colIdx) {
    const c = COLOURS[colIdx];
    const grd = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
    grd.addColorStop(0, c.fill + 'dd');
    grd.addColorStop(1, c.fill + '88');
    ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI*2);
    ctx.fillStyle = c.fill + '18'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = grd; ctx.fill();
    ctx.strokeStyle = c.stroke; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - r*0.28, cy - r*0.28, r*0.22, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.fill();
    // Small moon icon
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(cx, cy, r*0.38, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = c.fill + 'cc';
    ctx.beginPath(); ctx.arc(cx + r*0.14, cy - r*0.08, r*0.3, 0, Math.PI*2); ctx.fill();
  }

  function drawMiniKobie(cx, cy, aimAngle) {
    ctx.save(); ctx.translate(cx, cy);
    // Pyjama body
    ctx.fillStyle = '#8844cc';
    ctx.beginPath(); ctx.ellipse(0, 5, 7, 9, 0, 0, Math.PI*2); ctx.fill();
    // Hair
    ctx.fillStyle = '#343432';
    ctx.beginPath(); ctx.ellipse(0, -7, 7, 8, 0, 0, Math.PI*2); ctx.fill();
    // Face
    ctx.fillStyle = '#f5c6a0';
    ctx.beginPath(); ctx.ellipse(0, -7, 5.5, 6, 0, 0, Math.PI*2); ctx.fill();
    // Sleepy eyes
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.arc(-2, -8, 1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(2,  -8, 1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f5c6a0';
    ctx.beginPath(); ctx.ellipse(-2, -8.5, 1.2, 0.7, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2,  -8.5, 1.2, 0.7, 0, Math.PI, 0); ctx.fill();
    // Wand arm
    ctx.strokeStyle = '#8844cc'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(aimAngle)*10, Math.sin(aimAngle)*10); ctx.stroke();
    // Wand star tip
    ctx.fillStyle = '#ffdd44';
    ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(Math.cos(aimAngle)*10, Math.sin(aimAngle)*10, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  const proj = { active: false, x: 0, y: 0, vx: 0, vy: 0, colour: 0 };
  let shootTimer = 0, popList = [], aimAngle = -Math.PI / 2, frame = 0;
  const KX = W / 2, KY = H - 18;

  function tick() {
    frame++;
    // Dream gradient background
    const bgGrd = ctx.createLinearGradient(0, 0, 0, H);
    bgGrd.addColorStop(0, '#08041a'); bgGrd.addColorStop(1, '#120a28');
    ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }

    for (let r = 0; r < grid.length; r++) {
      const cols = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] < 0) continue;
        const pos = bubblePos(r, c);
        drawMiniDream(pos.x, pos.y, R, grid[r][c]);
      }
    }

    popList = popList.filter(p => p.progress < 1);
    for (const p of popList) {
      const pos = bubblePos(p.r, p.c);
      const c = COLOURS[p.colour];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const d = p.progress * R * 2;
        const alpha = Math.max(0, 1 - p.progress);
        const hex = Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = c.fill + hex;
        ctx.beginPath(); ctx.arc(pos.x + Math.cos(a)*d, pos.y + Math.sin(a)*d, Math.max(0,(1-p.progress)*3), 0, Math.PI*2); ctx.fill();
      }
      p.progress += 0.08;
    }

    aimAngle = -Math.PI * 0.5 + Math.sin(frame * 0.025) * 0.9;

    ctx.save(); ctx.setLineDash([3, 6]);
    ctx.strokeStyle = '#cc88ff55'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(KX, KY);
    let px = KX, py = KY, pvx = Math.cos(aimAngle)*4, pvy = Math.sin(aimAngle)*4;
    for (let i = 0; i < 20; i++) {
      px += pvx; py += pvy;
      if (px < GX) { px = GX; pvx *= -1; }
      if (px > GX + COLS*COL_W) { px = GX + COLS*COL_W; pvx *= -1; }
      ctx.lineTo(px, py);
      if (py < GY) break;
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();

    shootTimer++;
    if (shootTimer > 50 && !proj.active) {
      proj.active = true; proj.x = KX; proj.y = KY;
      proj.vx = Math.cos(aimAngle)*3.5; proj.vy = Math.sin(aimAngle)*3.5;
      proj.colour = Math.floor(Math.random()*4); shootTimer = 0;
    }

    if (proj.active) {
      proj.x += proj.vx; proj.y += proj.vy;
      if (proj.x < GX) { proj.x = GX; proj.vx *= -1; }
      if (proj.x > GX + COLS*COL_W) { proj.x = GX + COLS*COL_W; proj.vx *= -1; }
      drawMiniDream(proj.x, proj.y, R, proj.colour);
      let hit = false;
      outer: for (let r = 0; r < grid.length; r++) {
        const cols = r % 2 === 0 ? COLS : COLS - 1;
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] < 0) continue;
          const pos = bubblePos(r, c);
          if (Math.hypot(proj.x - pos.x, proj.y - pos.y) < R * 1.9) {
            const colour = grid[r][c], toCheck = [[r, c]], popped = [], seen = new Set();
            while (toCheck.length) {
              const [tr, tc] = toCheck.pop(), key = tr+','+tc;
              if (seen.has(key)) continue; seen.add(key);
              if (!grid[tr] || grid[tr][tc] !== colour) continue;
              popped.push([tr, tc]);
              const odd = tr%2===1;
              [[tr-1,odd?tc:tc-1],[tr-1,odd?tc+1:tc],[tr,tc-1],[tr,tc+1],[tr+1,odd?tc:tc-1],[tr+1,odd?tc+1:tc]]
                .forEach(([nr,nc]) => { if (nr>=0&&nc>=0&&grid[nr]&&nc<(nr%2===0?COLS:COLS-1)) toCheck.push([nr,nc]); });
            }
            if (popped.length >= 3) {
              for (const [pr,pc] of popped) { popList.push({r:pr,c:pc,colour:grid[pr][pc],progress:0}); grid[pr][pc] = -1; }
            } else { grid[r][c] = proj.colour; }
            if (grid.flat().filter(v=>v>=0).length < 4) resetGrid();
            hit = true; break outer;
          }
        }
      }
      if (hit || proj.y < GY) proj.active = false;
    }

    drawMiniDream(KX, KY - 14, R, proj.colour);
    drawMiniKobie(KX, KY, aimAngle);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// ── Kitten Khaos preview ────────────────────────
(function () {
  const canvas = document.getElementById('preview-kittens');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const stars = makeStars(40, W, H);

  const KITTEN_COLORS     = ['#f4a460', '#aaaaaa', '#ff9999', '#cccccc'];
  const KITTEN_EAR_COLORS = ['#ffb6c1', '#bbbbbb', '#ffaaaa', '#dddddd'];

  // Kittens orbiting the centre launcher
  const kittens = Array.from({ length: 5 }, (_, i) => ({
    angle: (i / 5) * Math.PI * 2,
    radius: 44 + (i % 2) * 14,
    speed: 0.008 + i * 0.003,
    size: 14 + (i % 3) * 3,
    colorIdx: i % KITTEN_COLORS.length,
    frame: i * 20,
  }));

  // Bottle projectile
  const projectile = { active: false, x: 0, y: 0, vx: 0, vy: 0, angle: 0 };
  let shootTimer = 0;

  function drawMiniKitten(x, y, size, cIdx, f) {
    const c  = KITTEN_COLORS[cIdx];
    const ec = KITTEN_EAR_COLORS[cIdx];
    ctx.save();
    ctx.translate(x, y);
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
    ctx.lineTo(-size * 0.30, -size * 0.52);
    ctx.lineTo(-size * 0.10, -size * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.22, -size * 0.34);
    ctx.lineTo(size * 0.30, -size * 0.52);
    ctx.lineTo(size * 0.10, -size * 0.36);
    ctx.closePath();
    ctx.fill();
    // Inner ears
    ctx.fillStyle = ec;
    ctx.beginPath();
    ctx.moveTo(-size*0.21, -size*0.37); ctx.lineTo(-size*0.27, -size*0.49); ctx.lineTo(-size*0.13, -size*0.38);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size*0.21, -size*0.37); ctx.lineTo(size*0.27, -size*0.49); ctx.lineTo(size*0.13, -size*0.38);
    ctx.closePath(); ctx.fill();
    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-size*0.09, -size*0.18, size*0.06, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size*0.09,  -size*0.18, size*0.06, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-size*0.07, -size*0.20, size*0.02, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size*0.11,  -size*0.20, size*0.02, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawMiniBottle(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#e8f4f8';
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-3, -9, 6, 11, 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.roundRect(-3, -13, 6, 4, 1);
    ctx.fill();
    ctx.restore();
  }

  const LX = W / 2, LY = H - 22;
  let frame = 0;

  function tick() {
    frame++;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update & draw kittens
    for (const k of kittens) {
      k.angle += k.speed;
      k.frame++;
      const kx = LX + Math.cos(k.angle) * k.radius;
      const ky = (H / 2 - 10) + Math.sin(k.angle) * k.radius * 0.55;
      drawMiniKitten(kx, ky, k.size, k.colorIdx, k.frame);
    }

    // Shoot a bottle periodically
    shootTimer++;
    if (shootTimer > 60 && !projectile.active) {
      const target = kittens[Math.floor(Math.random() * kittens.length)];
      const tx = LX + Math.cos(target.angle) * target.radius;
      const ty = (H / 2 - 10) + Math.sin(target.angle) * target.radius * 0.55;
      const dx = tx - LX, dy = ty - LY;
      const len = Math.sqrt(dx*dx + dy*dy);
      projectile.active = true;
      projectile.x = LX; projectile.y = LY;
      projectile.vx = (dx / len) * 3.5;
      projectile.vy = (dy / len) * 3.5;
      projectile.angle = 0;
      shootTimer = 0;
    }

    if (projectile.active) {
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      projectile.angle += 0.15;
      drawMiniBottle(projectile.x, projectile.y, projectile.angle);
      if (projectile.x < 0 || projectile.x > W || projectile.y < 0 || projectile.y > H) {
        projectile.active = false;
      }
    }

    // Launcher bottle
    drawMiniBottle(LX, LY, 0);

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
// ── Kobie's Coffee Rush preview ───────────────────────
(function () {
  const canvas = document.getElementById('preview-coffee');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const stars = makeStars(30, W, H);

  const FLOOR = H - 30;

  // ── Item draw functions matching the actual game exactly ──

  function drawCoffee(x, y, r) {
    ctx.fillStyle = '#c8914a';
    ctx.beginPath();
    ctx.moveTo(x - r*0.7, y - r*0.5); ctx.lineTo(x - r*0.55, y + r*0.8);
    ctx.lineTo(x + r*0.55, y + r*0.8); ctx.lineTo(x + r*0.7, y - r*0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8B5e3c';
    ctx.fillRect(x - r*0.68, y, r*1.36, r*0.45);
    ctx.fillStyle = '#3d1c02';
    ctx.beginPath(); ctx.ellipse(x, y - r*0.48, r*0.65, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i*r*0.25, y - r*0.65);
      ctx.quadraticCurveTo(x + i*r*0.25 + r*0.15, y - r*1.0, x + i*r*0.25, y - r*1.3);
      ctx.stroke();
    }
    ctx.strokeStyle = '#c8914a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + r*0.82, y + r*0.15, r*0.28, -0.8, 0.8); ctx.stroke();
  }

  function drawLatte(x, y, r) {
    ctx.fillStyle = 'rgba(220,240,255,0.35)';
    ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r*0.55, y - r*0.85); ctx.lineTo(x - r*0.48, y + r*0.85);
    ctx.lineTo(x + r*0.48, y + r*0.85); ctx.lineTo(x + r*0.55, y - r*0.85);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.moveTo(x - r*0.47, y + r*0.3); ctx.lineTo(x - r*0.47, y + r*0.85);
    ctx.lineTo(x + r*0.47, y + r*0.85); ctx.lineTo(x + r*0.47, y + r*0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a4a1e';
    ctx.beginPath();
    ctx.moveTo(x - r*0.5, y - r*0.3); ctx.lineTo(x - r*0.47, y + r*0.3);
    ctx.lineTo(x + r*0.47, y + r*0.3); ctx.lineTo(x + r*0.5, y - r*0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff8f0';
    ctx.beginPath(); ctx.ellipse(x, y - r*0.82, r*0.5, r*0.14, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + r*0.25, y + r*0.6); ctx.lineTo(x + r*0.35, y - r*1.5); ctx.stroke();
  }

  function drawCroissant(x, y, r) {
    ctx.fillStyle = '#c47a1a';
    ctx.beginPath();
    ctx.moveTo(x - r*0.85, y + r*0.2);
    ctx.bezierCurveTo(x - r*0.6, y - r*0.7, x + r*0.6, y - r*0.7, x + r*0.85, y + r*0.2);
    ctx.bezierCurveTo(x + r*0.55, y + r*0.55, x - r*0.55, y + r*0.55, x - r*0.85, y + r*0.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8b030';
    ctx.beginPath();
    ctx.moveTo(x - r*0.65, y + r*0.05);
    ctx.bezierCurveTo(x - r*0.4, y - r*0.55, x + r*0.4, y - r*0.55, x + r*0.65, y + r*0.05);
    ctx.bezierCurveTo(x + r*0.35, y + r*0.38, x - r*0.35, y + r*0.38, x - r*0.65, y + r*0.05);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5d060';
    ctx.beginPath(); ctx.ellipse(x, y - r*0.05, r*0.28, r*0.18, 0, 0, Math.PI*2); ctx.fill();
  }

  function drawMuffin(x, y, r) {
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.moveTo(x - r*0.6, y + r*0.05); ctx.lineTo(x - r*0.45, y + r*0.85);
    ctx.lineTo(x + r*0.45, y + r*0.85); ctx.lineTo(x + r*0.6, y + r*0.05);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff4499'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(x + i*r*0.22, y + r*0.05); ctx.lineTo(x + i*r*0.18, y + r*0.85); ctx.stroke();
    }
    ctx.fillStyle = '#5a2810';
    ctx.beginPath();
    ctx.arc(x, y - r*0.18, r*0.72, Math.PI, 0);
    ctx.lineTo(x + r*0.6, y + r*0.08); ctx.lineTo(x - r*0.6, y + r*0.08);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1050';
    for (const [dx, dy] of [[0.22,-0.05],[-0.2,-0.28],[0.0,-0.42],[-0.3,0.08],[0.28,-0.32]]) {
      ctx.beginPath(); ctx.arc(x+dx*r, y - r*0.18 + dy*r, r*0.1, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawCookie(x, y, r) {
    const biteAngle = 0.35;
    ctx.fillStyle = '#e8b84b';
    ctx.beginPath();
    ctx.arc(x, y, r*0.78, biteAngle, Math.PI*2 + biteAngle - 0.05);
    ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5c84a';
    ctx.beginPath();
    ctx.arc(x, y, r*0.65, biteAngle, Math.PI*2 + biteAngle - 0.05);
    ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a1a05';
    for (const [dx, dy] of [[-0.3,-0.2],[0.1,-0.35],[-0.1,0.2],[0.3,0.1],[-0.35,0.25]]) {
      ctx.beginPath(); ctx.ellipse(x+dx*r, y+dy*r, r*0.11, r*0.09, 0.3, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawColdCup(x, y, r) {
    ctx.fillStyle = '#ff4466';
    ctx.beginPath(); ctx.arc(x, y, r*0.82, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(x - r*0.28, y - r*0.28, r*0.28, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a0010';
    ctx.beginPath(); ctx.ellipse(x - r*0.28, y - r*0.15, r*0.13, r*0.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r*0.28, y - r*0.15, r*0.13, r*0.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#1a0010'; ctx.lineWidth = r*0.12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y + r*0.38, r*0.32, Math.PI + 0.4, -0.4); ctx.stroke();
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

  function drawAlarm(x, y, r) {
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath(); ctx.arc(x, y, r*0.72, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#cc8800'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath(); ctx.arc(x, y, r*0.55, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r*0.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r*0.1, y); ctx.stroke();
    ctx.fillStyle = '#cc8800';
    ctx.beginPath(); ctx.arc(x - r*0.62, y - r*0.55, r*0.18, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r*0.62, y - r*0.55, r*0.18, 0, Math.PI*2); ctx.fill();
  }

  function drawRottenFood(x, y, r) {
    ctx.fillStyle = '#2a6e1a';
    ctx.beginPath(); ctx.roundRect(x - r*0.55, y - r*0.6, r*1.1, r*1.4, [4,4,6,6]); ctx.fill();
    ctx.fillStyle = '#3a8a22';
    ctx.beginPath(); ctx.roundRect(x - r*0.18, y - r*0.55, r*0.22, r*1.3, 3); ctx.fill();
    ctx.fillStyle = '#1a4a10';
    ctx.beginPath(); ctx.roundRect(x - r*0.5, y - r*0.65, r*1.0, r*0.18, [4,4,0,0]); ctx.fill();
    ctx.fillStyle = '#ccff44';
    ctx.beginPath(); ctx.arc(x, y + r*0.05, r*0.32, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x - r*0.22, y + r*0.22, r*0.44, r*0.2, [0,0,3,3]); ctx.fill();
    ctx.fillStyle = '#2a6e1a';
    ctx.beginPath(); ctx.arc(x - r*0.12, y + r*0.02, r*0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r*0.12, y + r*0.02, r*0.1, 0, Math.PI*2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.roundRect(x - r*0.18 + i*r*0.18, y + r*0.23, r*0.12, r*0.14, 1); ctx.fill();
    }
    ctx.fillStyle = '#aaff44cc';
    for (const [dx, dy, br] of [[-0.25,-0.9,0.08],[0.1,-1.1,0.1],[0.35,-0.85,0.07]]) {
      ctx.beginPath(); ctx.arc(x+dx*r, y+dy*r, br*r, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawStar(x, y, r, t) {
    const outer = r * 0.8, inner = r * 0.35;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.03);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, outer);
    grad.addColorStop(0, '#ffee44'); grad.addColorStop(1, '#ff8800');
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? outer : inner;
      i === 0 ? ctx.moveTo(Math.cos(angle)*rad, Math.sin(angle)*rad)
              : ctx.lineTo(Math.cos(angle)*rad, Math.sin(angle)*rad);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawHeart(x, y, r) {
    ctx.save(); ctx.translate(x, y);
    const grad = ctx.createRadialGradient(-r*0.1, -r*0.2, 0, 0, 0, r);
    grad.addColorStop(0, '#ff88aa'); grad.addColorStop(1, '#ff2255');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, r*0.3);
    ctx.bezierCurveTo(-r*0.9, -r*0.2, -r*0.9, -r*0.9, 0, -r*0.4);
    ctx.bezierCurveTo(r*0.9, -r*0.9, r*0.9, -r*0.2, 0, r*0.3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Kobie matching the actual game's drawKobie, scaled for preview
  // Exact same draw code as the game, just scaled down via ctx.scale
  function drawMiniKobie(x) {
    const scale = 0.55;
    ctx.save();
    ctx.translate(x, FLOOR);
    ctx.scale(scale, scale);

    const hairCol = '#343432', skinCol = '#f5c6a0', shirtCol = '#ff69b4';

    // Body
    ctx.fillStyle = shirtCol;
    ctx.beginPath(); ctx.ellipse(0, -8, 20, 26, 0, 0, Math.PI*2); ctx.fill();
    // Shirt detail
    ctx.strokeStyle = '#ff4499'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-5,-18); ctx.lineTo(0,-10); ctx.lineTo(5,-18); ctx.stroke();
    // Legs
    ctx.fillStyle = '#222244';
    ctx.beginPath(); ctx.ellipse(-7, 16, 6, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7,  17, 6, 12, 0, 0, Math.PI*2); ctx.fill();
    // Neck
    ctx.fillStyle = skinCol; ctx.fillRect(-4, -30, 8, 12);
    // Head — hair back
    ctx.fillStyle = hairCol;
    ctx.beginPath(); ctx.ellipse(0, -44, 18, 20, 0, 0, Math.PI*2); ctx.fill();
    // Curly hair sides
    ctx.lineWidth = 5; ctx.strokeStyle = hairCol; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s*14,-50); ctx.bezierCurveTo(s*22,-36,s*26,-16,s*20,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*18,-20); ctx.bezierCurveTo(s*24,-8,s*20,8,s*14,14); ctx.stroke();
    }
    // Face
    ctx.fillStyle = skinCol;
    ctx.beginPath(); ctx.ellipse(0, -44, 15, 17, 0, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.ellipse(-5,-47,2.5,3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -47,2.5,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-4,-48,0.9,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -48,0.9,0,Math.PI*2); ctx.fill();
    // Eyebrows
    ctx.strokeStyle = hairCol; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8,-52); ctx.quadraticCurveTo(-5,-54,-2,-52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -52); ctx.quadraticCurveTo(5, -54, 2,-52); ctx.stroke();
    // Smile
    ctx.strokeStyle = '#c07850'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0,-40,5,0.2,Math.PI-0.2); ctx.stroke();
    // Blush
    ctx.fillStyle = 'rgba(255,150,150,0.28)';
    ctx.beginPath(); ctx.ellipse(-9,-41,4,2.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -41,4,2.5,0,0,Math.PI*2); ctx.fill();
    // Arms
    ctx.strokeStyle = skinCol; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-18,-12); ctx.lineTo(-26,4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, -12); ctx.lineTo(26, 4); ctx.stroke();
    // Tattoos
    ctx.save();
    ctx.strokeStyle = '#7a5c9a'; ctx.fillStyle = '#7a5c9a';
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    // Dog — upper left arm
    ctx.save(); ctx.translate(-21, -8); ctx.scale(0.75, 0.75);
    ctx.beginPath(); ctx.ellipse(0,2,4,3,0,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-3,-3,3,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5,-5); ctx.quadraticCurveTo(-8,-3,-6,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1,-6); ctx.quadraticCurveTo(1,-8,2,-5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4,0); ctx.quadraticCurveTo(8,-3,7,-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2,5); ctx.lineTo(-3,9); ctx.moveTo(2,5); ctx.lineTo(3,9); ctx.stroke();
    ctx.beginPath(); ctx.arc(-4,-3.5,0.9,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // Teacup — upper right arm
    ctx.save(); ctx.translate(21, -8); ctx.scale(0.75, 0.75);
    ctx.beginPath(); ctx.moveTo(-5,-2); ctx.lineTo(-4,4); ctx.lineTo(4,4); ctx.lineTo(5,-2); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5,-2); ctx.lineTo(5,-2); ctx.stroke();
    ctx.beginPath(); ctx.arc(6.5,1.5,2.2,-0.7,0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1,-3); ctx.quadraticCurveTo(1,-5,-1,-7); ctx.moveTo(1.5,-3); ctx.quadraticCurveTo(3.5,-5,1.5,-7); ctx.stroke();
    ctx.restore();
    // Snail — lower right arm
    ctx.save(); ctx.translate(24.5, 1); ctx.scale(0.75, 0.75);
    ctx.beginPath(); ctx.arc(0,0,4.5,0,Math.PI*1.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0.5,0.3,2.2,0,Math.PI*1.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4.5,1); ctx.quadraticCurveTo(-7,2,-9,1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7,1); ctx.lineTo(-8.5,-2); ctx.moveTo(-8.5,1); ctx.lineTo(-10,-1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(-8.5,-2.3,0.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-10.2,-1.8,0.8,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.restore();
    // Tray
    ctx.fillStyle = '#c8914a';
    ctx.beginPath(); ctx.roundRect(-30,2,60,8,3); ctx.fill();
    ctx.fillStyle = '#daa060';
    ctx.beginPath(); ctx.roundRect(-28,2,56,4,2); ctx.fill();

    ctx.restore();
  }

  // Item pool matching the actual game
  const DRAW_FNS = [drawCoffee, drawLatte, drawCroissant, drawMuffin, drawCookie,
                    drawColdCup, drawRottenFood, drawAlarm, drawStar, drawHeart];
  const IS_BAD   = [false, false, false, false, false, true, true, true, false, false];

  let kobie = { x: W/2, targetX: W/2 };
  let items = [];
  let spawnTimer = 0, frame = 0;

  function spawnItem() {
    // Weight toward good items — same ratio as the actual game
    const pool = [0,0,0,1,1,2,3,4,5,6,7,8]; // indices into DRAW_FNS
    const idx  = pool[Math.floor(Math.random() * pool.length)];
    items.push({ x: 12 + Math.random()*(W-24), y: -12, r: 9 + Math.random()*4,
                 drawIdx: idx, speed: 1.3 + Math.random()*0.9, frame: 0 });
  }

  function tick() {
    frame++;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }

    // Scrolling floor grid (matches the actual game background)
    ctx.strokeStyle = '#ff69b410'; ctx.lineWidth = 1;
    const scroll = (frame * 1.5) % 30;
    for (let x = -30 + scroll; x < W + 30; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, FLOOR - 4); ctx.lineTo(x-40, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, FLOOR - 4); ctx.lineTo(x+40, H); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, FLOOR-4); ctx.lineTo(W, FLOOR-4); ctx.stroke();

    // Kobie follows closest good item
    const good = items.filter(i => !IS_BAD[i.drawIdx]);
    if (good.length) kobie.targetX = good.reduce((a,b) => Math.abs(b.x-kobie.x) < Math.abs(a.x-kobie.x) ? b : a).x;
    kobie.x += (kobie.targetX - kobie.x) * 0.1;
    kobie.x  = Math.max(20, Math.min(W-20, kobie.x));

    spawnTimer++;
    if (spawnTimer > 38) { spawnItem(); spawnTimer = 0; }

    items = items.filter(i => i.y < H + 20);
    for (const i of items) {
      i.y += i.speed; i.frame++;
      DRAW_FNS[i.drawIdx](i.x, i.y, i.r, i.frame);
    }

    drawMiniKobie(kobie.x);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// ── Hall of Fame ──────────────────────────────────────
// ── Hall of Fame ──────────────────────────────────────
(function() {
  hsRenderBest('bubble-slumber', 'hs-landing-todos');
  hsRenderBest('beast-feeder',   'hs-landing-kittens');  // was 'hungry-hungry-kittens'
  hsRenderBest('coffee-rush',    'hs-landing-coffee');
  hsRenderBest('colour-capture', 'hs-landing-colour');   // moved inside the block
})();
// ── Colour Capture preview ────────────────────────────────
(function () {
  const canvas = document.getElementById('preview-colour');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const stars = makeStars(25, W, H);

  const COLOURS = [
    { name:'RED',    hex:'#ff3344' },
    { name:'BLUE',   hex:'#3388ff' },
    { name:'YELLOW', hex:'#ffdd00' },
    { name:'GREEN',  hex:'#33cc66' },
    { name:'PURPLE', hex:'#aa44ff' },
    { name:'ORANGE', hex:'#ff8800' },
    { name:'PINK',   hex:'#ff69b4' },
  ];

  const OBJ_COLOURS = COLOURS.map(c => c.hex);

  let targetIdx = 0, targetTimer = 0;
  let items = [], spawnTimer = 0, frame = 0;

  function spawnItem() {
    const col = OBJ_COLOURS[Math.floor(Math.random() * OBJ_COLOURS.length)];
    const shapes = ['circle', 'star', 'diamond'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    items.push({ x: 15 + Math.random()*(W-30), y: -12, r: 9+Math.random()*5, col, shape, speed: 1.2+Math.random()*0.8 });
  }

  function drawItem(item) {
    const { x, y, r, col, shape } = item;
    if (shape === 'circle') {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(x - r*0.3, y - r*0.3, r*0.25, 0, Math.PI*2); ctx.fill();
    } else if (shape === 'star') {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i*Math.PI/5) - Math.PI/2;
        const rad = i%2===0 ? r*0.85 : r*0.38;
        i===0 ? ctx.moveTo(x+Math.cos(a)*rad, y+Math.sin(a)*rad) : ctx.lineTo(x+Math.cos(a)*rad, y+Math.sin(a)*rad);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y-r); ctx.lineTo(x+r*0.72, y); ctx.lineTo(x, y+r); ctx.lineTo(x-r*0.72, y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(x-r*0.3, y-r*0.7); ctx.lineTo(x-r*0.65, y-r*0.05); ctx.lineTo(x-r*0.1, y-r*0.2);
      ctx.closePath(); ctx.fill();
    }
  }

  function tick() {
    frame++;
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }

    // Rotate target colour every 90 frames
    targetTimer++;
    if (targetTimer > 90) { targetIdx = (targetIdx+1) % COLOURS.length; targetTimer = 0; }

    spawnTimer++;
    if (spawnTimer > 30) { spawnItem(); spawnTimer = 0; }
    items = items.filter(i => i.y < H+20);
    for (const i of items) { i.y += i.speed; drawItem(i); }

    // Target colour panel
    const tc = COLOURS[targetIdx];
    ctx.fillStyle = '#111128';
    ctx.beginPath(); ctx.roundRect(0, 0, W, 32, [0,0,6,6]); ctx.fill();
    ctx.fillStyle = tc.hex;
    ctx.beginPath(); ctx.roundRect(W/2-35, 5, 70, 22, 4); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3;
    ctx.fillText(tc.name, W/2, 20);
    ctx.shadowBlur = 0;

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

hsRenderBest('colour-capture', 'hs-landing-colour');