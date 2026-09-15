/* 慢慢的倉庫｜Date｜Upcoming Window v1.0.0
   判斷日期／時間是否已進入指定的「未來提前區間」。
   可用於開委、截稿、活動、付款期限等即將到來事件。
   不綁通知方式、不綁 DOM、不處理排程、儲存或業務狀態。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function toTime(value) {
    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isNaN(time) ? null : time;
    }

    if (value === null || value === undefined || value === "") {
      return null;
    }

    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }

  function normalizeWindowMs(windowMs) {
    const value = Number(windowMs);

    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError("windowMs must be a finite number greater than or equal to 0.");
    }

    return value;
  }

  function resolveNow(now) {
    const time = toTime(now === undefined ? new Date() : now);

    if (time === null) {
      throw new TypeError("now must be a valid date value.");
    }

    return time;
  }

  function isUpcoming(value, windowMs, now) {
    const target = toTime(value);
    if (target === null) return false;

    const current = resolveNow(now);
    const window = normalizeWindowMs(windowMs);
    const remaining = target - current;

    return remaining > 0 && remaining <= window;
  }

  function remainingMs(value, now) {
    const target = toTime(value);
    if (target === null) return null;

    return target - resolveNow(now);
  }

  function filter(items, getDate, windowMs, now) {
    if (!Array.isArray(items)) {
      throw new TypeError("items must be an array.");
    }

    const resolver =
      typeof getDate === "function"
        ? getDate
        : function (item) { return item; };

    const current = resolveNow(now);
    const window = normalizeWindowMs(windowMs);

    return items.filter(function (item, index) {
      const target = toTime(resolver(item, index, items));
      if (target === null) return false;

      const remaining = target - current;
      return remaining > 0 && remaining <= window;
    });
  }

  global.UpcomingWindow = Object.freeze({
    version: VERSION,
    isUpcoming,
    remainingMs,
    filter
  });

})(typeof window !== "undefined" ? window : globalThis);
