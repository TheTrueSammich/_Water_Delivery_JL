const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const mobileWaterEl = document.getElementById('mobileWaterCount');
const mobilePointsEl = document.getElementById('mobilePointCount');
const mobileLevelEl = document.getElementById('mobileLevelCount');
const mobileNextLevelTextEl = document.getElementById('mobileNextLevelText');
const mobileNextLevelFillEl = document.getElementById('mobileNextLevelFill');
const mobileDropBallEl = document.getElementById('mobileDropBall');

const MOBILE_BREAKPOINT = 800;
const MOBILE_BALL_R = 24;
const MOBILE_GRAVITY = 0.35;
const MOBILE_BALL_RESTITUTION = 0.58;
const MOBILE_PIPE_LEFT_PCTS = [5, 31, 57, 83];
const MOBILE_PIPE_WIDTH_PCT = 18;
const MOBILE_PIPE_X_OFFSET_PX = 22;
const MOBILE_PIPE_BOTTOM_PX = -10;
const MOBILE_PIPE_HEIGHT_VH = 22;
const MOBILE_BUMPER_R = 22;
const MOBILE_BUMPERS = [
  { xPct: 14, yPct: 37 },
  { xPct: 47, yPct: 35 },
  { xPct: 73, yPct: 41 },
  { xPct: 24, yPct: 51 },
  { xPct: 56, yPct: 55 },
  { xPct: 81, yPct: 48 },
  { xPct: 30, yPct: 63 },
  { xPct: 49, yPct: 60 },
  { xPct: 77, yPct: 64 },
];
const MOBILE_PIPE_COLORS = ['#77A8BB', '#FFC907', '#BF6C46', '#69DC69'];

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => {
  resize();
  resetBird();
  resetMobileDropBall();
});

// --- Layout constants ---
const GROUND_H    = 45;
const PLAT_X      = -60;
const PLAT_W      = 440;
const PLAT_H      = 230;
const SIDE_WALL_GAP = 85;
const SIDE_WALL_W = 14;
const SIDE_WALL_H = 440;
const PIPE_W      = 100;
const PIPE_GAP    = 45;
const PIPE_H      = 155;
const PIPE_BURY_DEPTH = 90;
const WALL_W      = 1;
const FORK_H      = 90;
const FORK_SPREAD = 24;
const SLING_X     = 245;
const BIRD_R      = 24;
const BUMPER_R    = 21;
const RIGHT_BARRIER_OVERFLOW = 5000;
const GRAVITY     = 0.35;
const MAX_PULL    = 125;
const POWER       = 0.2;
const RESET_BALL_BTN_DELAY_MS = 6000;
const LEVEL_2_POINTS = 10;
const LEVEL_3_POINTS = 20;
const LEVEL_4_POINTS = 30;

const canImage = new Image();
canImage.src = 'can.jpg';

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
let score = 0;
let scoredThisShot = false;
let lockedPipeIndex = -1;
let waterCount = 10;
let nextWaterBonusAt = 10;
let unlockedLevel = 1;
let gameOver = false;
let restartBtn = { x: 0, y: 0, w: 0, h: 0 };
let resetBallBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };
let shotStartedAtMs = 0;
let levelNoticeText = '';
let levelNoticeUntilMs = 0;
let mobileDrop = {
  x: -120,
  y: -120,
  vx: 0,
  vy: 0,
  pressing: false,
  dropping: false,
};
let mobileActivePointerId = null;

function getLevelForPoints(points) {
  if (points >= LEVEL_4_POINTS) return 4;
  if (points >= LEVEL_3_POINTS) return 3;
  if (points >= LEVEL_2_POINTS) return 2;
  return 1;
}

function getLevelFromScore() {
  return unlockedLevel;
}

function getSafeScore() {
  return Math.max(0, score);
}

function setScore(nextScore) {
  score = Math.max(0, nextScore);
}

function pointsToNextLevel() {
  const safeScore = getSafeScore();
  if (unlockedLevel < 2) return Math.max(0, LEVEL_2_POINTS - safeScore);
  if (unlockedLevel < 3) return Math.max(0, LEVEL_3_POINTS - safeScore);
  if (unlockedLevel < 4) return Math.max(0, LEVEL_4_POINTS - safeScore);
  return 0;
}

function updateUnlockedLevel() {
  const reachedLevel = getLevelForPoints(getSafeScore());
  if (reachedLevel > unlockedLevel) {
    unlockedLevel = reachedLevel;
    levelNoticeText = `Level ${unlockedLevel} Reached!`;
    levelNoticeUntilMs = performance.now() + 1800;
  }
}

function restartGame() {
  score = 0;
  waterCount = 10;
  nextWaterBonusAt = 10;
  unlockedLevel = 1;
  gameOver = false;
  levelNoticeText = '';
  levelNoticeUntilMs = 0;
  showHint = true;
  resetBallBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };
  resetBird();
  resetMobileDropBall();
}

function resetBird() {
  const r = restPos();
  bx = r.x; by = r.y;
  bvx = 0;  bvy = 0;
  dragging = false;
  launched = false;
  trail    = [];
  pending  = false;
  scoredThisShot = false;
  lockedPipeIndex = -1;
  shotStartedAtMs = 0;
  resetBallBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };
  aimX = bx;
  aimY = by;
}
resetBird();
resetMobileDropBall();

function scheduleReset(ms) {
  if (!pending) {
    pending = true;
    setTimeout(resetBird, ms);
  }
}

function isMobileViewport() {
  return Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth) < MOBILE_BREAKPOINT;
}

function getMobilePipeRects() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pipeW = (MOBILE_PIPE_WIDTH_PCT / 100) * w;
  const pipeH = (MOBILE_PIPE_HEIGHT_VH / 100) * h;
  const bottom = h + MOBILE_PIPE_BOTTOM_PX;
  const top = bottom - pipeH;

  return MOBILE_PIPE_LEFT_PCTS.map((pct, i) => {
    const x = (pct / 100) * w + MOBILE_PIPE_X_OFFSET_PX;
    return {
      x,
      y: top,
      w: pipeW,
      h: pipeH,
      color: MOBILE_PIPE_COLORS[i],
    };
  });
}

function getMobileBumpers() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return MOBILE_BUMPERS.map((b) => ({
    x: (b.xPct / 100) * w + MOBILE_PIPE_X_OFFSET_PX,
    y: (b.yPct / 100) * h,
    r: MOBILE_BUMPER_R,
  }));
}

function getMobileHoldYBounds() {
  const minY = 86;
  const pipes = getMobilePipeRects();
  const bumpers = getMobileBumpers();
  const pipeLimit = pipes[0].y - MOBILE_BALL_R - 8;
  const lowestBumperY = Math.max(...bumpers.map((b) => b.y));
  const highestBumperY = Math.min(...bumpers.map((b) => b.y));

  // Keep held ball above the lower bumper field so it cannot be dragged past it.
  const highBarrier = highestBumperY + MOBILE_BUMPER_R - MOBILE_BALL_R - 18;
  const bumperBarrier = Math.min(highBarrier, lowestBumperY - 120);
  const maxY = Math.max(minY, Math.min(pipeLimit, bumperBarrier));
  return { minY, maxY };
}

function renderMobileDropBall() {
  if (!mobileDropBallEl) return;
  mobileDropBallEl.style.transform = `translate(${mobileDrop.x - MOBILE_BALL_R}px, ${mobileDrop.y - MOBILE_BALL_R}px)`;
}

function resetMobileDropBall() {
  mobileDrop.x = window.innerWidth * 0.2;
  mobileDrop.y = 118;
  mobileDrop.vx = 0;
  mobileDrop.vy = 0;
  mobileDrop.pressing = false;
  mobileDrop.dropping = false;
  mobileActivePointerId = null;
  launched = false;
  renderMobileDropBall();
}

function syncMobileHud() {
  if (!mobileWaterEl || !mobilePointsEl || !mobileLevelEl) return;

  const safeScore = getSafeScore();
  const level = getLevelFromScore();
  let levelStart = 0;
  let levelEnd = LEVEL_2_POINTS;

  if (level === 2) {
    levelStart = LEVEL_2_POINTS;
    levelEnd = LEVEL_3_POINTS;
  } else if (level === 3) {
    levelStart = LEVEL_3_POINTS;
    levelEnd = LEVEL_4_POINTS;
  } else if (level >= 4) {
    levelStart = LEVEL_4_POINTS;
    levelEnd = LEVEL_4_POINTS;
  }

  const levelSpan = Math.max(1, levelEnd - levelStart);
  const progress = level >= 4 ? 1 : Math.max(0, Math.min(1, (safeScore - levelStart) / levelSpan));
  const remaining = pointsToNextLevel();

  mobileWaterEl.textContent = String(waterCount);
  mobilePointsEl.textContent = String(safeScore);
  mobileLevelEl.textContent = String(level);

  if (mobileNextLevelTextEl) {
    mobileNextLevelTextEl.textContent = remaining === 0
      ? 'Max level reached'
      : `${remaining} points to next level`;
  }

  if (mobileNextLevelFillEl) {
    mobileNextLevelFillEl.style.width = `${progress * 100}%`;
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
    { x: 150,  y: 60,  rx: 58, ry: 30 },
    { x: 350,  y: 80,  rx: 70, ry: 35 },
    { x: 470,  y: 105, rx: 52, ry: 26 },
    { x: 620,  y: 55,  rx: 55, ry: 28 },
    { x: 760,  y: 72,  rx: 60, ry: 31 },
    { x: 900,  y: 90,  rx: 75, ry: 38 },
    { x: 1020, y: 52,  rx: 50, ry: 25 },
    { x: 1150, y: 65,  rx: 60, ry: 32 },
    { x: 1280, y: 95,  rx: 66, ry: 34 },
    { x: 1420, y: 58,  rx: 54, ry: 27 },
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

function drawRoundedRect(x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
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

function getPipeLayout() {
  const wallX = PLAT_X + PLAT_W + SIDE_WALL_GAP;
  const wallRight = wallX + SIDE_WALL_W;
  const rightEdge = canvas.width - WALL_W;
  const baseColors = ['#77A8BB', '#FFC907', '#BF6C46', '#69DC69'];
  const colors = [...baseColors, ...baseColors];
  const totalPipeW = colors.length * PIPE_W;
  const evenGap = (rightEdge - wallRight - totalPipeW) / (colors.length + 1);
  const startX = wallRight + evenGap;

  return { colors, startX, evenGap, wallRight, rightEdge };
}

function getBouncePads() {
  const layout = getPipeLayout();
  const pads = [];
  const y = gY() - PIPE_H;
  const h = PIPE_H + PIPE_BURY_DEPTH;
  const w = Math.max(16, layout.evenGap - 10);

  // Side gaps: left of first pipe and right of last pipe.
  const leftGapX = layout.wallRight;
  const rightGapX = layout.startX + (layout.colors.length - 1) * (PIPE_W + layout.evenGap) + PIPE_W;
  pads.push({ x: leftGapX + (layout.evenGap - w) / 2, y, w, h });
  pads.push({ x: rightGapX + (layout.evenGap - w) / 2, y, w, h });

  for (let i = 0; i < layout.colors.length - 1; i++) {
    const gapX = layout.startX + i * (PIPE_W + layout.evenGap) + PIPE_W;
    pads.push({ x: gapX + (layout.evenGap - w) / 2, y, w, h });
  }

  return pads;
}

function getPipeReward(color) {
  if (color === '#77A8BB') return 0;
  if (color === '#FFC907') return 5;
  if (color === '#BF6C46') return unlockedLevel >= 3 ? -5 : -3;
  if (color === '#69DC69') return 3;
  return 0;
}

function applyPipeOutcome(color) {
  setScore(score + getPipeReward(color));
  if (color === '#77A8BB') {
    waterCount += 5;
  }
  updateUnlockedLevel();
  while (score >= nextWaterBonusAt) {
    waterCount += 1;
    nextWaterBonusAt += 10;
  }
}

function getBumpers() {
  if (unlockedLevel < 2) return [];

  const layout = getPipeLayout();
  const topY = gY() - PIPE_H;
  const bumpers = [];
  const minPadding = 8;
  const fieldLeft = layout.startX;
  const fieldRight = layout.startX + (layout.colors.length - 1) * (PIPE_W + layout.evenGap) + PIPE_W;
  const fieldW = fieldRight - fieldLeft;
  const pipeCenters = layout.colors.map((_, i) => (
    layout.startX + i * (PIPE_W + layout.evenGap) + PIPE_W / 2
  ));
  const gapCenters = layout.colors.slice(0, -1).map((_, i) => (
    layout.startX + i * (PIPE_W + layout.evenGap) + PIPE_W + layout.evenGap / 2
  ));

  function canPlace(x, y, r) {
    return bumpers.every((b) => Math.hypot(x - b.x, y - b.y) > r + b.r + minPadding);
  }

  function tryAdd(x, y, r) {
    if (y - r < 8) return;
    if (x - r < fieldLeft - 16 || x + r > fieldRight + 16) return;
    if (canPlace(x, y, r)) {
      bumpers.push({ x, y, r });
    }
  }

  // Plinko-like triangular grid: fewer pegs, intentional stagger.
  const rowDefs = [
    { count: 7, yOffset: 500, shift: 0.00 },
    { count: 6, yOffset: 430, shift: 0.50 },
    { count: 7, yOffset: 355, shift: 0.00 },
    { count: 6, yOffset: 280, shift: 0.50 },
    { count: 7, yOffset: 220, shift: 0.00 },
  ];

  rowDefs.forEach((row, rowIdx) => {
    const step = fieldW / row.count;
    for (let i = 0; i < row.count; i++) {
      // Trim two left-side pegs for a little more opening on that side.
      if ((rowIdx === 3 || rowIdx === 4) && i === 0) continue;
      const baseX = fieldLeft + step * (i + 0.5 + row.shift);
      const jitterX = ((i + rowIdx) % 2 === 0 ? -1 : 1) * 6;
      const jitterY = ((i * 7 + rowIdx * 3) % 3) * 10;
      const r = BUMPER_R;
      tryAdd(baseX + jitterX, topY - row.yOffset - jitterY, r);
    }
  });

  // Gap blockers near the bottom prevent dead-center drops between pipes.
  gapCenters.forEach((gx, i) => {
    if (i % 2 !== 0) return;
    tryAdd(gx, topY - 118 - (i % 2) * 10, BUMPER_R);
  });

  // Pipe-center guides create a final funnel into each pipe opening.
  pipeCenters.forEach((cx, i) => {
    if (i % 2 !== 0) return;
    const side = i % 2 === 0 ? -1 : 1;
    tryAdd(cx + side * 22, topY - 168 - (i % 3) * 8, BUMPER_R);
  });

  // Subtle side guides to keep long bounces in bounds.
  tryAdd(fieldLeft - 6, topY - 300, BUMPER_R);
  tryAdd(fieldRight + 6, topY - 300, BUMPER_R);

  return bumpers;
}

function drawPipes() {
  const layout = getPipeLayout();
  const baseY = gY();
  const colors = layout.colors;

  colors.forEach((color, i) => {
    const x = layout.startX + i * (PIPE_W + layout.evenGap);
    const h = PIPE_H;
    const totalH = h + PIPE_BURY_DEPTH;
    const y = baseY - h;

    // Pipe body
    ctx.fillStyle = color;
    drawRoundedRect(x, y, PIPE_W, totalH, 14);
    ctx.fill();

    // Top lip
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    drawRoundedRect(x + 4, y + 4, PIPE_W - 8, 10, 5);
    ctx.fill();

    // Right-side shading
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    drawRoundedRect(x + PIPE_W - 9, y + 4, 6, totalH - 8, 3);
    ctx.fill();

    if (color === '#77A8BB') {
      ctx.save();
      ctx.fillStyle = '#173d4d';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Extra Water', x + PIPE_W / 2, y + h / 2);
      ctx.restore();
    } else if (color === '#FFC907') {
      ctx.save();
      ctx.fillStyle = '#5a4200';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (unlockedLevel >= 3) {
        ctx.fillText('+5', x + PIPE_W / 2, y + h / 2 - 10);
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.fillText('+1 water', x + PIPE_W / 2, y + h / 2 + 11);
      } else {
        ctx.fillText('+5', x + PIPE_W / 2, y + h / 2);
      }
      ctx.restore();
    } else if (color === '#BF6C46') {
      ctx.save();
      ctx.fillStyle = '#4f2512';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unlockedLevel >= 3 ? '-5' : '-3', x + PIPE_W / 2, y + h / 2);
      ctx.restore();
    } else if (color === '#69DC69') {
      ctx.save();
      ctx.fillStyle = '#1f5d1f';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (unlockedLevel >= 3) {
        ctx.fillText('+3', x + PIPE_W / 2, y + h / 2 - 10);
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.fillText('+1 water', x + PIPE_W / 2, y + h / 2 + 11);
      } else {
        ctx.fillText('+3', x + PIPE_W / 2, y + h / 2);
      }
      ctx.restore();
    }
  });
}

function drawBumpers() {
  const bumpers = getBumpers();

  bumpers.forEach(({ x, y, r }) => {
    const g = ctx.createRadialGradient(x - r * 0.28, y - r * 0.32, r * 0.3, x, y, r);
    g.addColorStop(0, '#d9d9d9');
    g.addColorStop(0.65, '#8e8e8e');
    g.addColorStop(1, '#5f5f5f');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r - 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.22, r * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.26)';
    ctx.fill();
  });
}

function drawBouncePads() {
  const pads = getBouncePads();

  pads.forEach((pad) => {
    ctx.fillStyle = '#6f4cb6';
    drawRoundedRect(pad.x, pad.y, pad.w, pad.h, 6);
    ctx.fill();

    ctx.fillStyle = '#b695f2';
    drawRoundedRect(pad.x + 3, pad.y + 3, pad.w - 6, 5, 3);
    ctx.fill();
  });
}

function drawLevelProgressBar() {
  const safeScore = getSafeScore();
  const maxProgressPoints = LEVEL_4_POINTS;
  const progress = Math.min(1, safeScore / maxProgressPoints);
  const barW = Math.min(680, canvas.width - 120);
  const barH = 24;
  const barX = canvas.width / 2 - barW / 2;
  const barY = 20;
  const fillW = barW * progress;
  const markers = [
    { level: 1, points: 0 },
    { level: 2, points: LEVEL_2_POINTS },
    { level: 3, points: LEVEL_3_POINTS },
    { level: 4, points: LEVEL_4_POINTS },
  ];

  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  drawRoundedRect(barX - 18, barY - 20, barW + 36, 74, 18);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  drawRoundedRect(barX, barY, barW, barH, 12);
  ctx.fill();

  ctx.fillStyle = '#6fd08c';
  drawRoundedRect(barX, barY, fillW, barH, 12);
  ctx.fill();

  markers.forEach((marker) => {
    const t = marker.points / maxProgressPoints;
    const x = barX + barW * t;
    const unlocked = unlockedLevel >= marker.level;

    ctx.beginPath();
    ctx.arc(x, barY + barH / 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = unlocked ? '#fff3bf' : '#c7d2dc';
    ctx.fill();

    ctx.fillStyle = unlocked ? '#143022' : '#314352';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(marker.level), x, barY + barH / 2 + 0.5);

    if (marker.level > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(String(marker.points), x, barY + barH + 10);
    }
  });

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Level Progress', canvas.width / 2, barY - 16);

  ctx.restore();
}

function drawHud() {
  const level = getLevelFromScore();
  const next = pointsToNextLevel();
  const safeScore = getSafeScore();

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(16, 16, 300, 142);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText(`Points: ${safeScore}`, 28, 24);

  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText(`Level ${level} / 4`, 28, 64);

  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  if (level < 4) {
    ctx.fillText(`${next} pts to Level ${level + 1}`, 28, 96);
  } else {
    ctx.fillText('Max level reached!', 28, 96);
  }

  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillStyle = '#9de8ff';
  ctx.fillText(`Water: ${waterCount}`, 28, 120);
  ctx.restore();
}

function drawLevelNotice() {
  if (!levelNoticeText || performance.now() > levelNoticeUntilMs) return;

  const boxW = 280;
  const boxH = 56;
  const boxX = canvas.width / 2 - boxW / 2;
  const boxY = 88;

  ctx.save();
  ctx.fillStyle = 'rgba(22, 78, 38, 0.88)';
  drawRoundedRect(boxX, boxY, boxW, boxH, 14);
  ctx.fill();

  ctx.fillStyle = '#dfffe7';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(levelNoticeText, canvas.width / 2, boxY + boxH / 2 + 1);
  ctx.restore();
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
      const radius = 5.6 + t * 18.4;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255, ${0.2 + t * 0.45})`;
      ctx.fill();

      if (i === dots) {
        ctx.save();
        ctx.fillStyle = 'rgba(20, 40, 60, 0.9)';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(waterCount), x, y + 1);
        ctx.restore();
      }
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

  if (canImage.complete && canImage.naturalWidth > 0) {
    const inset = 2;
    const imgR = BIRD_R - inset;
    const maxBox = imgR * 2 * 0.82;
    const scale = Math.min(maxBox / canImage.naturalWidth, maxBox / canImage.naturalHeight);
    const drawW = canImage.naturalWidth * scale;
    const drawH = canImage.naturalHeight * scale;
    const imageAngle = dragging ? -Math.PI / 4 : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(imageAngle);
    ctx.beginPath();
    ctx.arc(0, 0, imgR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(canImage, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(x, y, BIRD_R, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
}

function drawHint() {
  if (!showHint || launched || gameOver) return;
  ctx.save();
  ctx.font        = 'bold 15px Arial, sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur  = 5;
  ctx.fillText('Drag the Jerrycan to launch!', bx, by - BIRD_R - 18);
  ctx.restore();
}

function drawGameOver() {
  if (!gameOver) return;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('Out of water', canvas.width / 2, canvas.height / 2 + 28);

  const btnW = 220;
  const btnH = 56;
  const btnX = canvas.width / 2 - btnW / 2;
  const btnY = canvas.height / 2 + 70;
  restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

  ctx.fillStyle = '#2f7fc3';
  drawRoundedRect(btnX, btnY, btnW, btnH, 12);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  drawRoundedRect(btnX + 4, btnY + 4, btnW - 8, 12, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('Restart', canvas.width / 2, btnY + btnH / 2 + 1);
  ctx.restore();
}

function shouldShowResetBallButton() {
  return launched && !gameOver && !scoredThisShot && shotStartedAtMs > 0 && performance.now() - shotStartedAtMs >= RESET_BALL_BTN_DELAY_MS;
}

function drawResetBallButton() {
  if (!shouldShowResetBallButton()) {
    resetBallBtn.visible = false;
    return;
  }

  const btnW = 120;
  const btnH = 34;
  const btnX = SLING_X - btnW / 2;
  const btnY = Math.min(gY() - btnH - 8, platTop() + 34);
  resetBallBtn = { x: btnX, y: btnY, w: btnW, h: btnH, visible: true };

  ctx.save();
  ctx.fillStyle = 'rgba(22, 35, 56, 0.88)';
  drawRoundedRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  drawRoundedRect(btnX + 3, btnY + 3, btnW - 6, 8, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Reset Ball', btnX + btnW / 2, btnY + btnH / 2 + 1);
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
  const top = -RIGHT_BARRIER_OVERFLOW;
  const bottom = canvas.height + RIGHT_BARRIER_OVERFLOW;

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

function handleBumperCollisions() {
  const bumpers = getBumpers();

  bumpers.forEach(({ x, y, r }) => {
    const dx = bx - x;
    const dy = by - y;
    const minDist = BIRD_R + r;
    const distSq = dx * dx + dy * dy;

    if (distSq >= minDist * minDist) return;

    const dist = Math.sqrt(distSq);
    let nx = 0;
    let ny = -1;
    let penetration = minDist;

    if (dist > 0.0001) {
      nx = dx / dist;
      ny = dy / dist;
      penetration = minDist - dist;
    }

    bx += nx * penetration;
    by += ny * penetration;

    const vn = bvx * nx + bvy * ny;
    if (vn < 0) {
      const restitution = 0.78;
      bvx -= (1 + restitution) * vn * nx;
      bvy -= (1 + restitution) * vn * ny;

      // Small outward pop so bumper hits feel lively.
      const pop = 0.55;
      bvx += nx * pop;
      bvy += ny * pop;
    }
  });
}

function handleBouncePadCollisions() {
  const pads = getBouncePads();

  pads.forEach((pad) => {
    const closestX = Math.max(pad.x, Math.min(bx, pad.x + pad.w));
    const closestY = Math.max(pad.y, Math.min(by, pad.y + pad.h));
    const dx = bx - closestX;
    const dy = by - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq > BIRD_R * BIRD_R) return;

    const comingDown = bvy > 0;
    const nearTop = by < pad.y + pad.h * 0.8;

    if (comingDown && nearTop) {
      const padCenterX = pad.x + pad.w / 2;
      const hitOffset = (bx - padCenterX) / Math.max(1, pad.w / 2);
      by = pad.y - BIRD_R;
      bvy = -Math.max(5.8, Math.abs(bvy) * 0.78);
      bvx += hitOffset * 2.4;
    } else {
      const push = Math.sqrt(distSq) > 0.001 ? BIRD_R - Math.sqrt(distSq) : 1;
      bx += (dx >= 0 ? 1 : -1) * push;
      bvx *= -0.7;
      bvy *= 0.92;
    }
  });
}

function handlePipeWallCollisions() {
  const layout = getPipeLayout();
  const pipeTop = gY() - PIPE_H;
  const pipeBottom = gY() + PIPE_BURY_DEPTH;

  for (let i = 0; i < layout.colors.length; i++) {
    if (i === lockedPipeIndex) continue;

    const x = layout.startX + i * (PIPE_W + layout.evenGap);
    const leftWall = x;
    const rightWall = x + PIPE_W;

    if (by < pipeTop + BIRD_R * 0.7 || by > pipeBottom) continue;

    const overlapsLeftWall = bx < leftWall && bx + BIRD_R > leftWall;
    const overlapsRightWall = bx > rightWall && bx - BIRD_R < rightWall;

    if (overlapsLeftWall) {
      bx = leftWall - BIRD_R;
      if (bvx > 0) bvx *= -0.45;
    } else if (overlapsRightWall) {
      bx = rightWall + BIRD_R;
      if (bvx < 0) bvx *= -0.45;
    }
  }
}

function handlePipeContainmentCollisions() {
  const layout = getPipeLayout();
  const pipeTop = gY() - PIPE_H;

  if (lockedPipeIndex < 0) {
    for (let i = 0; i < layout.colors.length; i++) {
      const x = layout.startX + i * (PIPE_W + layout.evenGap);
      const insideX = bx >= x + BIRD_R && bx <= x + PIPE_W - BIRD_R;
      const enteredDepth = by >= pipeTop + BIRD_R * 0.9;
      if (insideX && enteredDepth) {
        lockedPipeIndex = i;
        break;
      }
    }
  }

  if (lockedPipeIndex < 0) return;

  const px = layout.startX + lockedPipeIndex * (PIPE_W + layout.evenGap);
  const leftBound = px + BIRD_R;
  const rightBound = px + PIPE_W - BIRD_R;
  const topBound = pipeTop + BIRD_R;

  // Keep the ball inside selected pipe once it has dropped in.
  if (bx < leftBound) {
    bx = leftBound;
    if (bvx < 0) bvx *= -0.45;
  } else if (bx > rightBound) {
    bx = rightBound;
    if (bvx > 0) bvx *= -0.45;
  }

  if (by < topBound) {
    by = topBound;
    if (bvy < 0) bvy *= -0.35;
  }

  // Damp horizontal motion once captured so it settles in-pipe.
  bvx *= 0.94;
}

function handlePipeScoring() {
  if (!launched || scoredThisShot) return;

  const layout = getPipeLayout();
  const pipeTop = gY() - PIPE_H;
  const pipeBottom = gY();

  if (by + BIRD_R < pipeTop || by - BIRD_R > pipeBottom) return;

  for (let i = 0; i < layout.colors.length; i++) {
    const x = layout.startX + i * (PIPE_W + layout.evenGap);
    const insidePipe = bx >= x + 6 && bx <= x + PIPE_W - 6;
    if (!insidePipe) continue;

    const color = layout.colors[i];
    applyPipeOutcome(color);
    scoredThisShot = true;
    lockedPipeIndex = i;
    scheduleReset(650);
    break;
  }
}

function updateGameOverState() {
  if (gameOver) return;
  if (!launched && !mobileDrop.dropping && waterCount <= 0) {
    gameOver = true;
    showHint = false;
  }
}

function updateMobileDropPhysics() {
  if (!isMobileViewport()) return;
  if (!mobileDrop.dropping || gameOver) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  mobileDrop.vy += MOBILE_GRAVITY;
  mobileDrop.x += mobileDrop.vx;
  mobileDrop.y += mobileDrop.vy;

  if (mobileDrop.x - MOBILE_BALL_R < 0) {
    mobileDrop.x = MOBILE_BALL_R;
    mobileDrop.vx *= -MOBILE_BALL_RESTITUTION;
  } else if (mobileDrop.x + MOBILE_BALL_R > w) {
    mobileDrop.x = w - MOBILE_BALL_R;
    mobileDrop.vx *= -MOBILE_BALL_RESTITUTION;
  }

  const bumpers = getMobileBumpers();
  bumpers.forEach((b) => {
    const dx = mobileDrop.x - b.x;
    const dy = mobileDrop.y - b.y;
    const minDist = MOBILE_BALL_R + b.r;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) return;

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = minDist - dist;

    mobileDrop.x += nx * penetration;
    mobileDrop.y += ny * penetration;

    const vn = mobileDrop.vx * nx + mobileDrop.vy * ny;
    if (vn < 0) {
      mobileDrop.vx -= (1 + 0.78) * vn * nx;
      mobileDrop.vy -= (1 + 0.78) * vn * ny;
      mobileDrop.vx += nx * 0.4;
      mobileDrop.vy += ny * 0.4;
    }
  });

  const pipes = getMobilePipeRects();
  const topY = pipes[0].y;
  const insidePipe = pipes.find((p) => (
    mobileDrop.x >= p.x + MOBILE_BALL_R * 0.55 &&
    mobileDrop.x <= p.x + p.w - MOBILE_BALL_R * 0.55 &&
    mobileDrop.y + MOBILE_BALL_R >= p.y
  ));

  if (insidePipe) {
    mobileDrop.dropping = false;
    applyPipeOutcome(insidePipe.color);
    scoredThisShot = true;
    setTimeout(resetMobileDropBall, 550);
    return;
  }

  if (mobileDrop.y + MOBILE_BALL_R >= topY) {
    mobileDrop.y = topY - MOBILE_BALL_R;
    mobileDrop.vy *= -0.45;
    mobileDrop.vx *= 0.85;
  }

  if (mobileDrop.y - MOBILE_BALL_R > h + 100 || Math.abs(mobileDrop.vy) < 0.08 && mobileDrop.y + MOBILE_BALL_R >= topY - 1) {
    mobileDrop.dropping = false;
    setTimeout(resetMobileDropBall, 400);
  }
}

// --- Physics ---
function update() {
  updateGameOverState();
  if (isMobileViewport()) return;
  if (!launched || gameOver) return;

  trail.push({ x: bx, y: by });
  if (trail.length > 35) trail.shift();

  bvy += GRAVITY;
  bx  += bvx;
  by  += bvy;

  handlePlatformCollision();
  handleSideWallCollision();
  handleRightBarrierCollision();
  handleBumperCollisions();
  handleBouncePadCollisions();
  handlePipeWallCollisions();
  handlePipeContainmentCollisions();
  handlePipeScoring();

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
  updateMobileDropPhysics();
  syncMobileHud();
  renderMobileDropBall();

  const viewportW = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
  if (viewportW < 800) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(loop);
    return;
  }

  if (mobileDropBallEl) {
    mobileDropBallEl.style.transform = 'translate(-120px, -120px)';
  }

  drawSky();
  drawClouds();
  drawLevelProgressBar();
  drawHud();
  drawLevelNotice();
  drawGround();
  drawPlatform();
  drawSideWall();
  drawBouncePads();
  drawBumpers();
  drawSlingshot();
  drawBandSegment('left');   // behind bird
  drawDragAim();
  drawTrail();
  drawBird(bx, by);
  drawPipes();
  drawBandSegment('right');  // in front of bird
  drawResetBallButton();
  drawHint();
  drawGameOver();
  requestAnimationFrame(loop);
}
syncMobileHud();
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
  const p = getXY(e);

  if (gameOver) {
    const insideRestart = (
      p.x >= restartBtn.x &&
      p.x <= restartBtn.x + restartBtn.w &&
      p.y >= restartBtn.y &&
      p.y <= restartBtn.y + restartBtn.h
    );
    if (insideRestart) {
      restartGame();
    }
    return;
  }

  if (resetBallBtn.visible) {
    const insideResetBall = (
      p.x >= resetBallBtn.x &&
      p.x <= resetBallBtn.x + resetBallBtn.w &&
      p.y >= resetBallBtn.y &&
      p.y <= resetBallBtn.y + resetBallBtn.h
    );
    if (insideResetBall) {
      resetBird();
      return;
    }
  }

  if (launched || waterCount <= 0) return;

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
  if (!dragging || gameOver || waterCount <= 0) return;
  dragging = false;
  aimX = bx;
  aimY = by;
  const r = restPos();
  bvx = (r.x - bx) * POWER;
  bvy = (r.y - by) * POWER;
  waterCount = Math.max(0, waterCount - 1);
  shotStartedAtMs = performance.now();
  launched = true;
  trail    = [];
}

function getPointerXY(e) {
  return { x: e.clientX, y: e.clientY };
}

function onMobilePointerDown(e) {
  if (!isMobileViewport()) return;
  if (gameOver || waterCount <= 0) return;
  if (mobileDrop.pressing) return;
  if (e.cancelable) e.preventDefault();

  const p = getPointerXY(e);
  const { minY, maxY } = getMobileHoldYBounds();
  mobileDrop.x = Math.max(MOBILE_BALL_R, Math.min(window.innerWidth - MOBILE_BALL_R, p.x));
  mobileDrop.y = Math.max(minY, Math.min(maxY, p.y));
  mobileDrop.vx = 0;
  mobileDrop.vy = 0;
  mobileDrop.pressing = true;
  mobileDrop.dropping = false;
  mobileActivePointerId = e.pointerId;
  scoredThisShot = false;
  showHint = false;
  launched = false;
  renderMobileDropBall();
}

function onMobilePointerMove(e) {
  if (!isMobileViewport()) return;
  if (!mobileDrop.pressing || gameOver) return;
  if (mobileActivePointerId !== null && e.pointerId !== mobileActivePointerId) return;
  if (e.cancelable) e.preventDefault();

  const p = getPointerXY(e);
  const { minY, maxY } = getMobileHoldYBounds();
  mobileDrop.x = Math.max(MOBILE_BALL_R, Math.min(window.innerWidth - MOBILE_BALL_R, p.x));
  mobileDrop.y = Math.max(minY, Math.min(maxY, p.y));
  renderMobileDropBall();
}

function onMobilePointerUp(e) {
  if (!isMobileViewport()) return;
  if (!mobileDrop.pressing || gameOver || waterCount <= 0) return;
  if (mobileActivePointerId !== null && e.pointerId !== mobileActivePointerId) return;
  if (e.cancelable) e.preventDefault();

  mobileDrop.pressing = false;
  mobileDrop.dropping = true;
  mobileActivePointerId = null;
  mobileDrop.vx = 0;
  mobileDrop.vy = 0;
  waterCount = Math.max(0, waterCount - 1);
  shotStartedAtMs = performance.now();
  launched = true;
}

function onMobilePointerCancel(e) {
  if (!isMobileViewport()) return;
  if (!mobileDrop.pressing) return;
  if (mobileActivePointerId !== null && e.pointerId !== mobileActivePointerId) return;

  // Cancellation should not count as a release/drop.
  mobileDrop.pressing = false;
  mobileDrop.dropping = false;
  mobileDrop.vx = 0;
  mobileDrop.vy = 0;
  mobileActivePointerId = null;
}

canvas.addEventListener('mousedown',  onDown);
canvas.addEventListener('mousemove',  onMove);
canvas.addEventListener('mouseup',    onUp);
canvas.addEventListener('touchstart', onDown, { passive: true });
canvas.addEventListener('touchmove',  onMove, { passive: false });
canvas.addEventListener('touchend',   onUp);

window.addEventListener('pointerdown', onMobilePointerDown, { passive: false });
window.addEventListener('pointermove', onMobilePointerMove, { passive: false });
window.addEventListener('pointerup', onMobilePointerUp, { passive: false });
window.addEventListener('pointercancel', onMobilePointerCancel, { passive: false });
