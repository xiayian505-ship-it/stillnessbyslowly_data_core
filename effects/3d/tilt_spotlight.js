(function (global) {
  'use strict';
  function attach(element, options) {
    options = options || {};
    var el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return null;
    var fine = window.matchMedia('(pointer: fine)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return { destroy: function(){} };

    var angle = options.angle == null ? 9 : options.angle;
    var lift = options.lift == null ? 6 : options.lift;
    var perspective = options.perspective || 900;

    function move(e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--sl-spot-x', (px * 100) + '%');
      el.style.setProperty('--sl-spot-y', (py * 100) + '%');
      el.style.transform = 'perspective(' + perspective + 'px) rotateX(' + ((0.5 - py) * angle).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * angle).toFixed(2) + 'deg) translateY(-' + lift + 'px)';
    }
    function leave() { el.style.transform = ''; }

    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return { destroy: function(){ el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); el.style.transform = ''; } };
  }
  global.SlowlyTiltSpotlight = { attach: attach };
})(window);
