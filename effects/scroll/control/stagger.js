/* Slowly Scroll Motion | Control | Stagger v1.0.0
   Sets per-item CSS delay. Combine with any motion CSS and SlowlyReveal.
   This utility has no animation dependency. */
(function (global) {
  'use strict';
  function attach(targets, options) {
    options = options || {};
    const elements = typeof targets === 'string'
      ? Array.from(document.querySelectorAll(targets))
      : Array.from(targets || []);
    const step = Math.max(0, Number(options.step == null ? 90 : options.step));
    const first = Math.max(0, Number(options.first == null ? 0 : options.first));
    const property = options.property || '--slowly-motion-delay';
    const originals = elements.map(el => [el.style.getPropertyValue(property), el.style.getPropertyPriority(property)]);
    elements.forEach((el, index) => el.style.setProperty(property, `${first + index * step}ms`));
    return { destroy() {
      elements.forEach((el, index) => {
        const [value, priority] = originals[index];
        if (value) el.style.setProperty(property, value, priority);
        else el.style.removeProperty(property);
      });
    }};
  }
  global.SlowlyScrollStagger = Object.freeze({ version: '1.0.0', attach });
})(window);
