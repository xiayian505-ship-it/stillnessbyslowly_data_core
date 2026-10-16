/* =========================================================
   慢慢軍火庫｜Element Flight v1.0.0

   用途：複製來源元素的視覺快照，飛向指定目標位置。
   - 只移動視覺副本，來源元素與目標元素不被移動。
   - 使用 Web Animations API，完成、取消都清除副本。
   - 尊重 prefers-reduced-motion，允許 AbortSignal 中止。

   不負責：
   - 卡牌出牌、傷害、命中閃光、聲音或其他業務事件。
   - 建立戰鬥舞台、角色位置或強制任何卡面樣式。
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const COPY_CLASS_NAME = "slowly-element-flight-copy";

  function resolveElement(target, parameterName) {
    const element = typeof target === "string"
      ? document.querySelector(target)
      : target;
    if (!(element instanceof global.Element)) {
      throw new Error(`ElementFlight 找不到 ${parameterName} 元素。`);
    }
    return element;
  }

  function readFiniteNumber(value, fallback, name, minimum, maximum) {
    const number = value === undefined ? fallback : value;
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
      throw new RangeError(`ElementFlight 的 ${name} 必須介於 ${minimum} 與 ${maximum}。`);
    }
    return number;
  }

  function cleanVisualCopy(copy) {
    // 副本只做畫面效果；移除重複 ID，避免影響文件查找與 label 對應。
    [copy, ...copy.querySelectorAll("[id]")].forEach(element => {
      element.removeAttribute("id");
    });
    copy.removeAttribute("data-act");
    copy.setAttribute("aria-hidden", "true");
    copy.setAttribute("inert", "");
    copy.setAttribute("tabindex", "-1");

    // 即使老瀏覽器不支援 inert，副本中的互動元素也不進入 Tab 流程。
    copy.querySelectorAll("a, button, input, select, textarea, [tabindex]")
      .forEach(element => element.setAttribute("tabindex", "-1"));
  }

  async function play(options = {}) {
    const source = resolveElement(options.source, "source");
    const target = resolveElement(options.target, "target");
    const duration = readFiniteNumber(options.duration, 470, "duration", 0, 60000);
    const arcHeight = readFiniteNumber(options.arcHeight, 35, "arcHeight", -1000, 1000);
    const endScale = readFiniteNumber(options.endScale, 0.25, "endScale", 0, 5);
    const rotation = readFiniteNumber(options.rotation, 9, "rotation", -360, 360);
    const signal = options.signal;

    if (signal !== undefined && !(signal instanceof global.AbortSignal)) {
      throw new TypeError("ElementFlight 的 signal 必須是 AbortSignal。");
    }
    if (signal?.aborted) {
      return { status: "cancelled" };
    }

    // 減少動態效果的使用者不播放飛行，也不等待動畫時間。
    if (duration === 0 || global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      return { status: "skipped", reason: "reduced_motion_or_zero_duration" };
    }

    const sourceBounds = source.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    if (!sourceBounds.width || !sourceBounds.height ||
        !targetBounds.width || !targetBounds.height) {
      return { status: "skipped", reason: "missing_geometry" };
    }

    // 動畫完全依幾何位置計算；不判斷任何「敵方、我方或卡牌類型」。
    const sourceCenterX = sourceBounds.left + sourceBounds.width / 2;
    const sourceCenterY = sourceBounds.top + sourceBounds.height / 2;
    const targetCenterX = targetBounds.left + targetBounds.width / 2;
    const targetCenterY = targetBounds.top + targetBounds.height / 2;
    const travelX = targetCenterX - sourceCenterX;
    const travelY = targetCenterY - sourceCenterY;

    const copy = source.cloneNode(true);
    cleanVisualCopy(copy);
    copy.classList.add(COPY_CLASS_NAME);
    copy.style.setProperty("left", `${sourceBounds.left}px`);
    copy.style.setProperty("top", `${sourceBounds.top}px`);
    copy.style.setProperty("width", `${sourceBounds.width}px`);
    copy.style.setProperty("height", `${sourceBounds.height}px`);
    copy.style.setProperty("transform", "none");
    document.body.appendChild(copy);

    if (typeof copy.animate !== "function") {
      copy.remove();
      return { status: "skipped", reason: "animation_unsupported" };
    }

    const animationFrames = [
      {
        transform: "translate(0px, 0px) rotate(0deg) scale(1)",
        opacity: 1,
        offset: 0
      },
      {
        transform: `translate(${travelX * 0.5}px, ${travelY * 0.5 - arcHeight}px) rotate(${-rotation * 0.5}deg) scale(${(1 + endScale) / 2})`,
        opacity: 1,
        offset: 0.55
      },
      {
        transform: `translate(${travelX}px, ${travelY}px) rotate(${rotation}deg) scale(${endScale})`,
        opacity: 0,
        offset: 1
      }
    ];

    let animation = null;
    function onAbort() {
      animation?.cancel();
    }

    try {
      // 支援在動畫進行中由宿主取消，並確保動畫結束後不遺留 DOM。
      animation = copy.animate(animationFrames, {
        duration,
        easing: "cubic-bezier(0.22, 0.67, 0.3, 1)",
        fill: "forwards"
      });
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        animation.cancel();
      }
      await animation.finished;
      return { status: "finished" };
    } catch (error) {
      if (signal?.aborted || animation?.playState === "idle") {
        return { status: "cancelled" };
      }
      throw error;
    } finally {
      signal?.removeEventListener("abort", onAbort);
      animation?.cancel();
      copy.remove();
    }
  }

  global.SlowlyElementFlight = Object.freeze({ VERSION, play });
})(window);
