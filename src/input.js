export function bindGrid(container, onSelect) {
  container.addEventListener('click', (event) => {
    const tile = event.target.closest('[data-index]');
    if (!tile || tile.disabled) return;
    onSelect(Number(tile.dataset.index), tile);
  });
}

export function setGridInteractive(container, enabled) {
  container.querySelectorAll('[data-index]').forEach((tile) => {
    tile.disabled = !enabled;
  });
}

export function markSelected(container, index) {
  container.querySelectorAll('[data-index]').forEach((tile) => {
    const selected = Number(tile.dataset.index) === index;
    tile.classList.toggle('is-selected', selected);
    tile.classList.toggle('is-dimmed', !selected);
  });
}
