(function (global) {
  'use strict';
  function create(options) {
    options = options || {};
    var root = typeof options.root === 'string' ? document.querySelector(options.root) : options.root;
    if (!root) return null;
    var bar = root.querySelector(options.barSelector || '[data-loader-bar]');
    var text = root.querySelector(options.textSelector || '[data-loader-pct]');
    var doneClass = options.doneClass || 'is-done';
    var value = 0;
    var timer = null;

    function setProgress(next) {
      value = Math.max(0, Math.min(100, next));
      if (bar) bar.style.width = value + '%';
      if (text) text.textContent = Math.floor(value) + '%';
      return value;
    }
    function finish() {
      clearInterval(timer);
      setProgress(100);
      root.classList.add(doneClass);
      if (typeof options.onDone === 'function') options.onDone();
    }
    function startFake() {
      clearInterval(timer);
      timer = setInterval(function(){
        var min = options.stepMin == null ? 6 : options.stepMin;
        var max = options.stepMax == null ? 20 : options.stepMax;
        var next = value + min + Math.random() * (max - min);
        if (next >= 100) finish(); else setProgress(next);
      }, options.interval == null ? 110 : options.interval);
    }
    return { setProgress:setProgress, startFake:startFake, finish:finish, destroy:function(){ clearInterval(timer); } };
  }
  global.SlowlyLoaderProgress = { create:create };
})(window);
