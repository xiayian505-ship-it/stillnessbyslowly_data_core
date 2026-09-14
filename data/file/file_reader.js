/* Slowly Library | File Reader
 * 通用 File / Blob 讀取核心。
 * 只負責將 File / Blob 讀為 text、ArrayBuffer 或 Data URL；
 * 不負責檔案選擇、解析內容、DOM、預覽、下載或儲存。
 */
(function (global) {
  "use strict";

  function ensureBlob(value) {
    if (!(value instanceof Blob)) {
      throw new TypeError("輸入必須是 File 或 Blob。");
    }
  }

  function readWithFileReader(blob, mode, encoding) {
    ensureBlob(blob);

    return new Promise(function (resolve, reject) {
      const reader = new FileReader();

      reader.onload = function () {
        resolve(reader.result);
      };

      reader.onerror = function () {
        reject(reader.error || new Error("檔案讀取失敗。"));
      };

      reader.onabort = function () {
        reject(new DOMException("檔案讀取已取消。", "AbortError"));
      };

      if (mode === "text") {
        reader.readAsText(blob, encoding);
        return;
      }

      if (mode === "arrayBuffer") {
        reader.readAsArrayBuffer(blob);
        return;
      }

      if (mode === "dataURL") {
        reader.readAsDataURL(blob);
        return;
      }

      reject(new TypeError("不支援的讀取模式。"));
    });
  }

  function text(blob, encoding) {
    return readWithFileReader(blob, "text", encoding);
  }

  function arrayBuffer(blob) {
    return readWithFileReader(blob, "arrayBuffer");
  }

  function dataURL(blob) {
    return readWithFileReader(blob, "dataURL");
  }

  async function read(blob, options) {
    const settings = options || {};
    const mode = settings.mode || "text";

    if (mode === "text") {
      return text(blob, settings.encoding);
    }

    if (mode === "arrayBuffer") {
      return arrayBuffer(blob);
    }

    if (mode === "dataURL") {
      return dataURL(blob);
    }

    throw new TypeError('mode 必須是 "text"、"arrayBuffer" 或 "dataURL"。');
  }

  global.SlowlyFileReader = Object.freeze({
    read,
    text,
    arrayBuffer,
    dataURL
  });
})(window);
