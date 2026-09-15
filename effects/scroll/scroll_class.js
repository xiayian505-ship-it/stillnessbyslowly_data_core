(function (global) {
  'use strict';
  function attach(element, options) {
    options = options || {};
    var el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return null;
    var className = options.className || 'is-scrolled';
    var threshold = options.threshold == null ? 30 : options.threshold;
    function update() { el.classList.toggle(className, window.scrollY > threshold); }
    window.addEventListener('scroll', update, { passive: true });
    update();
    return { destroy: function(){ window.removeEventListener('scroll', update); el.classList.remove(className); } };
  }
  global.SlowlyScrollClass = { attach: attach };
})(window);
