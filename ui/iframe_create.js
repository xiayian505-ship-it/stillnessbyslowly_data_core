/* 慢慢的倉庫｜Iframe Create
 * 工作：只負責建立 iframe 元素。
 */
(function (global) {
  "use strict";

  function create(options = {}) {
    const iframe = document.createElement("iframe");

    if (options.id != null) {
      iframe.id = String(options.id);
    }

    if (options.className != null) {
      iframe.className = String(options.className);
    }

    if (options.title != null) {
      iframe.title = String(options.title);
    }

    return iframe;
  }

  global.SlowlyIframeCreate = {
    create
  };
})(window);
