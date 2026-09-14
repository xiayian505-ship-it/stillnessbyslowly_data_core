/* 慢慢的倉庫｜Iframe Source
 * 工作：只負責讀取、設定與清除 iframe 的 src。
 */
(function (global) {
  "use strict";

  function resolveTarget(target) {
    if (typeof target === "string") {
      return document.querySelector(target);
    }

    if (target instanceof HTMLIFrameElement) {
      return target;
    }

    return null;
  }

  function requireIframe(target) {
    const iframe = resolveTarget(target);

    if (!iframe) {
      throw new Error("SlowlyIframeSource 找不到 iframe 目標。");
    }

    return iframe;
  }

  const SlowlyIframeSource = {
    get(target) {
      return requireIframe(target).getAttribute("src") || "";
    },

    set(target, url) {
      const iframe = requireIframe(target);
      iframe.src = String(url ?? "");
      return iframe;
    },

    clear(target) {
      const iframe = requireIframe(target);
      iframe.removeAttribute("src");
      return iframe;
    }
  };

  global.SlowlyIframeSource = SlowlyIframeSource;
})(window);
