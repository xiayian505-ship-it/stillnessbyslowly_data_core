/* Slowly Scroll Motion | Trigger | Leave v1.0.0
   Adds a class AFTER an element has been visible and then leaves the viewport.
   Re-entry removes the class; no styles are included. */
(function (global) {
  'use strict';
  function attach(target, options) {
    options = options || {};
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    const name = options.className || 'has-left-viewport';
    const observerSupported = 'IntersectionObserver' in global;
    if (!observerSupported) return { destroy() {} };
    let entered = false;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entered = true; el.classList.remove(name); }
        else if (entered) { el.classList.add(name); }
      }
    }, { threshold: options.threshold == null ? 0 : options.threshold,
         rootMargin: options.rootMargin || '0px' });
    observer.observe(el);
    return { destroy() { observer.disconnect(); el.classList.remove(name); } };
  }
  global.SlowlyScrollLeave = Object.freeze({ version: '1.0.0', attach });
})(window);
