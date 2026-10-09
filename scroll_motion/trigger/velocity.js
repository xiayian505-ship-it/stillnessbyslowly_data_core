/* Slowly Scroll Motion | Trigger | Velocity v1.0.0
   Measures signed pixels per second; no built-in UI or effects. */
(function (global) {
  'use strict';
  function attach(target, options) {
    options = options || {};
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    const property = options.property || '--slowly-scroll-velocity';
    const previous = el.style.getPropertyValue(property);
    const priority = el.style.getPropertyPriority(property);
    let lastY = Math.max(0, global.scrollY || 0);
    let lastT = global.performance.now();
    let frame = 0;
    function update(now) {
      frame = 0;
      const y = Math.max(0, global.scrollY || 0);
      const dt = Math.max(1, now - lastT);
      const velocity = Math.round((y - lastY) * 1000 / dt);
      lastY = y;
      lastT = now;
      el.style.setProperty(property, String(velocity));
      if (typeof options.onUpdate === 'function') options.onUpdate(velocity, el);
    }
    function request() { if (!frame) frame = global.requestAnimationFrame(update); }
    el.style.setProperty(property, '0');
    global.addEventListener('scroll', request, { passive: true });
    return { destroy() {
      global.removeEventListener('scroll', request);
      if (frame) global.cancelAnimationFrame(frame);
      if (previous) el.style.setProperty(property, previous, priority);
      else el.style.removeProperty(property);
    }};
  }
  global.SlowlyScrollVelocity = Object.freeze({ version: '1.0.0', attach });
})(window);
