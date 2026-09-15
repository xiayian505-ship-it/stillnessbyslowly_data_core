"use strict";

/* =========================================================
   慢慢的倉庫｜Web Share v1.0.0

   用途：
   - 封裝瀏覽器 Web Share API
   - 判斷裝置是否支援系統分享
   - 判斷指定分享資料是否可分享
   - 執行分享並區分成功、取消、不支援與失敗

   不負責：
   - 不組作品／商品等業務資料
   - 不產生分享網址
   - 不做 Clipboard fallback
   - 不顯示 Toast / Alert / Modal
   - 不綁定 DOM 或按鈕
   ========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function getNavigator() {
    return typeof navigator !== "undefined" ? navigator : null;
  }

  function isSupported() {
    const nav = getNavigator();
    return Boolean(nav && typeof nav.share === "function");
  }

  function canShare(data) {
    const nav = getNavigator();

    if (!nav || typeof nav.share !== "function") return false;
    if (!data || typeof data !== "object") return false;

    if (typeof nav.canShare !== "function") return true;

    try {
      return nav.canShare(data);
    } catch (_) {
      return false;
    }
  }

  async function share(data) {
    const nav = getNavigator();

    if (!nav || typeof nav.share !== "function") {
      return { ok: false, reason: "unsupported" };
    }

    if (!data || typeof data !== "object") {
      return { ok: false, reason: "invalid-data" };
    }

    if (typeof nav.canShare === "function") {
      try {
        if (!nav.canShare(data)) {
          return { ok: false, reason: "unsupported-data" };
        }
      } catch (error) {
        return { ok: false, reason: "unsupported-data", error };
      }
    }

    try {
      await nav.share(data);
      return { ok: true, reason: "shared" };
    } catch (error) {
      if (error && error.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }

      return { ok: false, reason: "failed", error };
    }
  }

  global.SlowlyWebShare = Object.freeze({
    version: VERSION,
    isSupported,
    canShare,
    share
  });
})(typeof window !== "undefined" ? window : globalThis);
