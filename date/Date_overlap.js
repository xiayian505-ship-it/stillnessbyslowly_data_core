/*
 * Date Overlap v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用日期集合重疊比對核心。
 * - 不綁 UI
 * - 不綁儲存方式
 * - 不綁 Calendar Component
 * - 不驗證日期是否合法，只把日期當作可比較的 key
 *
 * 輸入格式：
 * [
 *   { id: "a", dates: ["2026-09-01", "2026-09-03"] },
 *   { id: "b", dates: ["2026-09-03", "2026-09-06"] }
 * ]
 *
 * 全域：
 * window.DateOverlap
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeKey(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];

    return items
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;

        const id = normalizeKey(item.id);
        if (!id) return null;

        const rawDates = Array.isArray(item.dates) ? item.dates : [];

        const seen = new Set();
        const dates = [];

        for (const rawDate of rawDates) {
          const key = normalizeKey(rawDate);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          dates.push(key);
        }

        return {
          id,
          dates,
          index
        };
      })
      .filter(Boolean);
  }

  function buildIndex(items) {
    const normalized = normalizeItems(items);
    const map = new Map();

    for (const item of normalized) {
      for (const date of item.dates) {
        if (!map.has(date)) {
          map.set(date, []);
        }

        map.get(date).push(item.id);
      }
    }

    return map;
  }

  function mapToArray(map) {
    return Array.from(map.entries()).map(([date, ids]) => ({
      date,
      ids: [...ids],
      count: ids.length
    }));
  }

  function byDate(items, options) {
    const opts = options || {};
    const sort = opts.sort !== false;

    const result = mapToArray(buildIndex(items));

    if (sort) {
      result.sort((a, b) =>
        String(a.date).localeCompare(String(b.date), undefined, {
          numeric: true,
          sensitivity: "base"
        })
      );
    }

    return result;
  }

  function getDate(items, date) {
    const key = normalizeKey(date);

    if (!key) {
      return {
        date: key,
        ids: [],
        count: 0
      };
    }

    const map = buildIndex(items);
    const ids = map.get(key) || [];

    return {
      date: key,
      ids: [...ids],
      count: ids.length
    };
  }

  function overlaps(items, options) {
    const opts = options || {};
    const rawMin = Number(opts.min);
    const min = Number.isFinite(rawMin) && rawMin >= 1
      ? Math.floor(rawMin)
      : 2;

    return byDate(items, { sort: opts.sort !== false })
      .filter(entry => entry.count >= min);
  }

  function max(items) {
    const all = byDate(items);

    if (!all.length) {
      return {
        count: 0,
        dates: []
      };
    }

    const maxCount = Math.max(...all.map(entry => entry.count));

    return {
      count: maxCount,
      dates: all.filter(entry => entry.count === maxCount)
    };
  }

  function stats(items, options) {
    const opts = options || {};
    const rawMin = Number(opts.min);
    const min = Number.isFinite(rawMin) && rawMin >= 1
      ? Math.floor(rawMin)
      : 2;

    const normalized = normalizeItems(items);
    const all = byDate(normalized);
    const overlapList = all.filter(entry => entry.count >= min);
    const maximum = max(normalized);

    return {
      itemCount: normalized.length,
      totalDates: all.length,
      overlapDates: overlapList.length,
      minOverlap: min,
      maxOverlap: maximum.count,
      maxOverlapDates: maximum.dates.map(entry => entry.date)
    };
  }

  function analyze(items, options) {
    const opts = options || {};
    const rawMin = Number(opts.min);
    const min = Number.isFinite(rawMin) && rawMin >= 1
      ? Math.floor(rawMin)
      : 2;

    const allDates = byDate(items, { sort: opts.sort !== false });
    const overlapDates = allDates.filter(entry => entry.count >= min);

    let maxCount = 0;
    for (const entry of allDates) {
      if (entry.count > maxCount) maxCount = entry.count;
    }

    const maxDates = allDates.filter(entry => entry.count === maxCount);

    return {
      allDates,
      overlaps: overlapDates,
      max: {
        count: maxCount,
        dates: maxDates
      },
      stats: {
        itemCount: normalizeItems(items).length,
        totalDates: allDates.length,
        overlapDates: overlapDates.length,
        minOverlap: min,
        maxOverlap: maxCount,
        maxOverlapDates: maxDates.map(entry => entry.date)
      }
    };
  }

  const DateOverlap = {
    version: VERSION,
    normalizeItems,
    buildIndex,
    byDate,
    getDate,
    overlaps,
    max,
    stats,
    analyze
  };

  global.DateOverlap = DateOverlap;

})(typeof window !== "undefined" ? window : globalThis);
