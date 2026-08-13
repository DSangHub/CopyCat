export function createShakeController({
  threshold,
  cooldownMs,
  onShake,
  button,
  statusEl,
}) {
  let lastShakeAt = 0;
  let armed = false;
  let lastSample = null;
  let listening = false;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function fire(source) {
    if (!armed || button.disabled) return;
    const now = performance.now();
    if (now - lastShakeAt < cooldownMs) return;
    lastShakeAt = now;
    onShake(source);
  }

  function onMotion(event) {
    const withoutGravity = event.acceleration;
    const withGravity = event.accelerationIncludingGravity;
    const acc = (withoutGravity && withoutGravity.x != null)
      ? withoutGravity
      : withGravity;

    if (!acc || acc.x == null) return;

    if (withoutGravity && withoutGravity.x != null) {
      const magnitude = Math.hypot(acc.x, acc.y, acc.z);
      if (magnitude >= threshold) fire('motion');
      return;
    }

    if (!lastSample) {
      lastSample = { x: acc.x, y: acc.y, z: acc.z };
      return;
    }

    const delta = Math.hypot(
      acc.x - lastSample.x,
      acc.y - lastSample.y,
      acc.z - lastSample.z,
    );
    lastSample = { x: acc.x, y: acc.y, z: acc.z };
    if (delta >= threshold) fire('motion');
  }

  async function enableMotion() {
    if (listening) return;
    try {
      if (
        typeof DeviceMotionEvent !== 'undefined'
        && typeof DeviceMotionEvent.requestPermission === 'function'
      ) {
        const result = await DeviceMotionEvent.requestPermission();
        if (result !== 'granted') {
          setStatus('Motion permission denied — use the button.');
          return;
        }
      }

      window.addEventListener('devicemotion', onMotion, { passive: true });
      listening = true;
      setStatus('Phone shake is on.');
    } catch {
      setStatus('Shake with the button.');
    }
  }

  if (
    typeof DeviceMotionEvent !== 'undefined'
    && typeof DeviceMotionEvent.requestPermission !== 'function'
  ) {
    window.addEventListener('devicemotion', onMotion, { passive: true });
    listening = true;
  }

  button.addEventListener('click', () => {
    enableMotion();
    fire('button');
  });

  return {
    setArmed(value) {
      armed = value;
    },
    enableMotion,
    setStatus,
  };
}
