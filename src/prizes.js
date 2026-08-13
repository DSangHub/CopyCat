const STAGE_100_COUPONS = [
  { kind: 'coupon', label: '10% Off', store: 'Store A', mark: 'A', accent: '#ff6b6b' },
  { kind: 'coupon', label: '15% Off', store: 'Store B', mark: 'B', accent: '#4ecdc4' },
  { kind: 'coupon', label: '20% Off', store: 'Market C', mark: 'C', accent: '#ffd166' },
  { kind: 'coupon', label: 'Buy 1 Get 1', store: 'Shop D', mark: 'D', accent: '#7b61ff' },
  { kind: 'coupon', label: '25% Off', store: 'Outlet E', mark: 'E', accent: '#f72585' },
  { kind: 'coupon', label: '$5 Off $25', store: 'Store A', mark: 'A', accent: '#ff8a5b' },
];

const STAGE_10_PRIZES = {
  coupon: [
    { kind: 'coupon', label: '40% Off', store: 'Store A', mark: 'A', accent: '#ff6b6b', blurb: 'A bigger digital discount placeholder.' },
    { kind: 'coupon', label: '50% Off', store: 'Store B', mark: 'B', accent: '#4ecdc4', blurb: 'A better coupon placeholder.' },
    { kind: 'coupon', label: '35% Off', store: 'Market C', mark: 'C', accent: '#ffd166', blurb: 'A limited digital coupon placeholder.' },
  ],
  gift: [
    { kind: 'gift', label: 'Mystery Gift', store: 'Retailer B', mark: 'B', accent: '#06d6a0', blurb: 'A placeholder gift prize.' },
    { kind: 'gift', label: 'Bonus Bundle', store: 'Shop D', mark: 'D', accent: '#7b61ff', blurb: 'A placeholder gift bundle.' },
  ],
  cash: [
    { kind: 'cash', label: '$10 Credit', store: 'Wallet', mark: '$', accent: '#ffc857', blurb: 'A placeholder cash credit.' },
    { kind: 'cash', label: '$5 Credit', store: 'Wallet', mark: '$', accent: '#f4a261', blurb: 'A placeholder cash credit.' },
  ],
};

function pick(list) {
  return list[(Math.random() * list.length) | 0];
}

function shuffle(list) {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function clonePrize(template, id) {
  return { ...template, id };
}

export function assignStage100(count, tryAgainRate) {
  const tryAgainCount = Math.round(count * tryAgainRate);
  const prizes = [];

  for (let i = 0; i < count; i += 1) {
    if (i < tryAgainCount) {
      prizes.push({
        id: `try-${i}`,
        kind: 'try',
        label: 'Try Again',
        store: '',
        mark: '×',
        accent: '#6b7280',
        blurb: '',
      });
    } else {
      prizes.push(clonePrize(pick(STAGE_100_COUPONS), `c100-${i}`));
    }
  }

  return shuffle(prizes);
}

export function assignStage10(count, weights) {
  const kinds = [];
  const couponCount = Math.round(count * weights.coupon);
  const giftCount = Math.round(count * weights.gift);
  const cashCount = count - couponCount - giftCount;

  for (let i = 0; i < couponCount; i += 1) kinds.push('coupon');
  for (let i = 0; i < giftCount; i += 1) kinds.push('gift');
  for (let i = 0; i < cashCount; i += 1) kinds.push('cash');

  while (kinds.length < count) kinds.push('coupon');

  return shuffle(kinds).slice(0, count).map((kind, i) => (
    clonePrize(pick(STAGE_10_PRIZES[kind]), `c10-${kind}-${i}`)
  ));
}

export function generateClaimCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = (size) => Array.from({ length: size }, () => (
    alphabet[(Math.random() * alphabet.length) | 0]
  )).join('');
  return `DEMO-${chunk(4)}-${chunk(4)}`;
}
