/* Slowly Scroll Motion | Trigger | Direction v1.0.0
   Sets is-scrolling-up / is-scrolling-down classes or calls onChange.
   Does not set animation or layout styles. */
(function (global) {
  'use strict';
  function attach(target, options) {
    options = options || {};
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    const up = options.upClass || 'is-scrolling-up';
    const down = options.downClass || 'is-scrolling-down';
    const minDelta = Math.max(0, Number(options.minDelta == null ? 3 : options.minDelta) || 0);
    let position = Math.max(0, global.scrollY || 0);
    let current = null;
    let frame = 0;
    function update() {
      frame = 0;
      const next = Math.max(0, global.scrollY || 0);
      const delta = next - position;
      if (Math.abs(delta) < minDelta) return;
      position = next;
      const direction = delta > 0 ? 'down' : 'up';
      if (direction === current) return;
      current = direction;
      el.classList.toggle(up, current === 'up');
      el.classList.toggle(down, current === 'down');
      if (typeof options.onChange === 'function') options.onChange(current, el);
    }
    function request() { if (!frame) frame = global.requestAnimationFrame(update); }
    global.addEventListener('scroll', request, { passive: true });
    return { destroy() {
      global.removeEventListener('scroll', request);
      if (frame) global.cancelAnimationFrame(frame);
      el.classList.remove(up, down);
    }};
  }
  global.SlowlyScrollDirection = Object.freeze({ version: '1.0.0', attach });
})(window);
