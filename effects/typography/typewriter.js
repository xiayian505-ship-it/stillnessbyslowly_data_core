(function (global) {
  'use strict';

  function createTypewriter(options) {
    options = options || {};
    var target = typeof options.target === 'string'
      ? document.querySelector(options.target)
      : options.target;
    var phrases = Array.isArray(options.phrases) ? options.phrases.slice() : [];

    if (!target || phrases.length === 0) {
      return { start: function(){}, stop: function(){}, destroy: function(){} };
    }

    var typeMin = options.typeMin == null ? 55 : options.typeMin;
    var typeJitter = options.typeJitter == null ? 45 : options.typeJitter;
    var deleteDelay = options.deleteDelay == null ? 26 : options.deleteDelay;
    var holdDelay = options.holdDelay == null ? 1900 : options.holdDelay;
    var gapDelay = options.gapDelay == null ? 340 : options.gapDelay;
    var loop = options.loop !== false;

    var phraseIndex = 0;
    var charIndex = 0;
    var deleting = false;
    var timer = null;
    var running = false;

    function schedule(delay) {
      clearTimeout(timer);
      timer = setTimeout(step, delay);
    }

    function step() {
      if (!running) return;
      var current = phrases[phraseIndex];

      if (!deleting) {
        charIndex += 1;
        target.textContent = current.slice(0, charIndex);
        if (charIndex >= current.length) {
          deleting = true;
          schedule(holdDelay);
        } else {
          schedule(typeMin + Math.random() * typeJitter);
        }
        return;
      }

      charIndex -= 1;
      target.textContent = current.slice(0, Math.max(0, charIndex));
      if (charIndex <= 0) {
        deleting = false;
        if (!loop && phraseIndex === phrases.length - 1) {
          running = false;
          return;
        }
        phraseIndex = (phraseIndex + 1) % phrases.length;
        schedule(gapDelay);
      } else {
        schedule(deleteDelay);
      }
    }

    return {
      start: function () {
        if (running) return;
        running = true;
        step();
      },
      stop: function () {
        running = false;
        clearTimeout(timer);
      },
      destroy: function () {
        running = false;
        clearTimeout(timer);
        timer = null;
      }
    };
  }

  global.SlowlyTypewriter = { create: createTypewriter };
})(window);
