/*
 * Navigation v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用頁面跳轉核心。
 * - 包裝瀏覽器 location / history 的常用跳轉行為
 * - 不綁 UI
 * - 不綁 Router / SPA
 * - 不綁章節、場景或遊戲流程
 * - 不處理 query / hash 組裝，請交給同組模組
 *
 * 全域：
 * window.SlowlyNavigation
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function hasLocation() {
    return !!(global && global.location);
  }

  function hasHistory() {
    return !!(global && global.history);
  }

  function requireLocation() {
    if (!hasLocation()) {
      throw new Error("SlowlyNavigation requires window.location.");
    }
    return global.location;
  }

  function normalizeUrl(url) {
    if (url === null || url === undefined) {
      throw new TypeError("SlowlyNavigation url is required.");
    }

    const value = String(url).trim();
    if (!value) {
      throw new TypeError("SlowlyNavigation url cannot be empty.");
    }

    return value;
  }

  function normalizeSteps(steps) {
    const value = Number(steps);
    if (!Number.isFinite(value)) return 1;

    const integer = Math.trunc(Math.abs(value));
    return integer >= 1 ? integer : 1;
  }

  function go(url) {
    const location = requireLocation();
    const target = normalizeUrl(url);
    location.assign(target);
  }

  function replace(url) {
    const location = requireLocation();
    const target = normalizeUrl(url);
    location.replace(target);
  }

  function back(steps) {
    const count = normalizeSteps(steps);

    if (hasHistory() && typeof global.history.go === "function") {
      global.history.go(-count);
      return;
    }

    if (count === 1 && hasHistory() && typeof global.history.back === "function") {
      global.history.back();
      return;
    }

    throw new Error("SlowlyNavigation history is unavailable.");
  }

  function forward(steps) {
    const count = normalizeSteps(steps);

    if (hasHistory() && typeof global.history.go === "function") {
      global.history.go(count);
      return;
    }

    if (count === 1 && hasHistory() && typeof global.history.forward === "function") {
      global.history.forward();
      return;
    }

    throw new Error("SlowlyNavigation history is unavailable.");
  }

  function reload() {
    const location = requireLocation();
    location.reload();
  }

  function current() {
    const location = requireLocation();
    return location.href;
  }

  const SlowlyNavigation = {
    version: VERSION,
    go,
    replace,
    back,
    forward,
    reload,
    current
  };

  global.SlowlyNavigation = SlowlyNavigation;

})(typeof window !== "undefined" ? window : globalThis);
