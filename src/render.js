const PALETTE = [
  '#ff5a5f', '#ff8a5b', '#ffd166', '#06d6a0', '#118ab2',
  '#7b61ff', '#f72585', '#4cc9f0', '#f9c74f', '#90be6d',
  '#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#c77dff',
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

export function resizeCanvas(canvas) {
  const parent = canvas.parentElement;
  const rect = parent.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width);
  const cssHeight = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(cssWidth * dpr));
  const height = Math.max(1, Math.floor(cssHeight * dpr));

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return {
    width,
    height,
    dpr,
    cssWidth,
    cssHeight,
  };
}

export function createPileSquares(count, width, height, minSize, maxSize) {
  const squares = [];
  const cx = width * 0.5;
  const floor = height * 0.92;
  const heapW = width * 0.9;
  const heapH = height * 0.82;

  for (let i = 0; i < count; i += 1) {
    const layer = Math.pow(Math.random(), 0.42);
    const halfWidth = (0.22 + 0.78 * layer) * heapW * 0.5;
    const x = cx + (Math.random() * 2 - 1) * halfWidth;
    const y = floor - (1 - layer) * heapH + (Math.random() - 0.5) * (minSize * 1.4);

    squares.push({
      x,
      y,
      vx: 0,
      vy: 0,
      rotation: (Math.random() - 0.5) * 1.4,
      vr: 0,
      size: minSize + Math.random() * (maxSize - minSize),
      color: PALETTE[(Math.random() * PALETTE.length) | 0],
      opacity: 1,
      survivor: false,
      targetX: 0,
      targetY: 0,
      targetSize: 0,
      startX: 0,
      startY: 0,
      startRot: 0,
      startSize: 0,
    });
  }

  return squares;
}

export function squaresFromTiles(gridEl, canvas, prizes) {
  const canvasRect = canvas.getBoundingClientRect();
  const dpr = canvas.width / Math.max(canvasRect.width, 1);

  return [...gridEl.querySelectorAll('[data-index]')].map((tile, index) => {
    const rect = tile.getBoundingClientRect();
    const prize = prizes[index];
    return {
      x: (rect.left + rect.width / 2 - canvasRect.left) * dpr,
      y: (rect.top + rect.height / 2 - canvasRect.top) * dpr,
      vx: 0,
      vy: 0,
      rotation: 0,
      vr: 0,
      size: Math.min(rect.width, rect.height) * dpr * 0.92,
      color: prize?.accent || PALETTE[index % PALETTE.length],
      opacity: 1,
      survivor: false,
      targetX: 0,
      targetY: 0,
      targetSize: 0,
      startX: 0,
      startY: 0,
      startRot: 0,
      startSize: 0,
    };
  });
}

export function squaresFromPrizes(prizes, canvas, cols) {
  const dpr = canvas.width / Math.max(canvas.getBoundingClientRect().width, 1);
  const rows = Math.ceil(prizes.length / cols);
  const pad = 12 * dpr;
  const gap = (cols >= 10 ? 5 : 10) * dpr;
  const innerW = canvas.width - pad * 2;
  const innerH = canvas.height - pad * 2;
  const cellW = (innerW - gap * (cols - 1)) / cols;
  const cellH = (innerH - gap * (rows - 1)) / rows;
  const size = Math.max(8, Math.min(cellW, cellH) * 0.86);

  return prizes.map((prize, index) => {
    const col = index % cols;
    const row = (index / cols) | 0;
    return {
      x: pad + col * (cellW + gap) + cellW / 2,
      y: pad + row * (cellH + gap) + cellH / 2,
      vx: 0,
      vy: 0,
      rotation: 0,
      vr: 0,
      size,
      color: prize.kind === 'try' ? '#6b7280' : prize.accent,
      opacity: 1,
      survivor: false,
      targetX: 0,
      targetY: 0,
      targetSize: 0,
      startX: 0,
      startY: 0,
      startRot: 0,
      startSize: 0,
    };
  });
}

export function drawSquares(ctx, squares, shakeX, shakeY) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(shakeX, shakeY);

  for (let i = 0; i < squares.length; i += 1) {
    const square = squares[i];
    if (square.opacity <= 0.01) continue;

    ctx.save();
    ctx.translate(square.x, square.y);
    ctx.rotate(square.rotation);
    ctx.globalAlpha = square.opacity;

    const half = square.size / 2;
    ctx.fillStyle = square.color;
    ctx.fillRect(-half, -half, square.size, square.size);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-half, -half, square.size, square.size * 0.36);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-half, half * 0.32, square.size, square.size * 0.34);
    ctx.restore();
  }

  ctx.restore();
}

export function gridTargets(count, width, height, padding) {
  const cols = count <= 10 ? Math.min(5, count) : 10;
  const rows = Math.ceil(count / cols);
  const gap = count <= 10 ? Math.max(14, width * 0.018) : Math.max(6, width * 0.008);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const cellW = (innerW - gap * (cols - 1)) / cols;
  const cellH = (innerH - gap * (rows - 1)) / rows;
  const size = Math.max(8, Math.min(cellW, cellH) * 0.86);
  const gridW = cols * cellW + (cols - 1) * gap;
  const gridH = rows * cellH + (rows - 1) * gap;
  const originX = (width - gridW) / 2 + cellW / 2;
  const originY = (height - gridH) / 2 + cellH / 2;
  const targets = [];

  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = (i / cols) | 0;
    targets.push({
      x: originX + col * (cellW + gap),
      y: originY + row * (cellH + gap),
      size,
    });
  }

  return { targets, cols, rows };
}

export function showCanvas(canvas) {
  canvas.classList.remove('is-hidden');
}

export function hideCanvas(canvas) {
  canvas.classList.add('is-hidden');
}

export function renderGrid(container, prizes, sizeClass) {
  container.hidden = false;
  container.className = `grid grid--${sizeClass}`;
  container.innerHTML = prizes.map((prize, index) => `
    <button type="button" class="tile tile--${prize.kind}" data-index="${index}" style="--accent:${prize.accent}">
      <span class="tile-mark">${escapeHtml(prize.mark)}</span>
      <span class="tile-label">${escapeHtml(prize.label)}</span>
      <span class="tile-store">${escapeHtml(prize.store)}</span>
    </button>
  `).join('');
}

export function hideGrid(container) {
  container.hidden = true;
  container.innerHTML = '';
}

export function showClaim(claimEl, prize, code) {
  claimEl.hidden = false;
  claimEl.querySelector('#claim-mark').textContent = prize.mark;
  claimEl.querySelector('#claim-mark').style.setProperty('--accent', prize.accent);
  const title = prize.store ? `${prize.label} – ${prize.store}` : prize.label;
  claimEl.querySelector('#claim-title').textContent = title;
  claimEl.querySelector('#claim-store').textContent = prize.kind === 'try' ? '' : 'Placeholder prize';
  claimEl.querySelector('#claim-blurb').textContent = prize.blurb || 'Placeholder prize — not a real offer.';
  claimEl.querySelector('#claim-code').textContent = code;
  const copyBtn = claimEl.querySelector('#copy-code');
  if (copyBtn) {
    copyBtn.hidden = false;
    copyBtn.textContent = 'Copy Code';
    copyBtn.disabled = false;
  }
}

export function hideClaim(claimEl) {
  claimEl.hidden = true;
}
