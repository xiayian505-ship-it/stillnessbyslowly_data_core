(function (global) {
  'use strict';
  function create(options) {
    options = options || {};
    var ring = typeof options.ring === 'string' ? document.querySelector(options.ring) : options.ring;
    var dot = typeof options.dot === 'string' ? document.querySelector(options.dot) : options.dot;
    if (!ring || !dot) return null;
    var fine = window.matchMedia('(pointer: fine)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return { destroy: function(){} };

    var hoverSelector = options.hoverSelector || 'a,button,[data-cursor-hover]';
    var hoverClass = options.hoverClass || 'is-hovering';
    var lag = options.lag == null ? 0.18 : options.lag;
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, raf = 0, running = true;

    function move(e){
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    }
    function over(e){ ring.classList.toggle(hoverClass, !!e.target.closest(hoverSelector)); }
    function loop(){
      if (!running) return;
      rx += (mx-rx)*lag; ry += (my-ry)*lag;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      raf = requestAnimationFrame(loop);
    }
    document.documentElement.classList.add('slowly-has-cursor');
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseover', over);
    loop();

    return { destroy:function(){
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.documentElement.classList.remove('slowly-has-cursor');
      ring.classList.remove(hoverClass);
    }};
  }
  global.SlowlyCustomCursor = { create: create };
})(window);
