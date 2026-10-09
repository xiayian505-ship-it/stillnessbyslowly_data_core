/* Slowly Scroll Motion | Horizontal | Vertical to Horizontal v1.0.0
   Scroll the page vertically while translating a horizontal track.
   Requires vertical_to_horizontal.css. No wheel/touch interception.
   Markup: .slowly-vth > .slowly-vth-viewport > .slowly-vth-track */
(function (global) {
  'use strict';
  function attach(target, options) {
    options = options || {};
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return null;
    const viewport = root.querySelector('.slowly-vth-viewport');
    const track = root.querySelector('.slowly-vth-track');
    if (!viewport || !track) return null;
    const savedHeight = root.style.height;
    const savedTranslate = track.style.translate;
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let distance = 0;
    let frame = 0;
    let observer;
    function update() {
      frame = 0;
      if (reduce || distance <= 0) return;
      const top = root.getBoundingClientRect().top;
      const position = Math.max(0, Math.min(distance, -top));
      track.style.translate = (-position) + 'px 0';
    }
    function request() { if (!frame) frame = global.requestAnimationFrame(update); }
    function measure() {
      // On narrow / reduced-motion screens, fall back to native horizontal scrolling.
      distance = reduce ? 0 : Math.max(0, track.scrollWidth - viewport.clientWidth);
      const enabled = distance > 1;
      root.classList.toggle('is-vth-enabled', enabled);
      root.style.height = enabled ? `calc(100vh + ${distance}px)` : savedHeight;
      if (!enabled) track.style.translate = savedTranslate;
      request();
    }
    global.addEventListener('scroll', request, { passive: true });
    global.addEventListener('resize', measure);
    if ('ResizeObserver' in global) {
      observer = new ResizeObserver(measure);
      observer.observe(viewport);
      observer.observe(track);
    }
    measure();
    return { update, refresh: measure, destroy() {
      global.removeEventListener('scroll', request);
      global.removeEventListener('resize', measure);
      if (observer) observer.disconnect();
      if (frame) global.cancelAnimationFrame(frame);
      root.classList.remove('is-vth-enabled');
      root.style.height = savedHeight;
      track.style.translate = savedTranslate;
    }};
  }
  global.SlowlyVerticalToHorizontal = Object.freeze({ version: '1.0.0', attach });
})(window);
