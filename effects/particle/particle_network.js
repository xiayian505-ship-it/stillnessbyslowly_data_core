(function (global) {
  'use strict';

  function createParticleNetwork(options) {
    options = options || {};
    var canvas = typeof options.canvas === 'string'
      ? document.querySelector(options.canvas)
      : options.canvas;
    if (!canvas || !canvas.getContext) return null;

    var ctx = canvas.getContext('2d');
    var reduced = options.respectReducedMotion !== false && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pointerEnabled = options.pointer !== false;
    var maxDpr = options.maxDpr || 2;
    var mobileCount = options.mobileCount || 42;
    var maxCount = options.maxCount || 110;
    var density = options.density || 17000;
    var linkDistance = options.linkDistance || 130;
    var repelDistance = options.repelDistance || Math.sqrt(22000);
    var repelStrength = options.repelStrength == null ? 0.2 : options.repelStrength;
    var friction = options.friction || 0.988;
    var lineColor = options.lineColor || '150,205,255';
    var lineAlpha = options.lineAlpha == null ? 0.26 : options.lineAlpha;
    var lineWidth = options.lineWidth == null ? 0.6 : options.lineWidth;

    var W = 0, H = 0, DPR = 1;
    var particles = [];
    var raf = 0;
    var running = false;
    var pointer = { x: -9999, y: -9999 };

    function makeParticles() {
      var count = W < 700 ? mobileCount : Math.min(maxCount, Math.floor((W * H) / density));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.38,
          vy: (Math.random() - 0.5) * 0.38,
          r: Math.random() * 1.6 + 0.6,
          h: 175 + Math.random() * 110,
          a: 0.35 + Math.random() * 0.5
        });
      }
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, maxDpr);
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      makeParticles();
      if (reduced) drawStatic();
    }

    function drawParticle(pt) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + pt.h + ',95%,72%,' + pt.a + ')';
      ctx.fill();
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(drawParticle);
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var repel2 = repelDistance * repelDistance;
      var link2 = linkDistance * linkDistance;

      for (var i = 0; i < particles.length; i++) {
        var pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;

        if (pointerEnabled) {
          var dx = pt.x - pointer.x;
          var dy = pt.y - pointer.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < repel2 && d2 > 1) {
            var d = Math.sqrt(d2);
            var f = ((repel2 - d2) / repel2) * repelStrength;
            pt.vx += (dx / d) * f;
            pt.vy += (dy / d) * f;
          }
        }

        pt.vx *= friction;
        pt.vy *= friction;
        if (Math.abs(pt.vx) < 0.02) pt.vx += (Math.random() - 0.5) * 0.04;
        if (Math.abs(pt.vy) < 0.02) pt.vy += (Math.random() - 0.5) * 0.04;

        if (pt.x < -30) pt.x = W + 30;
        if (pt.x > W + 30) pt.x = -30;
        if (pt.y < -30) pt.y = H + 30;
        if (pt.y > H + 30) pt.y = -30;
        drawParticle(pt);
      }

      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var p1 = particles[a], p2 = particles[b];
          var lx = p1.x - p2.x, ly = p1.y - p2.y;
          var dist2 = lx * lx + ly * ly;
          if (dist2 < link2) {
            var opacity = (1 - dist2 / link2) * lineAlpha;
            ctx.strokeStyle = 'rgba(' + lineColor + ',' + opacity + ')';
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function onPointerMove(e) { pointer.x = e.clientX; pointer.y = e.clientY; }
    function onPointerOut(e) { if (!e.relatedTarget) { pointer.x = -9999; pointer.y = -9999; } }

    window.addEventListener('resize', resize);
    if (pointerEnabled) {
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseout', onPointerOut);
    }
    resize();

    return {
      start: function () {
        if (reduced || running) return;
        running = true;
        frame();
      },
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
      },
      resize: resize,
      destroy: function () {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseout', onPointerOut);
      }
    };
  }

  global.SlowlyParticleNetwork = { create: createParticleNetwork };
})(window);
