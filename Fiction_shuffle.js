/*!
 * Fiction_shuffle.js
 * stillness by slowly
 *
 * 從 Fiction_data.js 拆出的獨立隨機排序功能。
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [
        result[j],
        result[i]
      ];
    }

    return result;
  }

  const FictionShuffle = Object.freeze({
    version: VERSION,
    shuffle
  });

  Object.defineProperty(global, "FictionShuffle", {
    value: FictionShuffle,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);
