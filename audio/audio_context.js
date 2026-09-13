/*
 * Audio Context v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * Web Audio 音訊環境管理。
 * - 不綁 UI
 * - 不建立音源
 * - 不處理音高、音量或音效語意
 *
 * 全域：
 * window.SlowlyAudioContext
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  let context = null;

  function getConstructor() {
    return global.AudioContext || global.webkitAudioContext || null;
  }

  function isSupported() {
    return !!getConstructor();
  }

  function create(options) {
    if (context && context.state !== "closed") return context;

    const AudioContextCtor = getConstructor();
    if (!AudioContextCtor) {
      throw new Error("Web Audio API is not supported");
    }

    context = new AudioContextCtor(options);
    return context;
  }

  function get() {
    return context;
  }

  async function resume() {
    const ctx = create();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }

  async function suspend() {
    if (!context || context.state === "closed") return context;
    if (context.state === "running") await context.suspend();
    return context;
  }

  async function close() {
    if (!context) return null;
    const ctx = context;
    if (ctx.state !== "closed") await ctx.close();
    context = null;
    return ctx;
  }

  function state() {
    return context ? context.state : "uninitialized";
  }

  function currentTime() {
    return context ? context.currentTime : 0;
  }

  const SlowlyAudioContext = {
    version: VERSION,
    isSupported,
    create,
    get,
    resume,
    suspend,
    close,
    state,
    currentTime
  };

  global.SlowlyAudioContext = SlowlyAudioContext;
})(typeof window !== "undefined" ? window : globalThis);
