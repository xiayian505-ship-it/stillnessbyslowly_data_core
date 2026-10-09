/* Slowly Scroll Motion | Trigger | Element Progress v1.0.0
   Writes --slowly-scroll-item-progress (0..1) to one element.
   Start: target top reaches viewport bottom. End: target bottom reaches viewport top.
   No animation is included; combine with linked/*.css. */
(function (global) {
  'use strict';
  function attach(target, options) {
    options = options || {};
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    const property = options.property || '--slowly-scroll-item-progress';
    const original = el.style.getPropertyValue(property);
    const priority = el.style.getPropertyPriority(property);
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let latest = -1;
    function update() {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const height = Math.max(1, global.innerHeight || document.documentElement.clientHeight);
      const start = options.start == null ? 1 : Number(options.start);
      const end = options.end == null ? 0 : Number(options.end);
      // start/end are viewport-height fractions; e.g. 1 = bottom, 0 = top.
      const from = height * start;
      const to = height * end - rect.height;
      const range = from - to;
      const raw = range === 0 ? Number(rect.top <= to) : (from - rect.top) / range;
      const progress = reduce ? 1 : Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0));
      if (progress !== latest) {
        latest = progress;
        el.style.setProperty(property, String(progress));
        if (typeof options.onUpdate === 'function') options.onUpdate(progress, el);
      }
    }
    function request() { if (!frame) frame = global.requestAnimationFrame(update); }
    update();
    global.addEventListener('scroll', request, { passive: true });
    global.addEventListener('resize', request);
    return { update, destroy() {
      global.removeEventListener('scroll', request);
      global.removeEventListener('resize', request);
      if (frame) global.cancelAnimationFrame(frame);
      if (original) el.style.setProperty(property, original, priority);
      else el.style.removeProperty(property);
    }};
  }
  global.SlowlyScrollElementProgress = Object.freeze({ version: '1.0.0', attach });
})(window);
