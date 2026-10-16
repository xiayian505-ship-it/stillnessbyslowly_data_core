/**
 * Slowly Impact Slash v1.0.0
 * 慢慢軍火庫｜Effects / Line｜指定位置的斜向斬擊光線
 *
 * 職責：
 * - 在宿主提供的定位容器內，建立一條短暫的斜向發光線條。
 * - 可以指定目標元素，或使用容器內百分比座標定位。
 * - 動畫結束或手動 clear 時，只移除本零件建立的光線。
 *
 * 不負責：
 * - 傷害、碰撞、命中判定、聲音、震動、相機晃動或卡牌操作。
 * - 替宿主修改容器的 position、尺寸、背景或其他布局樣式。
 *
 * 需要同時引用 impact_slash.css。容器請由宿主設定 position: relative。
 * 全域 API：window.SlowlyImpactSlash
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_DURATION = 320;
  const activeSlashes = new WeakMap();

  function requireRoot(root) {
    if (!(root instanceof global.Element)) {
      throw new TypeError("SlowlyImpactSlash: root must be a DOM Element.");
    }
  }

  function finiteNumber(value, fallback, name) {
    if (value === undefined) {
      return fallback;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " must be a finite number.");
    }

    return value;
  }

  function nonNegativeDuration(value) {
    const duration = finiteNumber(value, DEFAULT_DURATION, "duration");

    if (duration < 0) {
      throw new RangeError("duration cannot be negative.");
    }

    return duration;
  }

  /** 接受像素數值或 CSS 長度字串；未指定就使用 CSS 的預設長度。 */
  function cssLength(value, name) {
    if (typeof value === "number") {
      if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(name + " must be a positive number.");
      }

      return value + "px";
    }

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    throw new TypeError(name + " must be a positive number or a CSS length string.");
  }

  function prefersReducedMotion() {
    return Boolean(
      typeof global.matchMedia === "function" &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /**
   * 優先使用目標元素的中心；沒有目標時，使用宿主給的百分比座標。
   * 位置相對於 root 的內側定位區域，並考慮容器本身的捲動距離。
   */
  function resolvePosition(root, options) {
    if (options.target !== undefined && options.target !== null) {
      if (!(options.target instanceof global.Element)) {
        throw new TypeError("target must be a DOM Element.");
      }

      if (options.target !== root && !root.contains(options.target)) {
        throw new RangeError("target must be inside the root element.");
      }

      const rootRect = root.getBoundingClientRect();
      const targetRect = options.target.getBoundingClientRect();

      return {
        left: targetRect.left - rootRect.left - root.clientLeft +
          root.scrollLeft + targetRect.width / 2 + "px",
        top: targetRect.top - rootRect.top - root.clientTop +
          root.scrollTop + targetRect.height / 2 + "px"
      };
    }

    const xPercent = finiteNumber(options.xPercent, 50, "xPercent");
    const yPercent = finiteNumber(options.yPercent, 50, "yPercent");

    return {
      left: xPercent + "%",
      top: yPercent + "%"
    };
  }

  function getActiveSet(root) {
    let activeSet = activeSlashes.get(root);

    if (!activeSet) {
      activeSet = new Set();
      activeSlashes.set(root, activeSet);
    }

    return activeSet;
  }

  /**
   * 只停止指定 root 由本零件建立的斬擊動畫。
   * @returns {number} 被清除的動畫數量。
   */
  function clear(root) {
    requireRoot(root);

    const activeSet = activeSlashes.get(root);
    if (!activeSet) {
      return 0;
    }

    const pending = Array.from(activeSet);
    pending.forEach(function (finishAnimation) {
      finishAnimation(true);
    });

    return pending.length;
  }

  /**
   * @param {Element} root 由宿主定位的容器。
   * @param {Object} options 視覺參數，所有卡牌或戰鬥語意由宿主決定。
   * @returns {Promise<{played:boolean, interrupted:boolean, reason?:string}>}
   */
  function play(root, options = {}) {
    requireRoot(root);

    // 在建 DOM 前完成檢查，避免參數錯誤留下半完成的動畫。
    const duration = nonNegativeDuration(options.duration);
    const position = resolvePosition(root, options);
    const angle = finiteNumber(options.angle, -39, "angle");
    const zIndex = finiteNumber(options.zIndex, 5, "zIndex");
    const thickness = options.thickness === undefined
      ? "3px"
      : cssLength(options.thickness, "thickness");
    const length = options.length === undefined
      ? "clamp(72px, 27%, 168px)"
      : cssLength(options.length, "length");

    if (options.interrupt === true) {
      clear(root);
    }

    if (options.respectReducedMotion !== false && prefersReducedMotion()) {
      return Promise.resolve({
        played: false,
        interrupted: false,
        reason: "reduced_motion"
      });
    }

    const slashElement = global.document.createElement("span");
    slashElement.className = "sbs-impact-slash";
    slashElement.setAttribute("aria-hidden", "true");
    slashElement.style.left = position.left;
    slashElement.style.top = position.top;
    slashElement.style.setProperty("--sbs-impact-slash-duration", duration + "ms");
    slashElement.style.setProperty("--sbs-impact-slash-angle", angle + "deg");
    slashElement.style.setProperty("--sbs-impact-slash-length", length);
    slashElement.style.setProperty("--sbs-impact-slash-thickness", thickness);
    slashElement.style.setProperty("--sbs-impact-slash-z", String(zIndex));

    if (options.color !== undefined) {
      slashElement.style.setProperty("--sbs-impact-slash-color", String(options.color));
    }

    if (options.glow !== undefined) {
      slashElement.style.setProperty("--sbs-impact-slash-glow", String(options.glow));
    }

    const activeSet = getActiveSet(root);

    return new Promise(function (resolve) {
      let completed = false;
      let fallbackTimer = null;

      function finish(interrupted) {
        if (completed) {
          return;
        }

        completed = true;
        global.clearTimeout(fallbackTimer);
        slashElement.removeEventListener("animationend", handleAnimationEnd);
        slashElement.remove();
        activeSet.delete(finish);

        if (activeSet.size === 0) {
          activeSlashes.delete(root);
        }

        resolve({ played: true, interrupted: Boolean(interrupted) });
      }

      function handleAnimationEnd(event) {
        if (event.target === slashElement) {
          finish(false);
        }
      }

      activeSet.add(finish);
      slashElement.addEventListener("animationend", handleAnimationEnd);
      root.appendChild(slashElement);

      // CSS 沒載入、頁面被切走等情況下，仍保證光線能被移除。
      fallbackTimer = global.setTimeout(function () {
        finish(false);
      }, duration + 100);
    });
  }

  global.SlowlyImpactSlash = Object.freeze({
    version: VERSION,
    play,
    clear
  });
})(window);
