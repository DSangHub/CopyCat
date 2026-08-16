---
description: Progressive shake-to-prize web game with 1000 → 100 → 10 squares
alwaysApply: true
---

# Prize Shake Game Rules

## Stack
- Vite + vanilla JavaScript (ES modules). No React, no frameworks unless I explicitly ask.
- HTML5 Canvas for the big tumbling pile (1000 squares).
- lucky-canvas LuckyGrid for the selectable 100 and 10 prize squares.
- No backend in the first version. All prizes are placeholders.

## Architecture
- One responsibility per file:
  - `game.js`     → main loop, state machine, constants
  - `shake.js`    → DeviceMotion + button fallback
  - `render.js`   → Canvas pile
  - `grids.js`    → lucky-canvas LuckyGrid for 100 and 10
  - `prizes.js`   → prize assignment logic
  - `input.js`    → click/tap helpers
- Single `requestAnimationFrame` loop only while animating/shaking. Stop it when idle.
- All tunable constants at the very top of `game.js` (SQUARE_COUNT, SHAKE_THRESHOLD, ANIMATION_DURATION, etc.).

## Game Stages (strict order)
1. `pile`     → 1000 squares on canvas
2. `select100`→ after first shake, 100 selectable squares
3. `select10` → after second shake, 10 final prize squares
4. `claim`    → show the won prize + fake code

Never skip stages or invent extra stages.

## Shake Behavior
- Must support real phone shake via `DeviceMotionEvent`.
- Always provide a big visible “Shake” button for desktop and accessibility.
- Shake should feel physical: squares tumble, scatter, then settle into the next stage.

## Prizes
- Stage 100: every square is either a digital discount coupon placeholder or “Try Again”.
- Stage 10: every square is a real-value prize (better coupon / gift / cash placeholder).
- Never invent real retailer names, real coupon codes, or real cash amounts. Use clear placeholders like “20% Off – Retailer A” or “$10 Cash Credit”.

## Coding Rules
- Implement the simplest working version first. Do not add features I did not ask for.
- When I paste an error, fix only that error. Do not refactor unrelated code.
- Never delete working files or `package.json` without asking.
- Before saying “done”, confirm the current stage renders and the shake/selection works.
- Prefer clear, readable code over clever code. Comment only the non-obvious parts.
