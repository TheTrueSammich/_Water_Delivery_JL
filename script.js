const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); resetBird(); });

// --- Layout constants ---
const GROUND_H    = 45;
const PLAT_X      = -60;
const PLAT_W      = 440;
const PLAT_H      = 230;
const SIDE_WALL_GAP = 85;
const SIDE_WALL_W = 14;
const SIDE_WALL_H = 460;
const WALL_W      = 1;
const FORK_H      = 90;
const FORK_SPREAD = 24;
const SLING_X     = 275;
const BIRD_R      = 18;
const GRAVITY     = 0.35;
const MAX_PULL    = 125;
const POWER       = 0.2;

// --- Layout helpers (recalculate on resize) ---
function gY()      { return canvas.height - GROUND_H; }
function platTop() { return gY() - PLAT_H; }
function forkL()   { return { x: SLING_X - FORK_SPREAD, y: platTop() - FORK_H }; }
function forkR()   { return { x: SLING_X + FORK_SPREAD, y: platTop() - FORK_H }; }
function restPos() { return { x: SLING_X, y: platTop() - FORK_H + 5 }; }

// --- State ---
let bx, by, bvx, bvy;
let dragging = false;
let launched = false;
let trail    = [];
let pending  = false;
let showHint = true;
let aimX = 0;
let aimY = 0;

function resetBird() {
  const r = restPos();
  bx = r.x; by = r.y;
  bvx = 0;  bvy = 0;
  dragging = false;
  launched = false;
  trail    = [];
  pending  = false;
  aimX = bx;
  aimY = by;
}
resetBird();

function scheduleReset(ms) {
  if (!pending) {
    pending = true;
    setTimeout(resetBird, ms);
  }
}

// --- Drawing ---
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0,   '#1a6fa0');
  g.addColorStop(0.5, '#87ceeb');
  g.addColorStop(1,   '#b8e4f7');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawClouds() {
  const clouds = [
    { x: 350,  y: 80,  rx: 70, ry: 35 },
    { x: 620,  y: 55,  rx: 55, ry: 28 },
    { x: 900,  y: 90,  rx: 75, ry: 38 },
    { x: 1150, y: 65,  rx: 60, ry: 32 },
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  clouds.forEach(c => {
    ctx.beginPath();
    ctx.ellipse(c.x,             c.y,     c.rx * 0.7,  c.ry,        0, 0, Math.PI * 2);
    ctx.ellipse(c.x + c.rx * 0.6, c.y + 5, c.rx * 0.5,  c.ry * 0.8,  0, 0, Math.PI * 2);
    ctx.ellipse(c.x - c.rx * 0.5, c.y + 8, c.rx * 0.45, c.ry * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGround() {
  ctx.fillStyle = '#4a7c20';
  ctx.fillRect(0, gY(), canvas.width, GROUND_H);
  ctx.fillStyle = '#5a9c28';
  ctx.fillRect(0, gY(), canvas.width, 10);
}

function drawPlatform() {
  const py     = platTop();
  const totalH = PLAT_H + GROUND_H;

  // Main body
  ctx.fillStyle = '#808080';
  ctx.fillRect(PLAT_X, py, PLAT_W, totalH);

  // Top highlight
  ctx.fillStyle = '#a8a8a8';
  ctx.fillRect(PLAT_X, py, PLAT_W, 12);

  // Right shadow edge
  ctx.fillStyle = '#505050';
  ctx.fillRect(PLAT_X + PLAT_W - 10, py, 10, totalH);

  // Brick pattern
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  const brickH = 28;
  const rows = Math.ceil(totalH / brickH);
  for (let row = 0; row < rows; row++) {
    const rowY = py + 12 + row * brickH;
    ctx.beginPath();
    ctx.moveTo(PLAT_X, rowY);
    ctx.lineTo(PLAT_X + PLAT_W - 10, rowY);
    ctx.stroke();
    const offset = row % 2 === 0 ? 0 : 45;
    for (let vx = PLAT_X + offset; vx < PLAT_X + PLAT_W - 10; vx += 90) {
      ctx.beginPath();
      ctx.moveTo(vx, rowY);
      ctx.lineTo(vx, Math.min(rowY + brickH, py + totalH));
      ctx.stroke();
    }
  }
}

function drawSideWall() {
  const x = PLAT_X + PLAT_W + SIDE_WALL_GAP;
  const y = gY() - SIDE_WALL_H;

  ctx.fillStyle = '#5c3a1a';
  ctx.fillRect(x, y, SIDE_WALL_W, SIDE_WALL_H + GROUND_H);

  ctx.fillStyle = '#7a4a1f';
  ctx.fillRect(x, y, SIDE_WALL_W, 8);

  ctx.fillStyle = '#3f2611';
  ctx.fillRect(x + SIDE_WALL_W - 3, y, 3, SIDE_WALL_H + GROUND_H);
}

function drawSlingshot() {
  const fl   = forkL();
  const fr   = forkR();
  const sy   = platTop();
  const midY = sy - FORK_H * 0.38;

  ctx.save();
  ctx.strokeStyle = '#4a2800';
  ctx.lineWidth   = 12;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // Stem
  ctx.beginPath();
  ctx.moveTo(SLING_X, sy);
  ctx.lineTo(SLING_X, midY);
  ctx.stroke();

  // Left prong
  ctx.beginPath();
  ctx.moveTo(SLING_X, midY);
  ctx.lineTo(fl.x, fl.y);
  ctx.stroke();

  // Right prong
  ctx.beginPath();
  ctx.moveTo(SLING_X, midY);
  ctx.lineTo(fr.x, fr.y);
  ctx.stroke();

  // Wood grain highlight
  ctx.strokeStyle = '#7a4818';
  ctx.lineWidth   = 4;
  ctx.beginPath();
  ctx.moveTo(SLING_X + 3, sy);
  ctx.lineTo(SLING_X + 3, midY);
  ctx.stroke();

  // Fork tip knobs
  ctx.fillStyle = '#2e1800';
  ctx.beginPath();
  ctx.arc(fl.x, fl.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(fr.x, fr.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function getBandPos() {
  if (launched) { const r = restPos(); return { x: r.x, y: r.y }; }
  return { x: bx, y: by };
}

// Draw one rubber-band segment; call 'left' before bird and 'right' after for layering
function drawBandSegment(side) {
  const tip = side === 'left' ? forkL() : forkR();
  const pos = getBandPos();
  ctx.save();
  ctx.strokeStyle = '#6B3010';
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  ctx.restore();
}

function drawTrail() {
  trail.forEach((p, i) => {
    const t = (i + 1) / trail.length;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + t * 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 140, 20, ${t * 0.45})`;
    ctx.fill();
  });
}

function drawDragAim() {
  if (!dragging || launched) return;

  const toMouseX = aimX - bx;
  const toMouseY = aimY - by;
  const mouseDist = Math.hypot(toMouseX, toMouseY);

  if (mouseDist > 2) {
    const dots = 3;
    for (let i = 1; i <= dots; i++) {
      const t = i / dots;
      const x = bx + toMouseX * t;
      const y = by + toMouseY * t;
      ctx.beginPath();
      ctx.arc(x, y, 5.6 + t * 18.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255, ${0.2 + t * 0.45})`;
      ctx.fill();
    }
  }

  const r = restPos();
  const vx = r.x - bx;
  const vy = r.y - by;
  const pullDist = Math.hypot(vx, vy);
  if (pullDist < 1) return;

  const ux = vx / pullDist;
  const uy = vy / pullDist;
  const arrowLen = Math.min(165, 32 + pullDist * 1.1);
  const startX = bx + ux * (BIRD_R + 6);
  const startY = by + uy * (BIRD_R + 6);
  const endX = startX + ux * arrowLen;
  const endY = startY + uy * arrowLen;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 230, 120, 0.95)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const headSize = 14;
  const perpX = -uy;
  const perpY = ux;
  ctx.fillStyle = 'rgba(255, 230, 120, 0.95)';
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - ux * headSize + perpX * (headSize * 0.55), endY - uy * headSize + perpY * (headSize * 0.55));
  ctx.lineTo(endX - ux * headSize - perpX * (headSize * 0.55), endY - uy * headSize - perpY * (headSize * 0.55));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBird(x, y) {
  ctx.beginPath();
  ctx.ellipse(x + 3, y + BIRD_R - 2, BIRD_R * 0.85, BIRD_R * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, BIRD_R, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function drawHint() {
  if (!showHint || launched) return;
  ctx.save();
  ctx.font        = 'bold 15px Arial, sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur  = 5;
  ctx.fillText('Drag the bird to launch!', bx, by - BIRD_R - 18);
  ctx.restore();
}

function handlePlatformCollision() {
  const left = PLAT_X;
  const right = PLAT_X + PLAT_W;
  const top = platTop();
  const bottom = canvas.height;

  const closestX = Math.max(left, Math.min(bx, right));
  const closestY = Math.max(top, Math.min(by, bottom));
  const dx = bx - closestX;
  const dy = by - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq > BIRD_R * BIRD_R) return;

  let nx = 0;
  let ny = 0;
  let penetration = 0;

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    nx = dx / dist;
    ny = dy / dist;
    penetration = BIRD_R - dist;
  } else {
    const overlapLeft = bx + BIRD_R - left;
    const overlapRight = right - (bx - BIRD_R);
    const overlapTop = by + BIRD_R - top;
    const overlapBottom = bottom - (by - BIRD_R);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapTop) {
      nx = 0;
      ny = -1;
      penetration = overlapTop;
    } else if (minOverlap === overlapRight) {
      nx = 1;
      ny = 0;
      penetration = overlapRight;
    } else if (minOverlap === overlapLeft) {
      nx = -1;
      ny = 0;
      penetration = overlapLeft;
    } else {
      nx = 0;
      ny = 1;
      penetration = overlapBottom;
    }
  }

  bx += nx * penetration;
  by += ny * penetration;

  const vn = bvx * nx + bvy * ny;
  if (vn < 0) {
    const restitution = 0.45;
    bvx -= (1 + restitution) * vn * nx;
    bvy -= (1 + restitution) * vn * ny;

    const tangentialFriction = 0.86;
    if (Math.abs(ny) > 0.5) {
      bvx *= tangentialFriction;
      if (Math.abs(bvy) < 1.1) bvy = 0;
    }
  }
}

function handleSideWallCollision() {
  const left = PLAT_X + PLAT_W + SIDE_WALL_GAP;
  const right = left + SIDE_WALL_W;
  const top = gY() - SIDE_WALL_H;
  const bottom = canvas.height;

  const closestX = Math.max(left, Math.min(bx, right));
  const closestY = Math.max(top, Math.min(by, bottom));
  const dx = bx - closestX;
  const dy = by - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq > BIRD_R * BIRD_R) return;

  let nx = 0;
  let ny = 0;
  let penetration = 0;

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    nx = dx / dist;
    ny = dy / dist;
    penetration = BIRD_R - dist;
  } else {
    const overlapLeft = bx + BIRD_R - left;
    const overlapRight = right - (bx - BIRD_R);
    const overlapTop = by + BIRD_R - top;
    const overlapBottom = bottom - (by - BIRD_R);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) {
      nx = -1;
      ny = 0;
      penetration = overlapLeft;
    } else if (minOverlap === overlapRight) {
      nx = 1;
      ny = 0;
      penetration = overlapRight;
    } else if (minOverlap === overlapTop) {
      nx = 0;
      ny = -1;
      penetration = overlapTop;
    } else {
      nx = 0;
      ny = 1;
      penetration = overlapBottom;
    }
  }

  bx += nx * penetration;
  by += ny * penetration;

  const vn = bvx * nx + bvy * ny;
  if (vn < 0) {
    const restitution = 0.4;
    bvx -= (1 + restitution) * vn * nx;
    bvy -= (1 + restitution) * vn * ny;

    if (Math.abs(nx) > 0.5) {
      bvy *= 0.96;
    }
  }
}

function handleRightBarrierCollision() {
  const left = canvas.width - WALL_W;
  const right = canvas.width;
  const top = 0;
  const bottom = canvas.height;

  const closestX = Math.max(left, Math.min(bx, right));
  const closestY = Math.max(top, Math.min(by, bottom));
  const dx = bx - closestX;
  const dy = by - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq > BIRD_R * BIRD_R) return;

  let nx = 0;
  let ny = 0;
  let penetration = 0;

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    nx = dx / dist;
    ny = dy / dist;
    penetration = BIRD_R - dist;
  } else {
    const overlapLeft = bx + BIRD_R - left;
    const overlapRight = right - (bx - BIRD_R);
    const overlapTop = by + BIRD_R - top;
    const overlapBottom = bottom - (by - BIRD_R);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) {
      nx = -1;
      ny = 0;
      penetration = overlapLeft;
    } else if (minOverlap === overlapRight) {
      nx = 1;
      ny = 0;
      penetration = overlapRight;
    } else if (minOverlap === overlapTop) {
      nx = 0;
      ny = -1;
      penetration = overlapTop;
    } else {
      nx = 0;
      ny = 1;
      penetration = overlapBottom;
    }
  }

  bx += nx * penetration;
  by += ny * penetration;

  const vn = bvx * nx + bvy * ny;
  if (vn < 0) {
    const restitution = 0.52;
    bvx -= (1 + restitution) * vn * nx;
    bvy -= (1 + restitution) * vn * ny;

    if (Math.abs(nx) > 0.5) {
      bvy *= 0.97;
    }
  }
}

// --- Physics ---
function update() {
  if (!launched) return;

  trail.push({ x: bx, y: by });
  if (trail.length > 35) trail.shift();

  bvy += GRAVITY;
  bx  += bvx;
  by  += bvy;

  handlePlatformCollision();
  handleSideWallCollision();
  handleRightBarrierCollision();

  // Ground collision + bounce
  const floor = gY() - BIRD_R;
  if (by >= floor) {
    by  = floor;
    bvy *= -0.5;
    bvx *= 0.78;
    if (Math.abs(bvy) < 1.5) bvy = 0;
  }

  // Settle & reset
  if (bvy === 0 && Math.abs(bvx) < 0.25) {
    bvx = 0;
    scheduleReset(1800);
  }

  // Off screen reset
  if (bx > canvas.width + 80 || bx < -80 || by > canvas.height + 80) {
    scheduleReset(500);
  }
}

// --- Main Loop ---
function loop() {
  update();
  drawSky();
  drawClouds();
  drawGround();
  drawPlatform();
  drawSideWall();
  drawSlingshot();
  drawBandSegment('left');   // behind bird
  drawDragAim();
  drawTrail();
  drawBird(bx, by);
  drawBandSegment('right');  // in front of bird
  drawHint();
  requestAnimationFrame(loop);
}
loop();

// --- Input Handling ---
function getXY(e) {
  const rect = canvas.getBoundingClientRect();
  const sx   = canvas.width  / rect.width;
  const sy   = canvas.height / rect.height;
  const src  = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * sx,
    y: (src.clientY - rect.top)  * sy,
  };
}

function onDown(e) {
  if (launched) return;
  const p = getXY(e);
  if (Math.hypot(p.x - bx, p.y - by) <= BIRD_R + 14) {
    dragging = true;
    aimX = p.x;
    aimY = p.y;
    showHint = false;
  }
}

function onMove(e) {
  if (!dragging) return;
  if (e.cancelable) e.preventDefault();
  const p  = getXY(e);
  aimX = p.x;
  aimY = p.y;
  const r  = restPos();
  const dx = Math.min(p.x - r.x, 0);
  const dy = p.y - r.y;
  const d  = Math.hypot(dx, dy);
  if (d > MAX_PULL) {
    bx = r.x + (dx / d) * MAX_PULL;
    by = r.y + (dy / d) * MAX_PULL;
  } else {
    bx = r.x + dx;
    by = p.y;
  }
}

function onUp() {
  if (!dragging) return;
  dragging = false;
  aimX = bx;
  aimY = by;
  const r = restPos();
  bvx = (r.x - bx) * POWER;
  bvy = (r.y - by) * POWER;
  launched = true;
  trail    = [];
}

canvas.addEventListener('mousedown',  onDown);
canvas.addEventListener('mousemove',  onMove);
canvas.addEventListener('mouseup',    onUp);
canvas.addEventListener('touchstart', onDown, { passive: true });
canvas.addEventListener('touchmove',  onMove, { passive: false });
canvas.addEventListener('touchend',   onUp);
