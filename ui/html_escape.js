"use strict";

/* =========================================================
   慢慢的倉庫｜HTML Escape v1.0.0

   將一般文字轉成可安全放入 HTML 字串的內容。

   API：
   - HtmlEscape.escape(value)

   轉換：
   - &  → &amp;
   - <  → &lt;
   - >  → &gt;
   - "  → &quot;
   - '  → &#039;

   不負責：
   - HTML 清洗 / sanitizer
   - 允許部分 HTML 標籤
   - DOM 建立
   - UI 樣式
========================================================= */

(function(global){
  "use strict";

  const VERSION = "1.0.0";

  const ESCAPE_MAP = Object.freeze({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  });

  function escape(value){
    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ESCAPE_MAP[char]
    );
  }

  global.HtmlEscape = Object.freeze({
    version: VERSION,
    escape
  });
})(window);
