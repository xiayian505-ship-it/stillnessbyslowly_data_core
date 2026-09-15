/* 慢慢的倉庫｜Audio / Tempo｜Beat Time v1.0.0
   BPM、拍數與秒數的純換算核心。
   不綁 AudioContext、不負責排程、不建立 Timer。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function positive(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
      throw new RangeError(name + " must be > 0.");
    }

    return number;
  }

  function finite(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(name + " must be a finite number.");
    }

    return number;
  }

  function secondsPerBeat(bpm) {
    return 60 / positive(bpm, "bpm");
  }

  function beatsToSeconds(beats, bpm) {
    return finite(beats, "beats") * secondsPerBeat(bpm);
  }

  function secondsToBeats(seconds, bpm) {
    return finite(seconds, "seconds") / secondsPerBeat(bpm);
  }

  global.BeatTime = Object.freeze({
    version: VERSION,
    secondsPerBeat,
    beatsToSeconds,
    secondsToBeats
  });

})(typeof window !== "undefined" ? window : globalThis);
