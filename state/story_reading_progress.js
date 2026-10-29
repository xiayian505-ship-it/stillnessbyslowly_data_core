/* 慢慢軍火庫｜Story Reading Progress 1.0.0
 * 閱讀、完成及書籤狀態；持久化由宿主負責，不寫固定儲存 Key。
 */
(function (global) {
  "use strict";
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function idOf(value) {
    if (typeof value !== "string" || !value.trim()) throw new TypeError("contentId must be nonempty string");
    return value;
  }
  function parseData(input) {
    if (!input || Array.isArray(input) || typeof input !== "object") throw new TypeError("Invalid progress data");
    if (!Array.isArray(input.seenIds) || !Array.isArray(input.completedIds)) {
      throw new TypeError("seenIds and completedIds must be arrays");
    }
    const seenIds = new Set(input.seenIds.map(idOf));
    const completedIds = new Set(input.completedIds.map(idOf));
    for (const id of completedIds) seenIds.add(id);
    let bookmark = null;
    if (input.bookmark !== undefined && input.bookmark !== null) {
      const source = input.bookmark;
      if (!source || Array.isArray(source) || typeof source !== "object") throw new TypeError("Invalid bookmark");
      idOf(source.contentId);
      if ((source.eventId === undefined || source.eventId === null) &&
          (source.eventIndex === undefined || source.eventIndex === null)) {
        throw new TypeError("Bookmark needs an eventId or eventIndex");
      }
      if (source.eventId !== undefined && source.eventId !== null &&
          (typeof source.eventId !== "string" || !source.eventId)) throw new TypeError("Invalid bookmark eventId");
      if (source.eventIndex !== undefined && source.eventIndex !== null &&
          (!Number.isInteger(source.eventIndex) || source.eventIndex < 0)) throw new RangeError("Invalid bookmark index");
      bookmark = copy(source);
    }
    return { seenIds, completedIds, bookmark };
  }
  function create(initialData) {
    let seenIds = new Set();
    let completedIds = new Set();
    let bookmark = null;
    function snapshot() {
      return { seenIds: [...seenIds], completedIds: [...completedIds], bookmark: bookmark ? copy(bookmark) : null };
    }
    function restore(data) {
      const parsed = parseData(data);
      seenIds = parsed.seenIds;
      completedIds = parsed.completedIds;
      bookmark = parsed.bookmark;
      return snapshot();
    }
    function markSeen(contentId) { seenIds.add(idOf(contentId)); return getStatus(contentId); }
    function markCompleted(contentId) {
      seenIds.add(idOf(contentId));
      completedIds.add(contentId);
      return getStatus(contentId);
    }
    function getStatus(contentId) {
      idOf(contentId);
      return { seen: seenIds.has(contentId), completed: completedIds.has(contentId) };
    }
    function setBookmark(contentId, position) {
      idOf(contentId);
      const candidate = parseData({ seenIds: [], completedIds: [], bookmark: { ...position, contentId } });
      bookmark = candidate.bookmark;
      return getBookmark();
    }
    function getBookmark() { return bookmark ? copy(bookmark) : null; }
    function clearBookmark(contentId) {
      if (contentId === undefined || bookmark?.contentId === idOf(contentId)) bookmark = null;
      return getBookmark();
    }
    function skip(contentId) { markSeen(contentId); clearBookmark(contentId); return getStatus(contentId); }
    function finish(contentId) { markCompleted(contentId); clearBookmark(contentId); return getStatus(contentId); }
    function reset(contentId) {
      idOf(contentId);
      seenIds.delete(contentId);
      completedIds.delete(contentId);
      clearBookmark(contentId);
      return snapshot();
    }
    function clear() { seenIds.clear(); completedIds.clear(); bookmark = null; return snapshot(); }
    // 根據事件 ID 優先、索引其次恢復；無效位置採顯式失敗，不代替使用者讀取其他事件。
    function resolveBookmark(events) {
      if (!Array.isArray(events)) throw new TypeError("events must be an array");
      if (!bookmark) return { found: false, index: null, reason: "empty" };
      if (bookmark.eventId !== undefined && bookmark.eventId !== null) {
        const index = events.findIndex(event => event?.id === bookmark.eventId);
        if (index >= 0) return { found: true, index, reason: "id" };
        return { found: false, index: null, reason: "missing-id" };
      }
      if (bookmark.eventIndex < events.length) return { found: true, index: bookmark.eventIndex, reason: "index" };
      return { found: false, index: null, reason: "missing-index" };
    }
    if (initialData !== undefined) restore(initialData);
    return Object.freeze({ markSeen, markCompleted, getStatus, setBookmark, getBookmark,
      clearBookmark, skip, finish, snapshot, restore, resolveBookmark, reset, clear });
  }
  global.SlowlyStoryReadingProgress = Object.freeze({ create, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
