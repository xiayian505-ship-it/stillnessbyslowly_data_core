/*!
 * Fiction_paginate.js
 * stillness by slowly
 *
 * 從 Fiction_data.js 拆出的獨立分頁功能。
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function paginate(items, options = {}) {
    const pageSize = Math.max(
      1,
      Number(options.pageSize) || 12
    );

    const totalItems = items.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / pageSize)
    );

    const requestedPage =
      Number(options.page) || 1;

    const page = Math.min(
      Math.max(1, requestedPage),
      totalPages
    );

    const startIndex = (page - 1) * pageSize;
    const data = items.slice(
      startIndex,
      startIndex + pageSize
    );

    return {
      data,
      page,
      pageSize,
      totalItems,
      totalPages,
      startIndex,
      endIndex:
        data.length > 0
          ? startIndex + data.length - 1
          : startIndex,
      hasPrevious: page > 1,
      hasNext: page < totalPages
    };
  }

  const FictionPaginate = Object.freeze({
    version: VERSION,
    paginate
  });

  Object.defineProperty(global, "FictionPaginate", {
    value: FictionPaginate,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);
