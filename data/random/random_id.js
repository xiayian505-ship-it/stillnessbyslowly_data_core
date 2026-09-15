/* 慢慢的倉庫｜Data / Random｜Random ID v1.0.0
   通用唯一識別字串產生器。
   優先使用 crypto.randomUUID()，否則退回時間戳＋隨機片段。
   不保存狀態、不綁 Fiction、不依賴 SlowlyRandom。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function create(options = {}) {
    const prefix = String(options.prefix ?? "");
    const cryptoObject = options.crypto ?? global.crypto;
    const now =
      typeof options.now === "function"
        ? options.now
        : Date.now;

    const random =
      typeof options.random === "function"
        ? options.random
        : Math.random;

    let id;

    if (
      cryptoObject &&
      typeof cryptoObject.randomUUID === "function"
    ) {
      id = cryptoObject.randomUUID();
    } else {
      const timePart = Number(now()).toString(36);
      const randomPart = random()
        .toString(36)
        .slice(2, 10);

      id = timePart + "-" + randomPart;
    }

    return prefix + id;
  }

  global.RandomId = Object.freeze({
    version: VERSION,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
