import { createShakeController } from './shake.js';
import {
  resizeCanvas,
  createPileSquares,
  squaresFromTiles,
  drawSquares,
  gridTargets,
  showCanvas,
  hideCanvas,
  renderGrid,
  hideGrid,
  showClaim,
  hideClaim,
} from './render.js';
import { assignStage100, assignStage10, generateClaimCode } from './prizes.js';
import { bindGrid, setGridInteractive, markSelected } from './input.js';

export const CONFIG = {
  PILE_COUNT: 1000,
  STAGE_100_COUNT: 100,
  STAGE_10_COUNT: 10,

  SHAKE_THRESHOLD: 14,
  SHAKE_COOLDOWN_MS: 900,

  MIN_SQUARE: 8,
  MAX_SQUARE: 18,

  GRAVITY: 2200,
  FRICTION: 0.986,
  WALL_BOUNCE: 0.58,
  FLOOR_BOUNCE: 0.42,
  ROTATION_DAMP: 0.988,

  IMPULSE_MIN: 420,
  IMPULSE_MAX: 980,
  LIFT: 680,
  SPIN_MAX: 18,

  INTRO_MS: 720,
  TUMBLE_MS: 1500,
  CULL_START_MS: 620,
  SETTLE_MS: 980,

  SCREEN_SHAKE_MS: 320,
  SCREEN_SHAKE_MAG: 14,

  TRY_AGAIN_RATE: 0.38,
  FINAL_PRIZE_WEIGHTS: {
    coupon: 0.5,
    gift: 0.3,
    cash: 0.2,
  },

  GRID_PADDING: 28,
};

const STAGES = {
  PILE: 'pile',
  SELECT_100: 'select100',
  SELECT_10: 'select10',
  CLAIM: 'claim',
};

function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function easeOutCubic(value) {
  const t = clamp01(value);
  return 1 - (1 - t) ** 3;
}

function easeOutBack(value) {
  const t = clamp01(value);
  const overshoot = 1.70158;
  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
}

function rumble() {
  try {
    navigator.vibrate?.([18, 24, 36, 18, 50]);
  } catch {
    // Vibration is optional.
  }
}

function pickSurvivors(squares, count) {
  const order = squares.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }

  for (let i = 0; i < squares.length; i += 1) {
    squares[i].survivor = false;
  }

  const chosen = [];
  for (let i = 0; i < count; i += 1) {
    const square = squares[order[i]];
    square.survivor = true;
    chosen.push(square);
  }
  return chosen;
}

function applyImpulse(squares, intensity = 1) {
  const throwAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.7;
  const throwMag = (CONFIG.IMPULSE_MIN + Math.random() * (CONFIG.IMPULSE_MAX - CONFIG.IMPULSE_MIN)) * intensity;
  const throwX = Math.cos(throwAngle) * throwMag * 0.32;
  const throwY = Math.sin(throwAngle) * throwMag;

  for (let i = 0; i < squares.length; i += 1) {
    const square = squares[i];
    const angle = Math.random() * Math.PI * 2;
    const mag = (CONFIG.IMPULSE_MIN + Math.random() * (CONFIG.IMPULSE_MAX - CONFIG.IMPULSE_MIN)) * intensity;
    square.vx = Math.cos(angle) * mag * 0.55 + throwX;
    square.vy = Math.sin(angle) * mag * 0.32 + throwY - CONFIG.LIFT * (0.75 + Math.random() * 0.55) * intensity;
    square.vr = (Math.random() - 0.5) * CONFIG.SPIN_MAX * intensity;
    square.opacity = 1;
  }
}

function stepPhysics(squares, dt, width, height) {
  for (let i = 0; i < squares.length; i += 1) {
    const square = squares[i];
    if (square.opacity <= 0) continue;

    square.vy += CONFIG.GRAVITY * dt;
    square.vx *= CONFIG.FRICTION;
    square.vy *= CONFIG.FRICTION;
    square.vr *= CONFIG.ROTATION_DAMP;
    square.x += square.vx * dt;
    square.y += square.vy * dt;
    square.rotation += square.vr * dt;

    const half = square.size * 0.5;
    if (square.x < half) {
      square.x = half;
      square.vx = Math.abs(square.vx) * CONFIG.WALL_BOUNCE;
    } else if (square.x > width - half) {
      square.x = width - half;
      square.vx = -Math.abs(square.vx) * CONFIG.WALL_BOUNCE;
    }

    if (square.y < half) {
      square.y = half;
      square.vy = Math.abs(square.vy) * CONFIG.WALL_BOUNCE;
    } else if (square.y > height - half) {
      square.y = height - half;
      square.vy = -Math.abs(square.vy) * CONFIG.FLOOR_BOUNCE;
      square.vx *= 0.9;
    }
  }
}

function cullLosers(squares, elapsed, dt, width, height) {
  if (elapsed < CONFIG.CULL_START_MS) return;

  const progress = easeOutCubic(
    (elapsed - CONFIG.CULL_START_MS) / (CONFIG.TUMBLE_MS - CONFIG.CULL_START_MS),
  );
  const centerX = width * 0.5;
  const centerY = height * 0.5;

  for (let i = 0; i < squares.length; i += 1) {
    const square = squares[i];
    if (square.survivor) continue;
    square.opacity = 1 - progress;
    square.size *= 0.986;
    square.vx += (square.x - centerX) * dt * 3.2;
    square.vy += (square.y - centerY) * dt * 2.1;
  }
}

function screenOffset(elapsed) {
  if (elapsed >= CONFIG.SCREEN_SHAKE_MS) return { x: 0, y: 0 };
  const falloff = 1 - elapsed / CONFIG.SCREEN_SHAKE_MS;
  const magnitude = CONFIG.SCREEN_SHAKE_MAG * falloff * falloff;
  return {
    x: (Math.random() * 2 - 1) * magnitude,
    y: (Math.random() * 2 - 1) * magnitude,
  };
}

function boot() {
  const canvas = document.querySelector('#pile');
  const gridEl = document.querySelector('#grid');
  const claimEl = document.querySelector('#claim');
  const titleEl = document.querySelector('#title');
  const hintEl = document.querySelector('#hint');
  const button = document.querySelector('#shake-btn');
  const statusEl = document.querySelector('#status');
  const playAgain = document.querySelector('#play-again');
  const ctx = canvas.getContext('2d');

  let bounds = resizeCanvas(canvas);
  let squares = [];
  let stage = STAGES.PILE;
  let prizes100 = [];
  let prizes10 = [];
  let picked100 = null;
  let anim = null;
  let rafId = 0;
  let lastTs = 0;
  let cam = { x: 0, y: 0 };

  function setHud(title, hint) {
    titleEl.textContent = title;
    hintEl.textContent = hint;
  }

  function setButton(label, enabled) {
    button.textContent = label;
    button.disabled = !enabled;
    button.hidden = stage === STAGES.CLAIM;
  }

  function draw() {
    drawSquares(ctx, squares, cam.x, cam.y);
  }

  function startLoop() {
    if (rafId) return;
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
  }

  function tick(ts) {
    rafId = 0;
    if (!anim) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;

    const keepGoing = anim.step(ts, dt);
    draw();

    if (keepGoing) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const finished = anim;
    anim = null;
    lastTs = 0;
    finished.finish?.();
  }

  function visibleCount(list) {
    let count = 0;
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].opacity > 0.12) count += 1;
    }
    return count;
  }

  function beginReduce(fromSquares, nextCount, nextPrizes, after) {
    const survivors = pickSurvivors(fromSquares, nextCount);
    const { targets } = gridTargets(
      nextCount,
      bounds.width,
      bounds.height,
      CONFIG.GRID_PADDING * bounds.dpr,
    );

    for (let i = 0; i < survivors.length; i += 1) {
      survivors[i].targetX = targets[i].x;
      survivors[i].targetY = targets[i].y;
      survivors[i].targetSize = targets[i].size;
      survivors[i].color = nextPrizes[i].accent;
    }

    applyImpulse(fromSquares, 1);
    rumble();
    shake.setArmed(false);
    setButton('Shaking…', false);

    const startedAt = performance.now();
    let phase = 'tumble';
    let settleAt = 0;
    squares = fromSquares;

    anim = {
      step(ts, dt) {
        const elapsed = ts - startedAt;

        if (phase === 'tumble') {
          stepPhysics(fromSquares, dt, bounds.width, bounds.height);
          cullLosers(fromSquares, elapsed, dt, bounds.width, bounds.height);
          cam = screenOffset(elapsed);
          hintEl.textContent = `${visibleCount(fromSquares)} squares in play`;

          if (elapsed >= CONFIG.TUMBLE_MS) {
            phase = 'settle';
            settleAt = ts;
            cam = { x: 0, y: 0 };
            for (let i = 0; i < fromSquares.length; i += 1) {
              const square = fromSquares[i];
              if (!square.survivor) {
                square.opacity = 0;
                continue;
              }
              square.startX = square.x;
              square.startY = square.y;
              square.startRot = square.rotation;
              square.startSize = square.size;
              square.opacity = 1;
            }
          }
          return true;
        }

        const settle = easeOutBack((ts - settleAt) / CONFIG.SETTLE_MS);
        for (let i = 0; i < survivors.length; i += 1) {
          const square = survivors[i];
          square.x = square.startX + (square.targetX - square.startX) * settle;
          square.y = square.startY + (square.targetY - square.startY) * settle;
          square.rotation = square.startRot * (1 - clamp01(settle));
          square.size = square.startSize + (square.targetSize - square.startSize) * settle;
        }
        return settle < 1;
      },
      finish() {
        after(nextPrizes);
      },
    };

    startLoop();
  }

  function showSelect100(nextPrizes) {
    prizes100 = nextPrizes;
    stage = STAGES.SELECT_100;
    hideCanvas(canvas);
    renderGrid(gridEl, prizes100, '100');
    setGridInteractive(gridEl, true);
    setHud('Pick a square', 'Tap one of the 100 to lock it in.');
    setButton('Pick a square first', false);
    shake.setArmed(false);
  }

  function showSelect10(nextPrizes) {
    prizes10 = nextPrizes;
    stage = STAGES.SELECT_10;
    hideCanvas(canvas);
    renderGrid(gridEl, prizes10, '10');
    setGridInteractive(gridEl, true);
    setHud('Final 10', 'Every square here has real placeholder value.');
    setButton('Pick your prize', false);
    shake.setArmed(false);
  }

  function resetGame() {
    stage = STAGES.PILE;
    picked100 = null;
    prizes100 = [];
    prizes10 = [];
    hideClaim(claimEl);
    hideGrid(gridEl);
    showCanvas(canvas);
    bounds = resizeCanvas(canvas);
    squares = createPileSquares(
      CONFIG.PILE_COUNT,
      bounds.width,
      bounds.height,
      CONFIG.MIN_SQUARE * bounds.dpr,
      CONFIG.MAX_SQUARE * bounds.dpr,
    );
    cam = { x: 0, y: 0 };
    setHud('Shake the pile', '1,000 squares. Shake to uncover 100 prizes.');
    setButton('Shake', false);
    shake.setArmed(false);
    beginIntro();
  }

  function beginIntro() {
    for (let i = 0; i < squares.length; i += 1) {
      const square = squares[i];
      square.vx = (Math.random() - 0.5) * 90;
      square.vy = (Math.random() - 0.5) * 70;
      square.vr = (Math.random() - 0.5) * 4;
    }

    const startedAt = performance.now();
    anim = {
      step(ts, dt) {
        stepPhysics(squares, dt, bounds.width, bounds.height);
        for (let i = 0; i < squares.length; i += 1) {
          squares[i].vx *= 0.96;
          squares[i].vy *= 0.96;
        }
        return ts - startedAt < CONFIG.INTRO_MS;
      },
      finish() {
        draw();
        setButton('Shake', true);
        shake.setArmed(true);
      },
    };
    startLoop();
  }

  function onShake() {
    if (anim) return;

    if (stage === STAGES.PILE) {
      setHud('Shaking', 'Squares are tumbling down to 100.');
      beginReduce(
        squares,
        CONFIG.STAGE_100_COUNT,
        assignStage100(CONFIG.STAGE_100_COUNT, CONFIG.TRY_AGAIN_RATE),
        showSelect100,
      );
      return;
    }

    if (stage === STAGES.SELECT_100 && picked100) {
      const nextSquares = squaresFromTiles(gridEl, canvas, prizes100);
      hideGrid(gridEl);
      showCanvas(canvas);
      setHud('Shaking', 'The rest tumble down to 10 final prizes.');
      beginReduce(
        nextSquares,
        CONFIG.STAGE_10_COUNT,
        assignStage10(CONFIG.STAGE_10_COUNT, CONFIG.FINAL_PRIZE_WEIGHTS),
        showSelect10,
      );
    }
  }

  const shake = createShakeController({
    threshold: CONFIG.SHAKE_THRESHOLD,
    cooldownMs: CONFIG.SHAKE_COOLDOWN_MS,
    onShake,
    button,
    statusEl,
  });

  bindGrid(gridEl, (index) => {
    if (anim) return;

    if (stage === STAGES.SELECT_100) {
      picked100 = prizes100[index];
      markSelected(gridEl, index);
      setGridInteractive(gridEl, false);
      const followUp = picked100.kind === 'try'
        ? 'Not this one — shake again for the final 10.'
        : `${picked100.label} locked. Shake again for the final 10.`;
      setHud('Square locked', followUp);
      setButton('Shake again', true);
      shake.setArmed(true);
      return;
    }

    if (stage === STAGES.SELECT_10) {
      const prize = prizes10[index];
      markSelected(gridEl, index);
      setGridInteractive(gridEl, false);
      stage = STAGES.CLAIM;
      setButton('Shake', false);
      showClaim(claimEl, prize, generateClaimCode());
    }
  });

  playAgain.addEventListener('click', resetGame);

  window.addEventListener('resize', () => {
    bounds = resizeCanvas(canvas);
    if (anim || stage !== STAGES.PILE) {
      if (stage === STAGES.PILE && !anim) draw();
      return;
    }
    squares = createPileSquares(
      CONFIG.PILE_COUNT,
      bounds.width,
      bounds.height,
      CONFIG.MIN_SQUARE * bounds.dpr,
      CONFIG.MAX_SQUARE * bounds.dpr,
    );
    draw();
  });

  resetGame();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
