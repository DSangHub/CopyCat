import { LuckyGrid } from 'lucky-canvas';

function cellFonts(prize, compact) {
  const dark = prize.kind === 'try' ? '#ece6ea' : '#1b0d14';
  if (prize.kind === 'try') {
    return [{
      text: 'Try Again',
      fontSize: compact ? '8px' : '16px',
      fontWeight: '800',
      fontColor: dark,
      top: compact ? '30%' : '38%',
      wordWrap: true,
      lengthLimit: '92%',
      lineClamp: 2,
    }];
  }

  if (compact) {
    return [
      {
        text: prize.label,
        fontSize: '8px',
        fontWeight: '800',
        fontColor: dark,
        top: '8%',
        wordWrap: true,
        lengthLimit: '92%',
        lineClamp: 2,
        lineHeight: '9px',
      },
      {
        text: prize.store,
        fontSize: '7px',
        fontWeight: '600',
        fontColor: 'rgba(27,13,20,0.72)',
        top: '58%',
        wordWrap: true,
        lengthLimit: '92%',
        lineClamp: 1,
      },
    ];
  }

  const caption = prize.store ? `${prize.label} – ${prize.store}` : prize.label;
  return [
    {
      text: prize.mark,
      fontSize: '18px',
      fontWeight: '800',
      fontColor: dark,
      top: '10%',
    },
    {
      text: caption,
      fontSize: '13px',
      fontWeight: '700',
      fontColor: dark,
      top: '42%',
      wordWrap: true,
      lengthLimit: '90%',
      lineClamp: 3,
      lineHeight: '15px',
    },
  ];
}

function indexFromPointer(event, host, cols, rows, pad) {
  const rect = host.getBoundingClientRect();
  const x = event.clientX - rect.left - pad;
  const y = event.clientY - rect.top - pad;
  const width = rect.width - pad * 2;
  const height = rect.height - pad * 2;
  if (x < 0 || y < 0 || x > width || y > height) return -1;
  const col = Math.min(cols - 1, Math.max(0, Math.floor((x / width) * cols)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor((y / height) * rows)));
  return row * cols + col;
}

export function createPrizeGrid({
  host,
  prizes,
  cols,
  rows,
  gutter,
  pad,
  selectDelayMs,
  onSelect,
}) {
  destroyPrizeGrid(host);

  host.hidden = false;
  host.className = `lucky-grid lucky-grid--${prizes.length}`;

  const rect = host.getBoundingClientRect();
  const width = Math.max(120, Math.floor(rect.width));
  const height = Math.max(120, Math.floor(rect.height));
  const compact = prizes.length > 20;
  const inset = pad ?? 4;

  const buttons = prizes.map((prize, index) => ({
    x: index % cols,
    y: (index / cols) | 0,
    background: prize.kind === 'try' ? '#6d6574' : prize.accent,
    borderRadius: compact ? 6 : 14,
    fonts: cellFonts(prize, compact),
    prizeIndex: index,
  }));

  const lucky = new LuckyGrid(host, {
    width,
    height,
    rows,
    cols,
    blocks: [{
      padding: `${inset}px`,
      background: 'rgba(0,0,0,0.16)',
      borderRadius: compact ? 12 : 18,
    }],
    buttons,
    defaultConfig: {
      gutter,
    },
    defaultStyle: {
      borderRadius: compact ? 6 : 14,
      fontColor: '#1b0d14',
      fontSize: compact ? '8px' : '14px',
      fontWeight: '700',
      wordWrap: true,
      lengthLimit: '90%',
    },
    activeStyle: {
      background: '#ffc857',
      fontColor: '#1b0d14',
    },
  });

  let locked = false;
  let timer = 0;

  function pick(index) {
    if (locked || index < 0 || index >= prizes.length) return;
    locked = true;

    lucky.buttons = lucky.buttons.map((button, i) => ({
      ...button,
      background: i === index
        ? '#ffc857'
        : (prizes[i].kind === 'try' ? '#4a4450' : prizes[i].accent),
      shadow: i === index ? '0 0 10px #ffc857' : '',
    }));

    timer = window.setTimeout(() => {
      onSelect(index);
    }, selectDelayMs);
  }

  function onClick(event) {
    event.stopPropagation();
    pick(indexFromPointer(event, host, cols, rows, inset));
  }

  host.addEventListener('click', onClick);
  host._luckyCleanup = () => {
    locked = true;
    window.clearTimeout(timer);
    host.removeEventListener('click', onClick);
    host.innerHTML = '';
    host.hidden = true;
  };

  return {
    lucky,
    destroy() {
      host._luckyCleanup?.();
      host._luckyCleanup = null;
    },
  };
}

export function destroyPrizeGrid(host) {
  if (!host) return;
  host._luckyCleanup?.();
  host._luckyCleanup = null;
  host.innerHTML = '';
  host.hidden = true;
}
