const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const mobileWaterEl = document.getElementById('mobileWaterCount');
const mobilePointsEl = document.getElementById('mobilePointCount');
const mobileLevelEl = document.getElementById('mobileLevelCount');
const mobileNextLevelTextEl = document.getElementById('mobileNextLevelText');
const mobileNextLevelFillEl = document.getElementById('mobileNextLevelFill');
const mobileDropBallEl = document.getElementById('mobileDropBall');
const mobileDragHintEl = document.getElementById('mobileDragHint');
const mobileModifierBadgeEl = document.getElementById('mobileModifierBadge');
const mobileWaterBadgeEl = document.getElementById('mobileWaterBadge');
const mobileTrailEl = document.getElementById('mobileTrail');
const mobileMegaBouncyEl = document.getElementById('mobileMegaBouncy');
const mobileBumpersEl = document.getElementById('mobileBumpers');
const mobileResetBallBtnEl = document.getElementById('mobileResetBallBtn');
const levelOverlayEl = document.getElementById('levelOverlay');
const mobilePipeLabelEls = [
  document.getElementById('mobilePipe1Label'),
  document.getElementById('mobilePipe2Label'),
  document.getElementById('mobilePipe3Label'),
  document.getElementById('mobilePipe4Label'),
];
const globalResetBtnEl = document.getElementById('globalResetBtn');
const startMenuEl = document.getElementById('startMenu');
const startMenuPlayBtnEl = document.getElementById('startMenuPlayBtn');

const MOBILE_BREAKPOINT = 800;
const MOBILE_BALL_R = 24;
const MOBILE_GRAVITY = 0.35;
const MOBILE_BALL_RESTITUTION = 0.58;
const MOBILE_PIPE_LEFT_PCTS = [5, 31, 57, 83];
const MOBILE_PIPE_WIDTH_PCT = 18;
const MOBILE_PIPE_X_OFFSET_PX = -18;
const MOBILE_BUMPER_X_OFFSET_PX = 22;
const MOBILE_PIPE_BOTTOM_PX = -10;
const MOBILE_PIPE_HEIGHT_VH = 22;
const MOBILE_PIPE_ENTRY_DEPTH_PX = 14;
const MOBILE_AIM_MIN_Y = 130;
const MOBILE_AIM_BOTTOM_ZONE_PX = 700;
const MOBILE_TOP_BOUNCY_SQUARE_TOP = 0;
const MOBILE_MEGA_BOUNCY_R = 44;
const MOBILE_MEGA_BOUNCY_COUNT = 3;
const MOBILE_MEGA_BOUNCY_MOBILE_COUNT = 2;
const MOBILE_MEGA_BOUNCY_RESTITUTION = 1.0;
const MOBILE_MEGA_BOUNCY_POP = 3.0;
const MOBILE_MEGA_BOUNCY_UPWARD_BOOST = 2.3;
const MOBILE_TOP_SQUARE_SIDE_PUSH_SCALE = 0.014;
const MOBILE_TOP_SQUARE_VX_DAMPING = 0.78;
const MOBILE_TOP_SQUARE_MIN_DOWN_VY = 2.0;
const MOBILE_TOP_SQUARE_DOWNWARD_BOOST = 2.8;
const MOBILE_MEGA_BOUNCY_X_MIN_PCT = 12;
const MOBILE_MEGA_BOUNCY_X_MAX_PCT = 88;
const MOBILE_MEGA_BOUNCY_Y_MIN_PCT = 34;
const MOBILE_MEGA_BOUNCY_Y_MAX_PCT = 58;
const MOBILE_BUMPER_R = 22;
const MOBILE_BUMPERS_BASE = [
  { xPct: 5,  yPct: 44 },
  { xPct: 14, yPct: 37 },
  { xPct: 31, yPct: 29 },
  { xPct: 47, yPct: 35 },
  { xPct: 73, yPct: 41 },
  { xPct: 24, yPct: 51 },
  { xPct: 56, yPct: 55 },
  { xPct: 81, yPct: 48 },
  { xPct: 30, yPct: 63 },
  { xPct: 49, yPct: 60 },
  { xPct: 77, yPct: 64 },
  { xPct: 92, yPct: 52 },
];
let mobileBumperLayout = MOBILE_BUMPERS_BASE.map((b) => ({ ...b }));
let mobileMegaBouncyPositions = [
  { xPct: 34, yPct: 46 },
  { xPct: 50, yPct: 46 },
];
let desktopBumperLayout = [];
const MOBILE_PIPE_COLORS = ['#77A8BB', '#FFC907', '#BF6C46', '#69DC69'];
let mobilePipeOrder = [...MOBILE_PIPE_COLORS];
const DESKTOP_PIPE_BASE_COLORS = ['#77A8BB', '#FFC907', '#BF6C46', '#69DC69'];
let desktopPipeOrder = [...DESKTOP_PIPE_BASE_COLORS];

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => {
  resize();
  resetBird();
  resetMobileDropBall();
  renderMobileBumpers();
  renderMobileMegaBouncy();
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
const MOBILE_RESET_BTN_DELAY_MS = 4000;
const RESET_BALL_BTN_DELAY_MS = 6000;
const LEVEL_2_POINTS = 12;
const LEVEL_3_POINTS = 24;
const LEVEL_4_POINTS = 36;
const LEVEL_NOTICE_DURATION_MS = 8000;
const MOBILE_LEVEL3_BUMPER_REDUCTION = 2;
const DESKTOP_MEGA_BOUNCY_R = 44;

const canImage = new Image();
canImage.src = 'can.jpg';

const charityWaterImage = new Image();
charityWaterImage.src = 'CharityWaterJpg.jpg';

// --- Layout helpers (recalculate on resize) ---
function gY()      { return canvas.height - GROUND_H; }
function platTop() { return gY() - PLAT_H; }
function forkL()   { return { x: SLING_X - FORK_SPREAD, y: platTop() - FORK_H }; }
function forkR()   { return { x: SLING_X + FORK_SPREAD, y: platTop() - FORK_H }; }
function restPos() { return { x: SLING_X, y: platTop() - FORK_H + 5 }; }
function sideWallH() {
  const launchedLongEnough = launched &&
    wallGrowthStartedAtMs > 0 &&
    performance.now() - wallGrowthStartedAtMs >= 500;
  return SIDE_WALL_H * (launchedLongEnough ? 3 : 1);
}

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
let nextWaterBonusAt = 8;
let unlockedLevel = 1;
let gameOver = false;
let gameStarted = false;
let restartBtn = { x: 0, y: 0, w: 0, h: 0 };
let finishBtn = { x: 0, y: 0, w: 0, h: 0 };
let finishSummaryBtn = { x: 0, y: 0, w: 0, h: 0 };
let liveEndGameBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };
let finishSummaryActive = false;
let finishSummaryPeopleHelped = 0;
let resetBallBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };
let shotStartedAtMs = 0;
let wallGrowthStartedAtMs = 0;
let activeBumperModifier = 0;
let rustedDesktopHitIndices = new Set();
let rustedMobileHitIndices = new Set();
let levelNoticeText = '';
let levelNoticeUntilMs = 0;
let desktopMegaBouncyPositions = [
  { xT: 0.34, yT: 0.45 },
  { xT: 0.5, yT: 0.45 },
  { xT: 0.66, yT: 0.45 },
];
let mobileHasDroppedOnce = false;
let mobileDrop = {
  x: -120,
  y: -120,
  vx: 0,
  vy: 0,
  pressing: false,
  dropping: false,
  inPipeIndex: -1,
};
let mobileActivePointerId = null;
let audioCtx = null;
let audioEnabled = false;
let lastBumperSfxAt = 0;
const confettiPieces = [];

function initAudio() {
  if (audioEnabled) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  audioEnabled = true;
}

function playTone(freq, duration, type, volume, slideTo = null) {
  if (!audioEnabled || !audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function playSfx(name) {
  if (!audioEnabled) return;

  if (name === 'launch') {
    playTone(220, 0.1, 'triangle', 0.04, 420);
    return;
  }
  if (name === 'score') {
    playTone(520, 0.09, 'square', 0.03, 760);
    playTone(760, 0.08, 'triangle', 0.025, 920);
    return;
  }
  if (name === 'penalty') {
    playTone(300, 0.12, 'sawtooth', 0.03, 180);
    return;
  }
  if (name === 'levelUp') {
    playTone(460, 0.09, 'triangle', 0.03, 620);
    playTone(620, 0.11, 'triangle', 0.03, 980);
    return;
  }
  if (name === 'bump') {
    playTone(240, 0.05, 'sine', 0.02, 210);
    return;
  }
  if (name === 'gameOver') {
    playTone(280, 0.16, 'sawtooth', 0.032, 140);
    return;
  }
  if (name === 'mission') {
    playTone(520, 0.1, 'triangle', 0.03, 700);
    playTone(700, 0.1, 'triangle', 0.03, 980);
    playTone(980, 0.12, 'triangle', 0.032, 1260);
  }
}

function playPipeSfx(color, adjustedReward) {
  if (!audioEnabled) return;

  if (color === '#77A8BB') {
    // Blue pipe: watery shimmer for extra water.
    playTone(430, 0.09, 'sine', 0.026, 540);
    playTone(540, 0.12, 'triangle', 0.024, 700);
    return;
  }

  if (color === '#FFC907') {
    // Yellow pipe: bright, high-value ring.
    playTone(560, 0.08, 'square', 0.03, 780);
    playTone(780, 0.1, 'triangle', 0.026, 980);
    return;
  }

  if (color === '#69DC69') {
    // Green pipe: quick positive pop.
    playTone(500, 0.07, 'triangle', 0.024, 620);
    playTone(620, 0.08, 'sine', 0.02, 760);
    return;
  }

  if (color === '#BF6C46') {
    // Brown pipe: dull negative thunk.
    playTone(280, 0.13, 'sawtooth', 0.03, 170);
    return;
  }

  if (adjustedReward > 0) {
    playSfx('score');
  } else if (adjustedReward < 0) {
    playSfx('penalty');
  }
}

function maybePlayBumpSfx() {
  const now = performance.now();
  if (now - lastBumperSfxAt < 90) return;
  lastBumperSfxAt = now;
  playSfx('bump');
}

function spawnConfettiBurst(x, y, count, colors) {
  const defaultColors = ['#77A8BB', '#69DC69', '#FFC907', '#BF6C46', '#ffffff'];
  const palette = colors || defaultColors;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 8;
    confettiPieces.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 9 + Math.random() * 11,
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 160 + Math.random() * 90,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.35,
    });
  }
}

function startMissionConfetti() {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.42;
  for (let burst = 0; burst < 5; burst++) {
    const ox = (Math.random() - 0.5) * 220;
    const oy = (Math.random() - 0.5) * 80;
    spawnConfettiBurst(cx + ox, cy + oy, 34);
  }
}

function updateConfetti() {
  for (let i = confettiPieces.length - 1; i >= 0; i--) {
    const p = confettiPieces[i];
    p.vy += 0.12;
    p.vx *= 0.994;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    p.life -= 1;

    if (p.life <= 0 || p.y > canvas.height + 30) {
      confettiPieces.splice(i, 1);
    }
  }
}

function drawConfetti() {
  if (!confettiPieces.length) return;

  ctx.save();
  confettiPieces.forEach((p) => {
    const alpha = Math.max(0, Math.min(1, p.life / 160));
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  });
  ctx.restore();
}

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

function isRustedBumperIndex(index) {
  return unlockedLevel >= 4 && index % 6 === 2;
}

function isGoldenBumperIndex(index) {
  return unlockedLevel >= 4 && !isRustedBumperIndex(index) && index % 4 === 0;
}

function getLevelInstruction(level) {
  if (level === 2) {
    return 'Rocky bumpers unlocked! Bank shots to guide the can into better pipes.';
  }
  if (level === 3) {
    return 'Mega bouncy orbs unlocked. Use them to redirect the ball into high-value pipes.';
  }
  if (level === 4) {
    return 'Congratulations! You reached the final level! Rusted bumpers give -1, and filtering blue bumpers give +3! Try to get a high score and share it with your friends! You can also end the game, if you wish.';
  }
  return `Stage ${level}: Keep scoring to unlock the next stage.`;
}

function showLevelNotice(level) {
  levelNoticeText = `Level ${level} Reached!\n${getLevelInstruction(level)}`;
  levelNoticeUntilMs = performance.now() + LEVEL_NOTICE_DURATION_MS;
  playSfx('levelUp');
}

function setScore(nextScore) {
  const previousLevel = unlockedLevel;
  score = Math.max(0, nextScore);
  const nextLevel = getLevelForPoints(score);
  unlockedLevel = Math.max(unlockedLevel, nextLevel);
  if (nextLevel > previousLevel) {
    showLevelNotice(nextLevel);
  }
  if (previousLevel < 4 && unlockedLevel >= 4) {
    randomizeMobileMegaBouncy();
    randomizeDesktopMegaBouncy();
  }
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
    showLevelNotice(unlockedLevel);
  }
}

function startGame() {
  initAudio();
  gameStarted = true;
  if (startMenuEl) startMenuEl.classList.add('hidden');
}

function finishToStartMenu() {
  restartGame();
  gameStarted = false;
  if (startMenuEl) startMenuEl.classList.remove('hidden');
}

function showFinishSummary() {
  playSfx('mission');
  startMissionConfetti();
  finishSummaryPeopleHelped = getSafeScore();
  finishSummaryActive = true;
}

function triggerEndGame() {
  gameOver = true;
  showHint = false;
  showFinishSummary();
}

function restartGame() {
  score = 0;
  waterCount = 10;
  nextWaterBonusAt = 8;
  unlockedLevel = 1;
  gameOver = false;
  mobileHasDroppedOnce = false;
  finishSummaryActive = false;
  finishSummaryPeopleHelped = 0;
  levelNoticeText = '';
  levelNoticeUntilMs = 0;
  mobilePipeOrder = [...MOBILE_PIPE_COLORS];
  syncMobilePipeLabels();
  desktopPipeOrder = [...DESKTOP_PIPE_BASE_COLORS];
  desktopMegaBouncyPositions = [
    { xT: 0.34, yT: 0.45 },
    { xT: 0.5, yT: 0.45 },
    { xT: 0.66, yT: 0.45 },
  ];
  desktopBumperLayout = [];
  showHint = true;
  finishBtn = { x: 0, y: 0, w: 0, h: 0 };
  finishSummaryBtn = { x: 0, y: 0, w: 0, h: 0 };
  liveEndGameBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };
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
  wallGrowthStartedAtMs = 0;
  activeBumperModifier = 0;
  rustedDesktopHitIndices.clear();
  rustedMobileHitIndices.clear();
  resetBallBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };
  aimX = bx;
  aimY = by;
}
resetBird();
resetMobileDropBall();
renderMobileBumpers();
renderMobileMegaBouncy();
syncMobilePipeLabels();

function scheduleReset(ms) {
  if (!pending) {
    pending = true;
    setTimeout(resetBird, ms);
  }
}

function isMobileViewport() {
  return Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth) <= MOBILE_BREAKPOINT;
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
      color: mobilePipeOrder[i],
    };
  });
}

function getMobilePipeLabelText(color) {
  if (color === '#77A8BB') return 'Extra Water';
  if (color === '#FFC907') return '+5';
  if (color === '#BF6C46') {
    if (unlockedLevel >= 4) return '-8';
    if (unlockedLevel >= 3) return '-5';
    return '-3';
  }
  if (color === '#69DC69') return '+3';
  return '';
}

function getMobilePipeLabelColor(color) {
  if (color === '#77A8BB') return '#f3fbff';
  if (color === '#FFC907') return '#472e00';
  if (color === '#BF6C46') return '#fff0e8';
  if (color === '#69DC69') return '#0f4f1b';
  return '#ffffff';
}

function syncMobilePipeLabels() {
  mobilePipeLabelEls.forEach((labelEl, i) => {
    if (!labelEl) return;
    const color = mobilePipeOrder[i] || MOBILE_PIPE_COLORS[i];
    labelEl.textContent = getMobilePipeLabelText(color);
    labelEl.style.left = `calc(${MOBILE_PIPE_LEFT_PCTS[i]}% + ${MOBILE_PIPE_X_OFFSET_PX}px)`;
    labelEl.style.background = color;
    labelEl.style.color = getMobilePipeLabelColor(color);
  });
}

function randomizeMobilePipeOrder() {
  const next = [...mobilePipeOrder];
  const original = mobilePipeOrder.join('|');

  for (let attempt = 0; attempt < 6; attempt++) {
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (next.join('|') !== original) break;
  }

  mobilePipeOrder = next;
  syncMobilePipeLabels();
}

function randomizeDesktopPipeOrder() {
  const next = [...desktopPipeOrder];
  const original = desktopPipeOrder.join('|');

  for (let attempt = 0; attempt < 6; attempt++) {
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (next.join('|') !== original) break;
  }

  desktopPipeOrder = next;
}

function getMobileBumpers() {
  if (unlockedLevel < 2) return [];

  const w = window.innerWidth;
  const h = window.innerHeight;
  return getActiveMobileBumperLayout().map((b, i) => ({
    x: (b.xPct / 100) * w + MOBILE_BUMPER_X_OFFSET_PX,
    y: (b.yPct / 100) * h,
    r: MOBILE_BUMPER_R,
    rusted: isRustedBumperIndex(i),
    golden: isGoldenBumperIndex(i),
  }));
}

function getActiveMobileBumperLayout() {
  let layout = mobileBumperLayout;
  if (window.innerWidth < 400 || window.innerHeight < 400) {
    layout = layout.slice(0, Math.max(0, layout.length - 4));
  }
  if (unlockedLevel < 3) return layout;
  return layout.slice(0, Math.max(0, layout.length - MOBILE_LEVEL3_BUMPER_REDUCTION));
}

function getMobileMegaBouncies() {
  if (unlockedLevel < 3) return [];

  return mobileMegaBouncyPositions.map((p) => ({
    x: (p.xPct / 100) * window.innerWidth,
    y: (p.yPct / 100) * window.innerHeight,
    r: MOBILE_MEGA_BOUNCY_R,
  }));
}

function renderMobileMegaBouncy() {
  if (!mobileMegaBouncyEl) return;
  const orbs = mobileMegaBouncyEl.querySelectorAll('.mobileMegaBouncyOrb');
  orbs.forEach((orb, i) => {
    const pos = mobileMegaBouncyPositions[i] || mobileMegaBouncyPositions[mobileMegaBouncyPositions.length - 1];
    if (!pos) return;
    orb.style.left = `${pos.xPct}%`;
    orb.style.top = `${pos.yPct}%`;
  });
}

function randomizeMobileMegaBouncy() {
  const minCenterDistancePx = MOBILE_MEGA_BOUNCY_R * 2 + 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  function isClear(candidate, placed) {
    const cx = (candidate.xPct / 100) * vw;
    const cy = (candidate.yPct / 100) * vh;
    return placed.every((other) => {
      const ox = (other.xPct / 100) * vw;
      const oy = (other.yPct / 100) * vh;
      return Math.hypot(cx - ox, cy - oy) >= minCenterDistancePx;
    });
  }

  for (let layoutTry = 0; layoutTry < 80; layoutTry++) {
    const next = [];
    let failed = false;

    for (let i = 0; i < MOBILE_MEGA_BOUNCY_MOBILE_COUNT; i++) {
      let placed = false;
      for (let tries = 0; tries < 200; tries++) {
        const candidate = {
          xPct: Math.round((MOBILE_MEGA_BOUNCY_X_MIN_PCT + Math.random() * (MOBILE_MEGA_BOUNCY_X_MAX_PCT - MOBILE_MEGA_BOUNCY_X_MIN_PCT)) * 10) / 10,
          yPct: Math.round((MOBILE_MEGA_BOUNCY_Y_MIN_PCT + Math.random() * (MOBILE_MEGA_BOUNCY_Y_MAX_PCT - MOBILE_MEGA_BOUNCY_Y_MIN_PCT)) * 10) / 10,
        };
        if (!isClear(candidate, next)) continue;
        next.push(candidate);
        placed = true;
        break;
      }

      if (!placed) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      mobileMegaBouncyPositions = next;
      if (unlockedLevel >= 4) {
        randomizeMobileBumpers();
      } else {
        resolveMobileBumperMegaCollisions();
      }
      renderMobileMegaBouncy();
      return;
    }
  }

  if (unlockedLevel >= 4) {
    randomizeMobileBumpers();
  } else {
    resolveMobileBumperMegaCollisions();
  }
  renderMobileMegaBouncy();
}

function resolveMobileBumperMegaCollisions() {
  if (unlockedLevel < 2) return;

  const megas = getMobileMegaBouncies();
  if (!megas.length) return;

  const minDistPct = 13;
  const minXPct = 5;
  const maxXPct = 92;
  const minYPct = 28;
  const maxYPct = 66;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  mobileBumperLayout = mobileBumperLayout.map((current, i, arr) => {
    const currentXPx = (current.xPct / 100) * vw + MOBILE_BUMPER_X_OFFSET_PX;
    const currentYPx = (current.yPct / 100) * vh;
    const overlapsMega = megas.some((mega) => Math.hypot(currentXPx - mega.x, currentYPx - mega.y) < mega.r + MOBILE_BUMPER_R + 6);
    if (!overlapsMega) return current;

    for (let tries = 0; tries < 120; tries++) {
      const t = Math.random();
      const edgeBias = Math.random() < 0.6 ? (t < 0.5 ? t * t : 1 - (1 - t) * (1 - t)) : t;
      const xPct = Math.round((minXPct + edgeBias * (maxXPct - minXPct)) * 10) / 10;
      const yPct = Math.round((minYPct + Math.random() * (maxYPct - minYPct)) * 10) / 10;
      const xPx = (xPct / 100) * vw + MOBILE_BUMPER_X_OFFSET_PX;
      const yPx = (yPct / 100) * vh;
      const collidesMega = megas.some((mega) => Math.hypot(xPx - mega.x, yPx - mega.y) < mega.r + MOBILE_BUMPER_R + 6);
      if (collidesMega) continue;

      const tooClose = arr.some((other, idx) => {
        if (idx === i) return false;
        return Math.hypot(xPct - other.xPct, yPct - other.yPct) < minDistPct;
      });
      if (tooClose) continue;

      return { xPct, yPct };
    }

    return current;
  });

  renderMobileBumpers();
}

function getMobileTopBouncySquare() {
  const size = window.innerWidth;
  return {
    x: 0,
    y: MOBILE_TOP_BOUNCY_SQUARE_TOP - size,
    w: size,
    h: size,
  };
}

function renderMobileBumpers() {
  if (!mobileBumpersEl) return;

  const layers = [];
  getActiveMobileBumperLayout().forEach((b, i) => {
    const rusted = isRustedBumperIndex(i);
    const golden = isGoldenBumperIndex(i);
    const inner = rusted ? '#b98567' : (golden ? '#d9fbff' : '#d9d9d9');
    const mid = rusted ? '#7b4f36' : (golden ? '#64d4e4' : '#8e8e8e');
    const outer = rusted ? '#4a2d1d' : (golden ? '#1f7da0' : '#5f5f5f');
    layers.push(
      `radial-gradient(circle at calc(${b.xPct}% + ${MOBILE_BUMPER_X_OFFSET_PX}px) ${b.yPct}%, ${inner} 0 12px, ${mid} 13px 19px, ${outer} 20px 22px, transparent 23px)`,
      `radial-gradient(circle at calc(${b.xPct}% + ${MOBILE_BUMPER_X_OFFSET_PX - 6}px) calc(${b.yPct}% - 6px), rgba(255, 255, 255, 0.26) 0 5px, transparent 6px)`,
    );
  });
  mobileBumpersEl.style.background = layers.join(',\n      ');
}

function randomizeMobileBumpers() {
  const count = MOBILE_BUMPERS_BASE.length;
  const columns = 4;
  const rows = Math.ceil(count / columns);
  const minXPct = 5;
  const maxXPct = 92;
  const minYPct = 28;
  const maxYPct = 66;
  const bucketW = (maxXPct - minXPct) / columns;
  const bucketH = (maxYPct - minYPct) / rows;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const megas = getMobileMegaBouncies();
  const minCenterDistancePx = MOBILE_BUMPER_R * 2 + 10;
  const minMegaDistancePx = MOBILE_BUMPER_R + MOBILE_MEGA_BOUNCY_R + 8;

  function toPx(point) {
    return {
      x: (point.xPct / 100) * vw + MOBILE_BUMPER_X_OFFSET_PX,
      y: (point.yPct / 100) * vh,
    };
  }

  function isClear(candidate, placed) {
    const current = toPx(candidate);
    const clearBumpers = placed.every((other) => {
      const compare = toPx(other);
      return Math.hypot(current.x - compare.x, current.y - compare.y) >= minCenterDistancePx;
    });
    const clearMegas = megas.every((mega) => Math.hypot(current.x - mega.x, current.y - mega.y) >= minMegaDistancePx);
    return clearBumpers && clearMegas;
  }

  for (let layoutTry = 0; layoutTry < 100; layoutTry++) {
    const next = [];
    let failed = false;

    const buckets = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        buckets.push({ col, row });
      }
    }
    for (let i = buckets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [buckets[i], buckets[j]] = [buckets[j], buckets[i]];
    }

    for (let i = 0; i < count; i++) {
      let placed = false;
      const bucket = buckets[i];
      for (let tries = 0; tries < 80; tries++) {
        const candidate = {
          xPct: Math.round((minXPct + (bucket.col + 0.2 + Math.random() * 0.6) * bucketW) * 10) / 10,
          yPct: Math.round((minYPct + (bucket.row + 0.2 + Math.random() * 0.6) * bucketH) * 10) / 10,
        };
        if (!isClear(candidate, next)) continue;
        next.push(candidate);
        placed = true;
        break;
      }

      if (!placed) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      mobileBumperLayout = next;
      renderMobileBumpers();
      return;
    }
  }

  renderMobileBumpers();
}

function getMobileBouncePads() {
  const pipes = getMobilePipeRects();
  const pads = [];
  const y = pipes[0].y;
  const h = pipes[0].h;

  for (let i = 0; i < pipes.length - 1; i++) {
    const gapLeft = pipes[i].x + pipes[i].w;
    const gapRight = pipes[i + 1].x;
    const gapW = Math.max(0, gapRight - gapLeft);
    const w = Math.max(14, gapW - 8);
    const x = gapLeft + (gapW - w) / 2;
    pads.push({ x, y, w, h });
  }

  return pads;
}

function renderMobileDropBall() {
  if (!mobileDropBallEl) return;
  mobileDropBallEl.style.transform = `translate(${mobileDrop.x - MOBILE_BALL_R}px, ${mobileDrop.y - MOBILE_BALL_R}px)`;

  if (mobileDragHintEl) {
    const hintX = mobileDrop.x + MOBILE_BALL_R + 10;
    const hintY = mobileDrop.y - 10;
    const shouldShowHint = isMobileViewport() && gameStarted && !gameOver && !mobileDrop.dropping && !mobileHasDroppedOnce;
    mobileDragHintEl.style.transform = `translate(${hintX}px, ${hintY}px)`;
    mobileDragHintEl.style.opacity = shouldShowHint ? '1' : '0';
  }

  if (activeBumperModifier < 0) {
    mobileDropBallEl.style.background = '#d8b08f';
    mobileDropBallEl.style.boxShadow = '0 0 0 2px rgba(123, 79, 54, 0.6), 0 10px 20px rgba(74, 45, 29, 0.28)';
  } else if (activeBumperModifier > 0) {
    mobileDropBallEl.style.background = '#d7fbff';
    mobileDropBallEl.style.boxShadow = '0 0 0 2px rgba(31, 125, 160, 0.55), 0 10px 20px rgba(31, 125, 160, 0.24)';
  } else {
    mobileDropBallEl.style.background = '#ffffff';
    mobileDropBallEl.style.boxShadow = '';
  }
  const img = mobileDropBallEl.querySelector('img');
  if (img) {
    if (activeBumperModifier < 0) {
      img.style.filter = 'sepia(0.95) saturate(1.55) hue-rotate(-12deg) brightness(0.86)';
    } else if (activeBumperModifier > 0) {
      img.style.filter = 'saturate(1.35) hue-rotate(12deg) brightness(1.08)';
    } else {
      img.style.filter = 'none';
    }
  }

  if (mobileModifierBadgeEl) {
    if (unlockedLevel >= 4 && activeBumperModifier < 0) {
      mobileModifierBadgeEl.textContent = '-1';
      mobileModifierBadgeEl.style.opacity = '1';
      mobileModifierBadgeEl.style.background = 'rgba(112, 68, 44, 0.9)';
      mobileModifierBadgeEl.style.color = '#ffe7d5';
    } else if (unlockedLevel >= 4 && activeBumperModifier > 0) {
      mobileModifierBadgeEl.textContent = '+3';
      mobileModifierBadgeEl.style.opacity = '1';
      mobileModifierBadgeEl.style.background = 'rgba(20, 111, 145, 0.9)';
      mobileModifierBadgeEl.style.color = '#e7fcff';
    } else {
      mobileModifierBadgeEl.textContent = '';
      mobileModifierBadgeEl.style.opacity = '0';
    }
  }

  if (mobileWaterBadgeEl) {
    mobileWaterBadgeEl.textContent = String(Math.max(0, waterCount));
  }
}

function renderMobileTrail() {
  if (!mobileTrailEl) return;

  if (!isMobileViewport() || !mobileDrop.dropping || trail.length === 0) {
    mobileTrailEl.innerHTML = '';
    return;
  }

  const dots = trail.map((p, i) => {
    const t = (i + 1) / trail.length;
    const size = 2 + t * 12;
    const opacity = t * 0.45;
    return `<div class="mobileTrailDot" style="left:${p.x}px;top:${p.y}px;width:${size}px;height:${size}px;opacity:${opacity};"></div>`;
  });
  mobileTrailEl.innerHTML = dots.join('');
}

function syncLevelOverlay() {
  if (!levelOverlayEl) return;
  const isActive = !!levelNoticeText && performance.now() <= levelNoticeUntilMs;

  if (!isActive) {
    levelOverlayEl.classList.remove('visible');
    levelOverlayEl.textContent = '';
    return;
  }

  levelOverlayEl.textContent = levelNoticeText;
  levelOverlayEl.classList.add('visible');
}

function resetMobileDropBall() {
  mobileDrop.x = window.innerWidth * 0.5;
  mobileDrop.y = 160;
  mobileDrop.vx = 0;
  mobileDrop.vy = 0;
  mobileDrop.pressing = false;
  mobileDrop.dropping = false;
  mobileDrop.inPipeIndex = -1;
  mobileActivePointerId = null;
  shotStartedAtMs = 0;
  wallGrowthStartedAtMs = 0;
  activeBumperModifier = 0;
  rustedDesktopHitIndices.clear();
  rustedMobileHitIndices.clear();
  launched = false;
  trail = [];
  renderMobileTrail();
  renderMobileDropBall();
}

function shouldShowMobileResetButton() {
  return isMobileViewport() &&
    !gameOver &&
    mobileDrop.dropping &&
    mobileDrop.inPipeIndex < 0 &&
    shotStartedAtMs > 0 &&
    performance.now() - shotStartedAtMs >= MOBILE_RESET_BTN_DELAY_MS;
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
    if (gameOver && waterCount <= 0) {
      mobileNextLevelTextEl.textContent = `Game over: You helped ${safeScore} people. In support of charity: water, each person helped represents progress toward clean, safe drinking water for communities in need. This mission is the foundation this game was built on.`;
    } else {
      mobileNextLevelTextEl.textContent = remaining === 0
        ? 'Max level reached'
        : `${remaining} people to next level`;
    }
  }

  if (mobileNextLevelFillEl) {
    mobileNextLevelFillEl.style.width = `${progress * 100}%`;
  }

  if (mobileBumpersEl) {
    mobileBumpersEl.style.display = isMobileViewport() && level >= 2 ? 'block' : 'none';
  }

  if (mobileMegaBouncyEl) {

  const mobileEndGameBtnEl = document.getElementById('mobileEndGameBtn');
  if (mobileEndGameBtnEl) {
    mobileEndGameBtnEl.style.display = (isMobileViewport() && unlockedLevel >= 4 && !gameOver) ? 'inline-flex' : 'none';
  }

  const desktopEndGameBtnEl = document.getElementById('desktopEndGameBtn');
  if (desktopEndGameBtnEl) {
    desktopEndGameBtnEl.style.display = (!isMobileViewport() && unlockedLevel >= 4 && !gameOver) ? 'block' : 'none';
  }
    mobileMegaBouncyEl.style.display = isMobileViewport() && level >= 3 ? 'block' : 'none';
  }

  syncMobilePipeLabels();

  if (mobileResetBallBtnEl) {
    mobileResetBallBtnEl.style.display = shouldShowMobileResetButton() ? 'inline-flex' : 'none';
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

  // Charity: water logo centered below the slingshot
  if (charityWaterImage.complete && charityWaterImage.naturalWidth > 0) {
    const maxW = 220;
    const maxH = PLAT_H * 0.75;
    const scale = Math.min(maxW / charityWaterImage.naturalWidth, maxH / charityWaterImage.naturalHeight);
    const drawW = charityWaterImage.naturalWidth * scale;
    const drawH = charityWaterImage.naturalHeight * scale;
    const logoX = SLING_X;
    const logoY = platTop() + (PLAT_H - drawH) / 2;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(charityWaterImage, logoX - drawW / 2, logoY, drawW, drawH);
    ctx.restore();
  }
}

function drawSideWall() {
  const x = PLAT_X + PLAT_W + SIDE_WALL_GAP;
  const h = sideWallH();
  const y = gY() - h;

  ctx.fillStyle = '#5c3a1a';
  ctx.fillRect(x, y, SIDE_WALL_W, h + GROUND_H);

  ctx.fillStyle = '#7a4a1f';
  ctx.fillRect(x, y, SIDE_WALL_W, 8);

  ctx.fillStyle = '#3f2611';
  ctx.fillRect(x + SIDE_WALL_W - 3, y, 3, h + GROUND_H);
}

function getPipeLayout() {
  const wallX = PLAT_X + PLAT_W + SIDE_WALL_GAP;
  const wallRight = wallX + SIDE_WALL_W;
  const rightEdge = canvas.width - WALL_W;
  const colors = [...desktopPipeOrder, ...desktopPipeOrder];
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

function getDesktopMegaBouncyBounds() {
  const layout = getPipeLayout();
  const topY = gY() - PIPE_H;
  const xMin = layout.startX + DESKTOP_MEGA_BOUNCY_R + 10;
  const xMax = layout.startX + (layout.colors.length - 1) * (PIPE_W + layout.evenGap) + PIPE_W - DESKTOP_MEGA_BOUNCY_R - 10;
  const yMin = Math.max(60, topY - 360);
  const yMax = Math.max(yMin + 12, topY - 90);
  return { xMin, xMax, yMin, yMax };
}

function getDesktopMegaBouncies() {
  if (unlockedLevel < 3) return [];
  const b = getDesktopMegaBouncyBounds();
  return desktopMegaBouncyPositions.map((p) => ({
    x: b.xMin + (b.xMax - b.xMin) * p.xT,
    y: b.yMin + (b.yMax - b.yMin) * p.yT,
    r: DESKTOP_MEGA_BOUNCY_R,
  }));
}

function randomizeDesktopMegaBouncy() {
  if (unlockedLevel < 3) return;
  const bounds = getDesktopMegaBouncyBounds();
  const minCenterDistancePx = DESKTOP_MEGA_BOUNCY_R * 2 + 8;

  function toPx(point) {
    return {
      x: bounds.xMin + (bounds.xMax - bounds.xMin) * point.xT,
      y: bounds.yMin + (bounds.yMax - bounds.yMin) * point.yT,
    };
  }

  function isClear(candidate, placed) {
    const current = toPx(candidate);
    return placed.every((other) => {
      const compare = toPx(other);
      return Math.hypot(current.x - compare.x, current.y - compare.y) >= minCenterDistancePx;
    });
  }

  for (let layoutTry = 0; layoutTry < 80; layoutTry++) {
    const next = [];
    let failed = false;

    for (let i = 0; i < MOBILE_MEGA_BOUNCY_COUNT; i++) {
      let placed = false;
      for (let tries = 0; tries < 200; tries++) {
        const candidate = { xT: Math.random(), yT: Math.random() };
        if (!isClear(candidate, next)) continue;
        next.push(candidate);
        placed = true;
        break;
      }

      if (!placed) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      desktopMegaBouncyPositions = next;
      if (unlockedLevel >= 4) {
        randomizeDesktopBumpers();
      }
      return;
    }
  }
}

function getDesktopBumperBounds() {
  const layout = getPipeLayout();
  const topY = gY() - PIPE_H;
  const xMin = layout.startX + BUMPER_R;
  const xMax = layout.startX + (layout.colors.length - 1) * (PIPE_W + layout.evenGap) + PIPE_W - BUMPER_R;
  const yMin = Math.max(48, topY - 520);
  const yMax = Math.max(yMin + 20, topY - 110);
  return { xMin, xMax, yMin, yMax };
}

function buildDefaultDesktopBumpers() {
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
  const megas = getDesktopMegaBouncies();

  function canPlace(x, y, r) {
    const clearBumpers = bumpers.every((b) => Math.hypot(x - b.x, y - b.y) > r + b.r + minPadding);
    const clearMega = megas.every((mega) => Math.hypot(x - mega.x, y - mega.y) > r + mega.r + minPadding);
    return clearBumpers && clearMega;
  }

  function tryAdd(x, y, r) {
    if (y - r < 8) return;
    if (x - r < fieldLeft - 16 || x + r > fieldRight + 16) return;
    if (canPlace(x, y, r)) {
      bumpers.push({ x, y, r });
    }
  }

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
      if ((rowIdx === 3 || rowIdx === 4) && i === 0) continue;
      const baseX = fieldLeft + step * (i + 0.5 + row.shift);
      const jitterX = ((i + rowIdx) % 2 === 0 ? -1 : 1) * 6;
      const jitterY = ((i * 7 + rowIdx * 3) % 3) * 10;
      tryAdd(baseX + jitterX, topY - row.yOffset - jitterY, BUMPER_R);
    }
  });

  gapCenters.forEach((gx, i) => {
    if (i % 2 !== 0) return;
    tryAdd(gx, topY - 118 - (i % 2) * 10, BUMPER_R);
  });

  pipeCenters.forEach((cx, i) => {
    if (i % 2 !== 0) return;
    const side = i % 2 === 0 ? -1 : 1;
    tryAdd(cx + side * 22, topY - 168 - (i % 3) * 8, BUMPER_R);
  });

  tryAdd(fieldLeft - 6, topY - 300, BUMPER_R);
  tryAdd(fieldRight + 6, topY - 300, BUMPER_R);

  return bumpers;
}

function getDesktopBumperPositions() {
  if (unlockedLevel < 4 || desktopBumperLayout.length === 0) {
    return buildDefaultDesktopBumpers();
  }

  const bounds = getDesktopBumperBounds();
  return desktopBumperLayout.map((point) => ({
    x: bounds.xMin + (bounds.xMax - bounds.xMin) * point.xT,
    y: bounds.yMin + (bounds.yMax - bounds.yMin) * point.yT,
    r: BUMPER_R,
  }));
}

function randomizeDesktopBumpers() {
  if (unlockedLevel < 4) return;

  const bounds = getDesktopBumperBounds();
  const megas = getDesktopMegaBouncies();
  const count = buildDefaultDesktopBumpers().length;
  const columns = Math.max(6, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const minCenterDistancePx = BUMPER_R * 2 + 10;
  const minMegaDistancePx = BUMPER_R + DESKTOP_MEGA_BOUNCY_R + 10;

  function toPx(point) {
    return {
      x: bounds.xMin + (bounds.xMax - bounds.xMin) * point.xT,
      y: bounds.yMin + (bounds.yMax - bounds.yMin) * point.yT,
    };
  }

  function isClear(candidate, placed) {
    const current = toPx(candidate);
    const clearBumpers = placed.every((other) => {
      const compare = toPx(other);
      return Math.hypot(current.x - compare.x, current.y - compare.y) >= minCenterDistancePx;
    });
    const clearMegas = megas.every((mega) => Math.hypot(current.x - mega.x, current.y - mega.y) >= minMegaDistancePx);
    return clearBumpers && clearMegas;
  }

  for (let layoutTry = 0; layoutTry < 100; layoutTry++) {
    const next = [];
    let failed = false;

    const buckets = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        buckets.push({ col, row });
      }
    }
    for (let i = buckets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [buckets[i], buckets[j]] = [buckets[j], buckets[i]];
    }

    for (let i = 0; i < count; i++) {
      let placed = false;
      const bucket = buckets[i];
      for (let tries = 0; tries < 100; tries++) {
        const candidate = {
          xT: (bucket.col + 0.2 + Math.random() * 0.6) / columns,
          yT: (bucket.row + 0.2 + Math.random() * 0.6) / rows,
        };
        if (!isClear(candidate, next)) continue;
        next.push(candidate);
        placed = true;
        break;
      }

      if (!placed) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      desktopBumperLayout = next;
      return;
    }
  }

  desktopBumperLayout = [];
}

function getPipeReward(color) {
  if (color === '#77A8BB') return 0;
  if (color === '#FFC907') return 5;
  if (color === '#BF6C46') {
    if (unlockedLevel >= 4) return -8;
    if (unlockedLevel >= 3) return -5;
    return -3;
  }
  if (color === '#69DC69') return 3;
  return 0;
}

function spawnDomConfetti(x, y, count, colors) {
  const container = document.getElementById('confettiContainer');
  if (!container) return;
  const defaultColors = ['#77A8BB', '#69DC69', '#FFC907', '#ffffff', '#ff88d0', '#ffe066', '#a8f0c6'];
  const palette = colors || defaultColors;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confettiParticle';
    const angle = Math.random() * Math.PI * 2;
    const dist  = 100 + Math.random() * 220;
    const dx    = Math.cos(angle) * dist;
    const dy    = Math.sin(angle) * dist - 140;
    const dur   = 1400 + Math.random() * 900;
    const rot   = Math.random() * 800 - 400;
    const sx    = Math.random() < 0.5 ? -1 : 1;
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    el.style.background = palette[Math.floor(Math.random() * palette.length)];
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
    el.style.setProperty('--rot', `${rot}deg`);
    el.style.setProperty('--sx', `${sx}`);
    el.style.animationDuration = `${dur}ms`;
    container.appendChild(el);
    setTimeout(() => el.remove(), dur + 60);
  }
}

function triggerPipeConfetti(color, x, y) {
  if (color !== '#FFC907' && color !== '#69DC69') return;
  const isGold = color === '#FFC907';
  const palette = isGold
    ? ['#FFD700', '#FFC107', '#FFB300', '#FFEC6E', '#FFF4B2', '#E6AC00', '#ffffff']
    : null;
  if (isMobileViewport()) {
    spawnDomConfetti(x, y, 48, palette);
  } else {
    spawnConfettiBurst(x, y, 48, palette);
  }
}

function applyPipeOutcome(color, confettiX, confettiY) {
  const reward = getPipeReward(color);
  const adjustedReward = reward + activeBumperModifier;
  playPipeSfx(color, adjustedReward);

  setScore(score + adjustedReward);
  if (color === '#77A8BB') {
    waterCount += 5;
  } else if ((color === '#FFC907' || color === '#69DC69') && unlockedLevel >= 2) {
    randomizeMobileBumpers();
  }
  updateUnlockedLevel();
  if (reward > 0) {
    if (unlockedLevel >= 3) {
      randomizeMobileMegaBouncy();
      randomizeDesktopMegaBouncy();
    }
  }
  while (score >= nextWaterBonusAt) {
    waterCount += 1;
    nextWaterBonusAt += 8;
  }

  if (confettiX !== undefined && confettiY !== undefined) {
    triggerPipeConfetti(color, confettiX, confettiY);
  }

  activeBumperModifier = 0;
}

function getBumpers() {
  if (unlockedLevel < 2) return [];
  const bumpers = getDesktopBumperPositions();

  return bumpers.map((b, i) => ({
    ...b,
    rusted: isRustedBumperIndex(i),
    golden: isGoldenBumperIndex(i),
  }));
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
      if (unlockedLevel >= 4) {
        ctx.fillText('-8', x + PIPE_W / 2, y + h / 2);
      } else if (unlockedLevel >= 3) {
        ctx.fillText('-5', x + PIPE_W / 2, y + h / 2);
      } else {
        ctx.fillText('-3', x + PIPE_W / 2, y + h / 2);
      }
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

  bumpers.forEach(({ x, y, r, rusted, golden }) => {
    const g = ctx.createRadialGradient(x - r * 0.28, y - r * 0.32, r * 0.3, x, y, r);
    if (rusted) {
      g.addColorStop(0, '#b98567');
      g.addColorStop(0.65, '#7b4f36');
      g.addColorStop(1, '#4a2d1d');
    } else if (golden) {
      g.addColorStop(0, '#d9fbff');
      g.addColorStop(0.65, '#64d4e4');
      g.addColorStop(1, '#1f7da0');
    } else {
      g.addColorStop(0, '#d9d9d9');
      g.addColorStop(0.65, '#8e8e8e');
      g.addColorStop(1, '#5f5f5f');
    }

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

function drawDesktopMegaBouncy() {
  const megas = getDesktopMegaBouncies();
  if (!megas.length) return;

  megas.forEach((mega) => {
    const g = ctx.createRadialGradient(mega.x - mega.r * 0.34, mega.y - mega.r * 0.36, mega.r * 0.3, mega.x, mega.y, mega.r);
    g.addColorStop(0, '#d2b9ff');
    g.addColorStop(0.55, '#8b5dff');
    g.addColorStop(1, '#5f36cf');

    ctx.beginPath();
    ctx.arc(mega.x, mega.y, mega.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(mega.x, mega.y, mega.r - 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f4eaff';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('bouncy', mega.x, mega.y + 1);
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

  ctx.fillStyle = '#516BFF';
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
  ctx.fillText(`People helped: ${safeScore}`, 28, 24);

  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText(`Level ${level} / 4`, 28, 64);

  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  if (level < 4) {
    ctx.fillText(`${next} people to Level ${level + 1}`, 28, 96);
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
    ctx.fillStyle = `rgba(81, 107, 255, ${t * 0.45})`;
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
  if (activeBumperModifier < 0) {
    ctx.fillStyle = '#e2c1a5';
  } else if (activeBumperModifier > 0) {
    ctx.fillStyle = '#d9fbff';
  } else {
    ctx.fillStyle = '#ffffff';
  }
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
    if (activeBumperModifier < 0) {
      ctx.fillStyle = 'rgba(125, 78, 46, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, imgR, 0, Math.PI * 2);
      ctx.fill();
    } else if (activeBumperModifier > 0) {
      ctx.fillStyle = 'rgba(100, 212, 228, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, imgR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (unlockedLevel >= 4 && activeBumperModifier !== 0) {
      const badgeW = 22;
      const badgeH = 12;
      const badgeX = -badgeW / 2;
      const badgeY = -imgR + 4;
      ctx.fillStyle = activeBumperModifier < 0 ? 'rgba(112, 68, 44, 0.92)' : 'rgba(20, 111, 145, 0.92)';
      drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();

      ctx.fillStyle = activeBumperModifier < 0 ? '#ffe7d5' : '#e7fcff';
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(activeBumperModifier < 0 ? '-1' : '+3', 0, badgeY + badgeH / 2 + 0.5);
    }
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(x, y, BIRD_R, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  if (activeBumperModifier < 0) {
    ctx.strokeStyle = 'rgba(123,79,54,0.92)';
  } else if (activeBumperModifier > 0) {
    ctx.strokeStyle = 'rgba(31,125,160,0.92)';
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  }
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

  if (finishSummaryActive) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText('Mission Complete', canvas.width / 2, canvas.height / 2 - 64);
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText(`People helped: ${finishSummaryPeopleHelped}`, canvas.width / 2, canvas.height / 2 - 18);
    ctx.fillText('In support of charity: water, clean water improves health and dignity.', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('It also helps children stay in school and communities build stable futures.', canvas.width / 2, canvas.height / 2 + 34);
    ctx.fillText('Thank you for playing and supporting clean water awareness.', canvas.width / 2, canvas.height / 2 + 58);

    const btnW = 260;
    const btnH = 56;
    const btnX = canvas.width / 2 - btnW / 2;
    const btnY = canvas.height / 2 + 120;
    finishSummaryBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = '#1f5d1f';
    drawRoundedRect(btnX, btnY, btnW, btnH, 12);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.24)';
    drawRoundedRect(btnX + 4, btnY + 4, btnW - 8, 12, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText('Back to Start', canvas.width / 2, btnY + btnH / 2 + 1);
    ctx.restore();
    return;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('Out of water', canvas.width / 2, canvas.height / 2 + 28);
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText(`People helped: ${getSafeScore()}`, canvas.width / 2, canvas.height / 2 + 62);
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('In support of charity: water, clean water improves health and dignity.', canvas.width / 2, canvas.height / 2 + 90);
  ctx.fillText('It also helps children stay in school and communities build stable futures.', canvas.width / 2, canvas.height / 2 + 114);
  ctx.fillText('This mission is the foundation this game was built on.', canvas.width / 2, canvas.height / 2 + 138);

  const btnW = 220;
  const btnH = 56;
  const btnX = canvas.width / 2 - btnW / 2;
  const btnY = canvas.height / 2 + 176;
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

  finishBtn = { x: 0, y: 0, w: 0, h: 0 };
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

function drawLiveEndGameButton() {
  // replaced by #desktopEndGameBtn HTML button
  liveEndGameBtn.visible = false;
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
  const top = gY() - sideWallH();
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

  bumpers.forEach(({ x, y, r, rusted, golden }, i) => {
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
      maybePlayBumpSfx();
    }

    if (rusted) {
      activeBumperModifier = -1;
    }

    if (golden) {
      activeBumperModifier = 3;
    }
  });
}

function handleDesktopMegaBouncyCollision() {
  const megas = getDesktopMegaBouncies();
  if (!megas.length) return;

  let collided = false;
  megas.forEach((mega) => {
    const dx = bx - mega.x;
    const dy = by - mega.y;
    const minDist = BIRD_R + mega.r;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) return;
    collided = true;

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = minDist - dist;

    bx += nx * penetration;
    by += ny * penetration;

    const vn = bvx * nx + bvy * ny;
    if (vn < 0) {
      const restitution = 1.16;
      bvx -= (1 + restitution) * vn * nx;
      bvy -= (1 + restitution) * vn * ny;
      bvx += nx * 1.05;
      bvy += ny * 1.05;
      if (ny < -0.2) bvy -= 2.45;
    }
  });

  if (collided && launched && !scoredThisShot) {
    shotStartedAtMs = performance.now();
  }
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
    const pipeCX = layout.startX + i * (PIPE_W + layout.evenGap) + PIPE_W * 0.5;
    const pipeCY = gY() - PIPE_H * 0.5;
    applyPipeOutcome(color, pipeCX, pipeCY);
    randomizeDesktopPipeOrder();
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
    playSfx('gameOver');
  }
}

function updateMobileDropPhysics() {
  if (!isMobileViewport()) return;
  if (!mobileDrop.dropping || gameOver) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  trail.push({ x: mobileDrop.x, y: mobileDrop.y });
  if (trail.length > 35) trail.shift();

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

  const topSquare = getMobileTopBouncySquare();
  const closestX = Math.max(topSquare.x, Math.min(mobileDrop.x, topSquare.x + topSquare.w));
  const closestY = Math.max(topSquare.y, Math.min(mobileDrop.y, topSquare.y + topSquare.h));
  const sdx = mobileDrop.x - closestX;
  const sdy = mobileDrop.y - closestY;
  const sDistSq = sdx * sdx + sdy * sdy;

  if (sDistSq < MOBILE_BALL_R * MOBILE_BALL_R) {
    const dist = Math.sqrt(sDistSq);
    let nx = 0;
    let ny = -1;
    let penetration = MOBILE_BALL_R;

    if (dist > 0.0001) {
      nx = sdx / dist;
      ny = sdy / dist;
      penetration = MOBILE_BALL_R - dist;
    } else {
      const overlapLeft = Math.abs(mobileDrop.x - topSquare.x);
      const overlapRight = Math.abs(topSquare.x + topSquare.w - mobileDrop.x);
      const overlapTop = Math.abs(mobileDrop.y - topSquare.y);
      const overlapBottom = Math.abs(topSquare.y + topSquare.h - mobileDrop.y);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (minOverlap === overlapLeft) {
        nx = -1; ny = 0; penetration = MOBILE_BALL_R;
      } else if (minOverlap === overlapRight) {
        nx = 1; ny = 0; penetration = MOBILE_BALL_R;
      } else if (minOverlap === overlapTop) {
        nx = 0; ny = -1; penetration = MOBILE_BALL_R;
      } else {
        nx = 0; ny = 1; penetration = MOBILE_BALL_R;
      }
    }

    mobileDrop.x += nx * penetration;
    mobileDrop.y += ny * penetration;

    // Inverse bounce: this square always sends the ball downward.
    const minYBelowSquare = topSquare.y + topSquare.h + MOBILE_BALL_R;
    if (mobileDrop.y < minYBelowSquare) {
      mobileDrop.y = minYBelowSquare;
    }

    const squareCenterX = topSquare.x + topSquare.w * 0.5;
    const sidePush = (mobileDrop.x - squareCenterX) * MOBILE_TOP_SQUARE_SIDE_PUSH_SCALE;
    mobileDrop.vx = mobileDrop.vx * MOBILE_TOP_SQUARE_VX_DAMPING + sidePush;
    mobileDrop.vy = Math.max(Math.abs(mobileDrop.vy), MOBILE_TOP_SQUARE_MIN_DOWN_VY) + MOBILE_TOP_SQUARE_DOWNWARD_BOOST;
  }

  if (mobileDrop.inPipeIndex < 0) {
    const megas = getMobileMegaBouncies();
    megas.forEach((mega) => {
      const dx = mobileDrop.x - mega.x;
      const dy = mobileDrop.y - mega.y;
      const minDist = MOBILE_BALL_R + mega.r;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const nx = dx / dist;
        const ny = dy / dist;
        const penetration = minDist - dist;

        mobileDrop.x += nx * penetration;
        mobileDrop.y += ny * penetration;

        const vn = mobileDrop.vx * nx + mobileDrop.vy * ny;
        if (vn < 0) {
          const restitution = MOBILE_MEGA_BOUNCY_RESTITUTION;
          mobileDrop.vx -= (1 + restitution) * vn * nx;
          mobileDrop.vy -= (1 + restitution) * vn * ny;

          const pop = MOBILE_MEGA_BOUNCY_POP;
          mobileDrop.vx += nx * pop;
          mobileDrop.vy += ny * pop;

          if (ny < -0.2) {
            mobileDrop.vy -= MOBILE_MEGA_BOUNCY_UPWARD_BOOST;
          }
        }
      }
    });
  }

  const bumpers = getMobileBumpers();
  bumpers.forEach((b, i) => {
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
      maybePlayBumpSfx();
    }

    if (b.rusted) {
      activeBumperModifier = -1;
    }

    if (b.golden) {
      activeBumperModifier = 3;
    }
  });

  if (mobileDrop.inPipeIndex < 0) {
    const pads = getMobileBouncePads();
    pads.forEach((pad) => {
      const closestX = Math.max(pad.x, Math.min(mobileDrop.x, pad.x + pad.w));
      const closestY = Math.max(pad.y, Math.min(mobileDrop.y, pad.y + pad.h));
      const dx = mobileDrop.x - closestX;
      const dy = mobileDrop.y - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq > MOBILE_BALL_R * MOBILE_BALL_R) return;

      const comingDown = mobileDrop.vy > 0;
      const nearTop = mobileDrop.y < pad.y + pad.h * 0.8;

      if (comingDown && nearTop) {
        const padCenterX = pad.x + pad.w / 2;
        const hitOffset = (mobileDrop.x - padCenterX) / Math.max(1, pad.w / 2);
        mobileDrop.y = pad.y - MOBILE_BALL_R;
        mobileDrop.vy = -Math.max(4.8, Math.abs(mobileDrop.vy) * 0.76);
        mobileDrop.vx += hitOffset * 2.2;
      } else {
        const push = Math.sqrt(distSq) > 0.001 ? MOBILE_BALL_R - Math.sqrt(distSq) : 1;
        mobileDrop.x += (dx >= 0 ? 1 : -1) * push;
        mobileDrop.vx *= -0.68;
        mobileDrop.vy *= 0.9;
      }
    });
  }

  const pipes = getMobilePipeRects();
  const topY = pipes[0].y;
  const pipeAtTopIndex = pipes.findIndex((p) => (
    mobileDrop.x >= p.x + 6 &&
    mobileDrop.x <= p.x + p.w - 6
  ));
  const pipeAtTop = pipeAtTopIndex >= 0 ? pipes[pipeAtTopIndex] : null;

  if (mobileDrop.inPipeIndex < 0 &&
      mobileDrop.vy >= 0 &&
      mobileDrop.y + MOBILE_BALL_R >= topY + MOBILE_PIPE_ENTRY_DEPTH_PX &&
      pipeAtTop) {
    mobileDrop.inPipeIndex = pipeAtTopIndex;
    mobileDrop.x = Math.max(
      pipeAtTop.x + MOBILE_BALL_R,
      Math.min(pipeAtTop.x + pipeAtTop.w - MOBILE_BALL_R, mobileDrop.x),
    );

    if (!scoredThisShot) {
      applyPipeOutcome(pipeAtTop.color, mobileDrop.x, mobileDrop.y);
      randomizeMobilePipeOrder();
      scoredThisShot = true;
    }
  }

  if (mobileDrop.inPipeIndex >= 0) {
    const activePipe = pipes[mobileDrop.inPipeIndex];
    if (activePipe) {
      mobileDrop.x = Math.max(
        activePipe.x + MOBILE_BALL_R,
        Math.min(activePipe.x + activePipe.w - MOBILE_BALL_R, mobileDrop.x),
      );
      mobileDrop.vx *= 0.6;
    } else {
      mobileDrop.inPipeIndex = -1;
    }
  }

  if (mobileDrop.y - MOBILE_BALL_R > h + 100) {
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
  handleDesktopMegaBouncyCollision();
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
  updateConfetti();
  syncMobileHud();
  renderMobileDropBall();
  renderMobileTrail();
  syncLevelOverlay();

  if (isMobileViewport()) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(loop);
    return;
  }

  if (mobileDropBallEl) {
    mobileDropBallEl.style.transform = 'translate(-120px, -120px)';
  }

  if (mobileDragHintEl) {
    mobileDragHintEl.style.transform = 'translate(-220px, -220px)';
    mobileDragHintEl.style.opacity = '0';
  }

  drawSky();
  drawClouds();
  drawHud();
  drawGround();
  drawPlatform();
  drawSideWall();
  drawBouncePads();
  drawDesktopMegaBouncy();
  drawBumpers();
  drawSlingshot();
  drawBandSegment('left');   // behind bird
  drawDragAim();
  drawTrail();
  drawBird(bx, by);
  drawPipes();
  drawLevelProgressBar();
  drawBandSegment('right');  // in front of bird
  drawConfetti();
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
  if (!gameStarted) return;
  if (isMobileViewport()) return;
  initAudio();
  const p = getXY(e);

  if (gameOver) {
    if (finishSummaryActive) {
      const insideFinishSummary = (
        p.x >= finishSummaryBtn.x &&
        p.x <= finishSummaryBtn.x + finishSummaryBtn.w &&
        p.y >= finishSummaryBtn.y &&
        p.y <= finishSummaryBtn.y + finishSummaryBtn.h
      );
      if (insideFinishSummary) {
        finishToStartMenu();
      }
      return;
    }

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

  if (liveEndGameBtn.visible) {
    const insideEndGame = (
      p.x >= liveEndGameBtn.x &&
      p.x <= liveEndGameBtn.x + liveEndGameBtn.w &&
      p.y >= liveEndGameBtn.y &&
      p.y <= liveEndGameBtn.y + liveEndGameBtn.h
    );
    if (insideEndGame) {
      triggerEndGame();
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
  if (isMobileViewport()) return;
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
  if (isMobileViewport()) return;
  if (!dragging || gameOver || waterCount <= 0) return;
  dragging = false;
  aimX = bx;
  aimY = by;
  const r = restPos();
  bvx = (r.x - bx) * POWER;
  bvy = (r.y - by) * POWER;
  waterCount = Math.max(0, waterCount - 1);
  shotStartedAtMs = performance.now();
  wallGrowthStartedAtMs = shotStartedAtMs;
  launched = true;
  trail    = [];
  playSfx('launch');
}

function getPointerXY(e) {
  return { x: e.clientX, y: e.clientY };
}

function onMobilePointerDown(e) {
  if (!gameStarted) return;
  if (!isMobileViewport()) return;
  initAudio();
  if (gameOver || waterCount <= 0) return;
  if (mobileDrop.pressing || mobileDrop.dropping) return;
  if (e.cancelable) e.preventDefault();

  const p = getPointerXY(e);
  const pipes = getMobilePipeRects();
  const minY = MOBILE_AIM_MIN_Y;
  const maxY = Math.min(
    pipes[0].y - MOBILE_BALL_R - 8,
    window.innerHeight - MOBILE_AIM_BOTTOM_ZONE_PX,
  );
  mobileDrop.x = Math.max(MOBILE_BALL_R, Math.min(window.innerWidth - MOBILE_BALL_R, p.x));
  mobileDrop.y = Math.max(minY, Math.min(maxY, p.y));
  mobileDrop.vx = 0;
  mobileDrop.vy = 0;
  mobileDrop.inPipeIndex = -1;
  mobileDrop.pressing = true;
  mobileDrop.dropping = false;
  mobileActivePointerId = e.pointerId;
  scoredThisShot = false;
  showHint = false;
  launched = false;
  trail = [];
  renderMobileTrail();
  renderMobileDropBall();
}

function onMobilePointerMove(e) {
  if (!gameStarted) return;
  if (!isMobileViewport()) return;
  if (gameOver || mobileDrop.dropping) return;

  if (!mobileDrop.pressing) {
    if (e.pointerType !== 'mouse') return;
    const p = getPointerXY(e);
    const pipes = getMobilePipeRects();
    const minY = MOBILE_AIM_MIN_Y;
    const maxY = Math.min(
      pipes[0].y - MOBILE_BALL_R - 8,
      window.innerHeight - MOBILE_AIM_BOTTOM_ZONE_PX,
    );
    mobileDrop.x = Math.max(MOBILE_BALL_R, Math.min(window.innerWidth - MOBILE_BALL_R, p.x));
    mobileDrop.y = Math.max(minY, Math.min(maxY, p.y));
    renderMobileDropBall();
    return;
  }

  if (mobileActivePointerId !== null && e.pointerId !== mobileActivePointerId) return;
  if (e.cancelable) e.preventDefault();

  const p = getPointerXY(e);
  const pipes = getMobilePipeRects();
  const minY = MOBILE_AIM_MIN_Y;
  const maxY = Math.min(
    pipes[0].y - MOBILE_BALL_R - 8,
    window.innerHeight - MOBILE_AIM_BOTTOM_ZONE_PX,
  );
  mobileDrop.x = Math.max(MOBILE_BALL_R, Math.min(window.innerWidth - MOBILE_BALL_R, p.x));
  mobileDrop.y = Math.max(minY, Math.min(maxY, p.y));
  renderMobileDropBall();
}

const mobileEndGameBtnEl = document.getElementById('mobileEndGameBtn');
if (mobileEndGameBtnEl) {
  mobileEndGameBtnEl.addEventListener('click', () => {
    if (!isMobileViewport()) return;
    triggerEndGame();
  });
}

const desktopEndGameBtnEl = document.getElementById('desktopEndGameBtn');
if (desktopEndGameBtnEl) {
  desktopEndGameBtnEl.addEventListener('click', () => {
    if (isMobileViewport()) return;
    triggerEndGame();
  });
}

function onMobilePointerUp(e) {
  if (!gameStarted) return;
  if (!isMobileViewport()) return;
  if (!mobileDrop.pressing || gameOver || waterCount <= 0) return;
  if (mobileActivePointerId !== null && e.pointerId !== mobileActivePointerId) return;
  if (e.cancelable) e.preventDefault();

  mobileDrop.pressing = false;
  mobileDrop.dropping = true;
  mobileActivePointerId = null;
  mobileDrop.vx = 0;
  mobileDrop.vy = 0;
  mobileHasDroppedOnce = true;
  waterCount = Math.max(0, waterCount - 1);
  shotStartedAtMs = performance.now();
  wallGrowthStartedAtMs = shotStartedAtMs;
  launched = true;
  playSfx('launch');
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

if (mobileResetBallBtnEl) {
  mobileResetBallBtnEl.addEventListener('click', () => {
    if (!isMobileViewport()) return;

    // Reset cancels the current mobile shot, so refund that shot's water.
    if (mobileDrop.dropping && mobileDrop.inPipeIndex < 0) {
      waterCount += 1;
    }

    gameOver = false;
    resetMobileDropBall();
  });
}

if (globalResetBtnEl) {
  globalResetBtnEl.addEventListener('click', () => {
    restartGame();
  });
}

if (startMenuPlayBtnEl) {
  startMenuPlayBtnEl.addEventListener('click', () => {
    startGame();
  });
}
