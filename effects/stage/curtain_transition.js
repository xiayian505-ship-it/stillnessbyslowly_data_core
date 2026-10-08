/* Slowly Curtain Transition v1.1.0
   Global: SlowlyCurtainTransition
   No dependencies.
*/
(function (global) {
  "use strict";

  const DEFAULTS = Object.freeze({
    duration: 1720,
    reducedMotion: "skip",
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

  function isElement(value) {
    return value instanceof Element;
  }

  function create(root, options) {
    if (!isElement(root)) {
      throw new TypeError("SlowlyCurtainTransition.create(root): root must be a DOM Element.");
    }

    const settings = Object.assign({}, DEFAULTS, options || {});
    const surface = settings.surface || root;
    if (!isElement(surface)) {
      throw new TypeError("SlowlyCurtainTransition.create(root): options.surface must be a DOM Element.");
    }

    const instanceId = `sbs-curtain-transition-${++instanceSeed}`;
    let generation = 0;
    let destroyed = false;

    root.classList.add("slowly-curtain-transition");
    root.dataset.sbsCurtainTransitionInstance = instanceId;
    surface.classList.add("slowly-curtain-transition-stage");

    function reducedMotion() {
      return Boolean(
        global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }

    function clearPageState(page) {
      if (!isElement(page)) return;
      page.classList.remove("sbs-curtain-transition-incoming", "sbs-curtain-transition-outgoing");
      page.style.removeProperty("--sbs-curtain-duration");
    }

    function clear() {
      generation += 1;
      root.classList.remove("is-playing");
      root.querySelectorAll(".sbs-curtain-transition-incoming, .sbs-curtain-transition-outgoing")
        .forEach(clearPageState);
    }

    async function play(playOptions) {
      if (destroyed) throw new Error("SlowlyCurtainTransition: instance has been destroyed.");

      const config = Object.assign({}, playOptions || {});
      const outgoing = config.outgoing;
      const incoming = config.incoming;

      if (!isElement(outgoing) || !isElement(incoming)) {
        throw new TypeError("SlowlyCurtainTransition.play(): outgoing and incoming must be DOM Elements.");
      }
      if (outgoing === incoming) return { played: false, interrupted: false, reducedMotion: false };

      const interrupt = config.interrupt === undefined
        ? Boolean(settings.interrupt)
        : Boolean(config.interrupt);

      if (root.classList.contains("is-playing") && !interrupt) {
        return { played: false, interrupted: true, reducedMotion: false };
      }
      if (interrupt) clear();

      const token = ++generation;
      const duration = Math.max(0, finiteNumber(config.duration, finiteNumber(settings.duration, DEFAULTS.duration)));
      const reduced = reducedMotion();

      if (reduced && (config.reducedMotion || settings.reducedMotion) === "skip") {
        return { played: false, interrupted: false, reducedMotion: true };
      }

      root.style.setProperty("--sbs-curtain-duration", `${duration}ms`);
      outgoing.style.setProperty("--sbs-curtain-duration", `${duration}ms`);
      incoming.style.setProperty("--sbs-curtain-duration", `${duration}ms`);

      outgoing.classList.add("sbs-curtain-transition-outgoing");
      incoming.classList.add("sbs-curtain-transition-incoming");
      root.classList.add("is-playing");

      if (typeof config.onStart === "function") config.onStart({ outgoing, incoming, duration });

      await wait(reduced ? 1 : duration + 20);
      if (token !== generation) {
        return { played: true, interrupted: true, reducedMotion: reduced };
      }

      root.classList.remove("is-playing");
      clearPageState(outgoing);
      clearPageState(incoming);

      if (typeof config.onFinish === "function") config.onFinish({ outgoing, incoming, duration });

      return { played: true, interrupted: false, reducedMotion: reduced };
    }

    function destroy() {
      if (destroyed) return;
      clear();
      root.classList.remove("slowly-curtain-transition");
      surface.classList.remove("slowly-curtain-transition-stage");
      root.style.removeProperty("--sbs-curtain-duration");
      if (root.dataset.sbsCurtainTransitionInstance === instanceId) {
        delete root.dataset.sbsCurtainTransitionInstance;
      }
      destroyed = true;
    }

    return Object.freeze({ play, clear, destroy });
  }

  global.SlowlyCurtainTransition = Object.freeze({
    version: "1.1.0",
    defaults: DEFAULTS,
    create
  });
})(window);
