(function (global) {
  'use strict';
  function attach(element, options) {
    options = options || {};
    var el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return null;
    var fine = window.matchMedia('(pointer: fine)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return { destroy: function(){} };

    var strengthX = options.strengthX == null ? 0.28 : options.strengthX;
    var strengthY = options.strengthY == null ? 0.4 : options.strengthY;

    function move(e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2;
      var y = e.clientY - r.top - r.height / 2;
      el.style.transform = 'translate(' + (x * strengthX) + 'px,' + (y * strengthY) + 'px)';
    }
    function leave() { el.style.transform = ''; }

    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return { destroy: function(){ el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); el.style.transform = ''; } };
  }
  global.SlowlyMagneticHover = { attach: attach };
})(window);
