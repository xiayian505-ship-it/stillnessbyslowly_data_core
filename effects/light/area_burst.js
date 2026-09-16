/* Slowly Area Burst v1.0.0
   Global: SlowlyAreaBurst
   No dependencies.
*/
(function (global) {
  "use strict";

  const DEFAULTS = Object.freeze({
    duration: 220,
    reducedMotionDuration: 120,
    zIndex: 6,
    interrupt: true,
    type: "block"
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

  function normalizeType(value, fallback) {
    const type = value || fallback;
    return type === "radial" ? "radial" : "block";
  }

  function create(root, options) {
    if (!(root instanceof Element)) {
      throw new TypeError("SlowlyAreaBurst.create(root): root must be a DOM Element.");
    }

    const defaults = Object.assign({}, DEFAULTS, options || {});
    const instanceId = `sbs-area-burst-${++instanceSeed}`;
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
      root.querySelectorAll(`[data-sbs-area-burst-instance="${instanceId}"]`)
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

    function addBurst(rect, effect, playOptions, duration) {
      const type = normalizeType(effect.type, normalizeType(playOptions.type, defaults.type));
      const layer = document.createElement("div");
      layer.className = `sbs-area-burst-layer is-${type}`;
      layer.dataset.sbsAreaBurstInstance = instanceId;
      layer.setAttribute("aria-hidden", "true");
      layer.style.left = `${rect.left}px`;
      layer.style.top = `${rect.top}px`;
      layer.style.width = `${rect.width}px`;
      layer.style.height = `${rect.height}px`;

      addClassNames(layer, effect.className);

      setVar(layer, "--sbs-area-burst-duration", `${duration}ms`);
      setVar(layer, "--sbs-area-burst-z", finiteNumber(effect.zIndex, finiteNumber(playOptions.zIndex, defaults.zIndex)));
      setVar(layer, "--sbs-area-burst-fill", effect.fill || playOptions.fill);
      setVar(layer, "--sbs-area-burst-border", effect.border || playOptions.border);
      setVar(layer, "--sbs-area-burst-glow", effect.glow || playOptions.glow);
      setVar(layer, "--sbs-area-burst-inner-glow", effect.innerGlow || playOptions.innerGlow);
      setVar(layer, "--sbs-area-burst-blend", effect.blendMode || playOptions.blendMode);
      setVar(layer, "--sbs-area-burst-radial-core", effect.radialCore || playOptions.radialCore);
      setVar(layer, "--sbs-area-burst-radial-mid", effect.radialMid || playOptions.radialMid);
      setVar(layer, "--sbs-area-burst-radial-soft", effect.radialSoft || playOptions.radialSoft);

      root.appendChild(layer);
      return layer;
    }

    async function play(effects, options) {
      if (destroyed) throw new Error("SlowlyAreaBurst: instance has been destroyed.");

      const items = (Array.isArray(effects) ? effects : [effects]).filter(Boolean);
      const playOptions = Object.assign({}, options || {});
      const interrupt = playOptions.interrupt === undefined
        ? defaults.interrupt
        : Boolean(playOptions.interrupt);

      if (interrupt) clear();
      const token = ++generation;

      const prepared = items.map(effect => ({
        effect,
        rect: getRect(effect.targets)
      })).filter(item => item.rect && item.rect.width > 0 && item.rect.height > 0);

      if (!prepared.length) return { played: false, interrupted: false };

      const reduced = reducedMotion();
      let maxDuration = 0;

      for (const item of prepared) {
        const requested = Math.max(0, finiteNumber(item.effect.duration, finiteNumber(playOptions.duration, defaults.duration)));
        const duration = reduced
          ? Math.min(requested || defaults.reducedMotionDuration, defaults.reducedMotionDuration)
          : requested;
        maxDuration = Math.max(maxDuration, duration);
        addBurst(item.rect, item.effect, playOptions, duration);
      }

      if (maxDuration > 0) await wait(maxDuration);
      if (token !== generation) return { played: true, interrupted: true };

      root.querySelectorAll(`[data-sbs-area-burst-instance="${instanceId}"]`)
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

  global.SlowlyAreaBurst = Object.freeze({ version: "1.0.0", create });
})(window);
