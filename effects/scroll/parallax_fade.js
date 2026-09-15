(function (global) {
  'use strict';
  function attach(element, options) {
    options = options || {};
    var el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return null;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return { destroy: function(){} };
    var speed = options.speed == null ? 0.22 : options.speed;
    var fadeViewport = options.fadeViewport == null ? 0.85 : options.fadeViewport;
    var limitViewport = options.limitViewport == null ? 1 : options.limitViewport;
    var ticking = false;
    function update(){
      var y = window.scrollY;
      if (y < window.innerHeight * limitViewport) {
        el.style.transform = 'translateY(' + (y * speed) + 'px)';
        el.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * fadeViewport)));
      }
      ticking = false;
    }
    function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return { destroy:function(){ window.removeEventListener('scroll', onScroll); el.style.transform=''; el.style.opacity=''; } };
  }
  global.SlowlyParallaxFade = { attach: attach };
})(window);
