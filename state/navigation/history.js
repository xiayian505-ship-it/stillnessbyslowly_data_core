/*
 * Navigation History v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用瀏覽紀錄操作核心。
 * - 包裝原生 history API
 * - 提供 pushState / replaceState / go / back / forward
 * - 不綁 UI
 * - 不綁 Router / SPA
 * - 不自行監聽 popstate
 *
 * 全域：
 * window.SlowlyNavigationHistory
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function requireHistory() {
    if (!global || !global.history) {
      throw new Error("SlowlyNavigationHistory requires window.history.");
    }
    return global.history;
  }

  function normalizeUrl(url) {
    if (url === undefined) return undefined;
    if (url === null) return null;

    const value = String(url).trim();
    if (!value) return null;
    return value;
  }

  function push(state, url) {
    const history = requireHistory();
    history.pushState(state ?? null, "", normalizeUrl(url));
  }

  function replace(state, url) {
    const history = requireHistory();
    history.replaceState(state ?? null, "", normalizeUrl(url));
  }

  function go(delta) {
    const history = requireHistory();
    const value = Number(delta);

    if (!Number.isFinite(value)) {
      throw new TypeError("SlowlyNavigationHistory delta must be a finite number.");
    }

    history.go(Math.trunc(value));
  }

  function back() {
    requireHistory().back();
  }

  function forward() {
    requireHistory().forward();
  }

  function state() {
    return requireHistory().state;
  }

  function length() {
    return requireHistory().length;
  }

  const SlowlyNavigationHistory = {
    version: VERSION,
    push,
    replace,
    go,
    back,
    forward,
    state,
    length
  };

  global.SlowlyNavigationHistory = SlowlyNavigationHistory;

})(typeof window !== "undefined" ? window : globalThis);
