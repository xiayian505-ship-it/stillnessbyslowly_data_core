(function (global) {
  'use strict';
  function create(options) {
    options = options || {};
    var selector = options.selector || '[data-slowly-reveal]';
    var className = options.className || 'is-visible';
    var once = options.once !== false;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var elements = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (reduce || !('IntersectionObserver' in window)) {
      elements.forEach(function(el){ el.classList.add(className); });
      return { destroy: function(){} };
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add(className);
          if (once) io.unobserve(entry.target);
        } else if (!once) {
          entry.target.classList.remove(className);
        }
      });
    }, {
      threshold: options.threshold == null ? 0.15 : options.threshold,
      rootMargin: options.rootMargin || '0px 0px -40px 0px'
    });
    elements.forEach(function(el){ io.observe(el); });
    return { destroy: function(){ io.disconnect(); } };
  }
  global.SlowlyReveal = { create: create };
})(window);
