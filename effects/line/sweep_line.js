/* Slowly Sweep Line v1.0.0
   Global: SlowlySweepLine
   No dependencies.
*/
(function (global) {
  "use strict";

  const DEFAULTS = Object.freeze({
    duration: 300,
    size: 8,
    length: "22%",
    zIndex: 6,
    interrupt: true
  });

  let instanceSeed = 0;

  function wait(ms) {
    return new Promise(resolve => global.setTimeout(resolve, Math.max(0, ms)));
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toElements(value) {
    if (!value) return [];
    if (value instanceof Element) return [value];
    if (Array.isArray(value)) return value.filter(item => item instanceof Element);
    if (typeof value[Symbol.iterator] === "function") {
      return Array.from(value).filter(item => item instanceof Element);
    }
    return [];
  }

  function normalizeDirections(value) {
    const list = Array.isArray(value) ? value : [value];
    return [...new Set(list.filter(item => item === "horizontal" || item === "vertical"))];
  }

  function create(root, options) {
    if (!(root instanceof Element)) {
      throw new TypeError("SlowlySweepLine.create(root): root must be a DOM Element.");
    }

    const defaults = Object.assign({}, DEFAULTS, options || {});
    const instanceId = `sbs-sweep-line-${++instanceSeed}`;
    let generation = 0;
    let destroyed = false;

    function reducedMotion() {
      return Boolean(
        global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }

    function clear() {
      generation += 1;
      root.querySelectorAll(`[data-sbs-sweep-line-instance="${instanceId}"]`)
        .forEach(element => element.remove());
    }

    function getRect(targets) {
      const elements = toElements(targets);
      if (!elements.length) return null;

      const rootRect = root.getBoundingClientRect();
      const rootLeft = rootRect.left + root.clientLeft;
      const rootTop = rootRect.top + root.clientTop;
      const rects = elements.map(element => {
        if (element === root) {
          return { left: 0, top: 0, right: root.clientWidth, bottom: root.clientHeight };
        }
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left - rootLeft + root.scrollLeft,
          top: rect.top - rootTop + root.scrollTop,
          right: rect.right - rootLeft + root.scrollLeft,
          bottom: rect.bottom - rootTop + root.scrollTop
        };
      });

      const left = Math.min(...rects.map(rect => rect.left));
      const top = Math.min(...rects.map(rect => rect.top));
      const right = Math.max(...rects.map(rect => rect.right));
      const bottom = Math.max(...rects.map(rect => rect.bottom));

      return {
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
      };
    }

    function setVar(element, name, value) {
      if (value === null || value === undefined || value === "") return;
      element.style.setProperty(name, String(value));
    }

    function addClassNames(element, value) {
      if (!value) return;
      String(value).split(/\s+/).filter(Boolean).forEach(name => element.classList.add(name));
    }

    function addLine(rect, direction, effect, playOptions, duration) {
      const layer = document.createElement("div");
      layer.className = `sbs-sweep-line-layer is-${direction}`;
      layer.dataset.sbsSweepLineInstance = instanceId;
      layer.setAttribute("aria-hidden", "true");
      layer.style.left = `${rect.left}px`;
      layer.style.top = `${rect.top}px`;
      layer.style.width = `${rect.width}px`;
      layer.style.height = `${rect.height}px`;

      addClassNames(layer, effect.className);

      setVar(layer, "--sbs-sweep-line-duration", `${duration}ms`);
      setVar(layer, "--sbs-sweep-line-size", `${finiteNumber(effect.size, finiteNumber(playOptions.size, defaults.size))}px`);
      setVar(layer, "--sbs-sweep-line-length", effect.length || playOptions.length || defaults.length);
      setVar(layer, "--sbs-sweep-line-z", finiteNumber(effect.zIndex, finiteNumber(playOptions.zIndex, defaults.zIndex)));
      setVar(layer, "--sbs-sweep-line-color", effect.color || playOptions.color);
      setVar(layer, "--sbs-sweep-line-glow-1", effect.glow1 || playOptions.glow1);
      setVar(layer, "--sbs-sweep-line-glow-2", effect.glow2 || playOptions.glow2);
      setVar(layer, "--sbs-sweep-line-glow-3", effect.glow3 || playOptions.glow3);

      root.appendChild(layer);
      return layer;
    }

    async function play(effects, options) {
      if (destroyed) throw new Error("SlowlySweepLine: instance has been destroyed.");

      const items = (Array.isArray(effects) ? effects : [effects]).filter(Boolean);
      const playOptions = Object.assign({}, options || {});
      const interrupt = playOptions.interrupt === undefined
        ? defaults.interrupt
        : Boolean(playOptions.interrupt);

      if (interrupt) clear();
      const token = ++generation;

      const prepared = items.map(effect => ({
        effect,
        rect: getRect(effect.targets),
        directions: normalizeDirections(effect.direction || effect.directions || effect.axis)
      })).filter(item => item.rect && item.rect.width > 0 && item.rect.height > 0 && item.directions.length);

      if (!prepared.length) return { played: false, interrupted: false };

      const reduced = reducedMotion();
      let maxDuration = 0;

      for (const item of prepared) {
        const requested = Math.max(0, finiteNumber(item.effect.duration, finiteNumber(playOptions.duration, defaults.duration)));
        const duration = reduced ? 1 : requested;
        maxDuration = Math.max(maxDuration, duration);
        for (const direction of item.directions) {
          addLine(item.rect, direction, item.effect, playOptions, duration);
        }
      }

      if (maxDuration > 0) await wait(maxDuration);
      if (token !== generation) return { played: true, interrupted: true };

      root.querySelectorAll(`[data-sbs-sweep-line-instance="${instanceId}"]`)
        .forEach(element => element.remove());

      return { played: true, interrupted: false };
    }

    function destroy() {
      if (destroyed) return;
      clear();
      destroyed = true;
    }

    return Object.freeze({ play, clear, destroy });
  }

  global.SlowlySweepLine = Object.freeze({ version: "1.0.0", create });
})(window);
