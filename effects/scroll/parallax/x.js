/* Slowly Scroll Motion | Parallax | x v1.0.0
   Standalone axis-only parallax. Uses CSS `translate` (not transform),
   so x and y can be combined on one element. */
(function (global) {
  'use strict';
  function attach(target, options) {
    options = options || {};
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    const property = '--slowly-parallax-x';
    const originalProperty = el.style.getPropertyValue(property);
    const propertyPriority = el.style.getPropertyPriority(property);
    // Shared per-element state lets independent X/Y files restore correctly.
    const key = Symbol.for('stillnessbyslowly.scroll.parallaxState');
    const state = el[key] || (el[key] = { count: 0, original: el.style.translate });
    state.count += 1;
    const distance = Number(options.speed == null ? 0.15 : options.speed);
    const limit = Math.max(0, Number(options.limit == null ? 200 : options.limit));
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    el.style.translate = 'var(--slowly-parallax-x, 0px) var(--slowly-parallax-y, 0px)';
    function update() {
      frame = 0;
      // Base on page scroll, not rect position, to avoid feedback from translation.
      const origin = Number(options.origin == null ? 0 : options.origin);
      const value = reduce ? 0 : Math.max(-limit, Math.min(limit, (global.scrollY - origin) * distance));
      el.style.setProperty(property, value + 'px');
    }
    function request() { if (!frame) frame = global.requestAnimationFrame(update); }
    update();
    global.addEventListener('scroll', request, { passive: true });
    return { update, destroy() {
      global.removeEventListener('scroll', request);
      if (frame) global.cancelAnimationFrame(frame);
      if (originalProperty) el.style.setProperty(property, originalProperty, propertyPriority);
      else el.style.removeProperty(property);
      state.count -= 1;
      if (state.count === 0) {
        el.style.translate = state.original;
        delete el[key];
      }
    }};
  }
  global.SlowlyParallaxX = Object.freeze({ version: '1.0.0', attach });
})(window);
