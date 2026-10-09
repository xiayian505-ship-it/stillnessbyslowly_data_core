/* Slowly Scroll Motion | Trigger | Active Section v1.0.0
   Marks sections intersecting a configurable viewport focus line.
   One active element at a time; returns destroy/update. */
(function (global) {
  'use strict';
  function attach(targets, options) {
    options = options || {};
    const elements = typeof targets === 'string'
      ? Array.from(document.querySelectorAll(targets))
      : Array.from(targets || []);
    if (!elements.length) return null;
    const className = options.className || 'is-active-section';
    const focus = Math.max(0, Math.min(1, Number(options.focus == null ? 0.45 : options.focus)));
    let frame = 0;
    let active = null;
    function update() {
      frame = 0;
      const focusY = global.innerHeight * focus;
      let winner = null;
      let closest = Infinity;
      elements.forEach(el => {
        const r = el.getBoundingClientRect();
        // Prefer a section that contains the focus line; otherwise nearest boundary.
        const distance = r.top <= focusY && r.bottom >= focusY ? 0
          : Math.min(Math.abs(r.top - focusY), Math.abs(r.bottom - focusY));
        if (distance < closest) { closest = distance; winner = el; }
      });
      if (winner === active) return;
      elements.forEach(el => el.classList.toggle(className, el === winner));
      active = winner;
      if (typeof options.onChange === 'function') options.onChange(active);
    }
    function request() { if (!frame) frame = global.requestAnimationFrame(update); }
    update();
    global.addEventListener('scroll', request, { passive: true });
    global.addEventListener('resize', request);
    return { update, destroy() {
      global.removeEventListener('scroll', request);
      global.removeEventListener('resize', request);
      if (frame) global.cancelAnimationFrame(frame);
      elements.forEach(el => el.classList.remove(className));
    }};
  }
  global.SlowlyScrollSectionActive = Object.freeze({ version: '1.0.0', attach });
})(window);
