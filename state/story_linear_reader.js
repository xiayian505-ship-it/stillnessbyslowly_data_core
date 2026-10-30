/* 慢慢軍火庫｜Linear Story Reader 1.1.0
 * 串接既有 Story Manifest Loader、Story Event Player、Story Reading Progress，
 * 提供非互動故事逐格閱讀、跨小節、書籤恢復與完讀狀態。
 *
 * 這裡不載入 DOM、不保存 localStorage、不拆分小說段落，也不執行分支事件。
 * 所有事件文字、閱讀按鈕、持久化及樣式均由宿主處理。
 */
(function (global) {
  "use strict";

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function create(options = {}) {
    const { loader, player, progress } = options;
    if (!loader || typeof loader.loadManifest !== "function" || typeof loader.loadSection !== "function") {
      throw new TypeError("loader must be a Story Manifest Loader instance");
    }
    if (!player || typeof player.load !== "function" || typeof player.start !== "function" ||
        typeof player.advance !== "function" || typeof player.seekByIndex !== "function" ||
        typeof player.snapshot !== "function" || typeof player.current !== "function" ||
        typeof player.reset !== "function") {
      throw new TypeError("player must be a Story Event Player instance");
    }
    if (!progress || typeof progress.getBookmark !== "function" ||
        typeof progress.resolveBookmark !== "function" || typeof progress.setBookmark !== "function" ||
        typeof progress.getStatus !== "function" || typeof progress.markSeen !== "function" ||
        typeof progress.finish !== "function" || typeof progress.snapshot !== "function" ||
        typeof progress.clearBookmark !== "function") {
      throw new TypeError("progress must be a Story Reading Progress instance");
    }

    let sections = [];
    let activeSectionIndex = -1;
    let activeEvents = [];
    let state = "idle";
    let busy = false;
    let errorMessage = null;
    let recovery = null;
    const listeners = new Set();

    function getView() {
      const section = sections[activeSectionIndex] || null;
      const event = state === "reading" ? player.current() : null;
      const currentIndex = event ? player.snapshot().index : -1;

      return copy({
        state,
        busy,
        error: errorMessage,
        recovery,
        chapterTitle: section ? section.chapterTitle : null,
        sectionId: section ? section.id : null,
        sectionTitle: section ? section.title : null,
        sectionNumber: activeSectionIndex >= 0 ? activeSectionIndex + 1 : 0,
        sectionCount: sections.length,
        paragraphNumber: currentIndex >= 0 ? currentIndex + 1 : 0,
        paragraphCount: event ? activeEvents.length : 0,
        text: event && event.text !== undefined ? event.text : null,
        event: event || null,
        progress: progress.snapshot()
      });
    }

    // 宿主渲染或儲存失敗，不應回滾已完成的閱讀操作，也不阻斷其他訂閱者。
    function notify() {
      const view = getView();
      for (const listener of listeners) {
        try {
          listener(copy(view));
        } catch (error) {
          // 訂閱回呼是宿主責任；本核心採隔離策略。
        }
      }
      return view;
    }

    function subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      listeners.add(listener);
      return function unsubscribe() {
        listeners.delete(listener);
      };
    }

    function requireInitialized() {
      if (!sections.length) throw new Error("No story manifest has been loaded");
    }

    function savePosition() {
      const event = player.current();
      if (!event || activeSectionIndex < 0) return;
      const sectionId = sections[activeSectionIndex].id;
      progress.markSeen(sectionId);
      const position = { eventIndex: player.snapshot().index };
      if (event.id !== undefined) position.eventId = event.id;
      progress.setBookmark(sectionId, position);
    }

    function checkEvents(sectionId, data) {
      if (!data || !Array.isArray(data.events)) {
        throw new Error("Section unavailable: " + sectionId);
      }
      if (data.events.some(event => event &&
          (event.type === "choice" || event.type === "challenge"))) {
        throw new Error("Unsupported interactive event in section: " + sectionId);
      }
      return data.events;
    }

    // 先驗證、讀取新小節，再變更目前播放器。失敗時保留原可恢復位置。
    async function findReadable(startIndex, direction) {
      const emptyIndices = [];
      for (let index = startIndex; index >= 0 && index < sections.length; index += direction) {
        const section = sections[index];
        const data = await loader.loadSection(section.id);
        const events = checkEvents(section.id, data);
        if (events.length > 0) {
          return { index, events, emptyIndices };
        }
        emptyIndices.push(index);
      }
      return { index: -1, events: [], emptyIndices };
    }

    function completeEmptySections(indices) {
      for (const index of indices) progress.finish(sections[index].id);
    }

    function commitReading(target, at, bookmark) {
      // Story Event Player.load() 會驗證所有事件；驗證成功才動 activeSectionIndex。
      player.load(target.events);
      if (at === "last") {
        player.seekByIndex(target.events.length - 1);
      } else if (at === "bookmark" && bookmark) {
        const resolved = progress.resolveBookmark(target.events);
        if (resolved.found) {
          player.seekByIndex(resolved.index);
        } else {
          player.start();
          recovery = { reason: "bookmark-position-missing", sectionId: sections[target.index].id,
            detail: resolved.reason };
        }
      } else {
        player.start();
      }
      activeSectionIndex = target.index;
      activeEvents = target.events;
      state = "reading";
      errorMessage = null;
      savePosition();
    }

    function enterComplete() {
      state = "complete";
      errorMessage = null;
      activeEvents = [];
      activeSectionIndex = -1;
      player.reset();
      progress.clearBookmark();
    }

    // 接受一個起點與方向，沿途空小節標記完成並略過。
    async function enterFrom(startIndex, direction, at = "first", bookmark = null) {
      state = "loading";
      notify();
      const target = await findReadable(startIndex, direction);
      if (target.index < 0) {
        completeEmptySections(target.emptyIndices);
        enterComplete();
      } else {
        commitReading(target, at, bookmark);
        completeEmptySections(target.emptyIndices);
      }
      return getView();
    }

    // 相同實例正在讀取時，新操作直接回傳目前狀態，不排隊、不累積點擊。
    async function runExclusive(operation) {
      if (busy) return getView();
      busy = true;
      try {
        await operation();
      } catch (error) {
        state = "error";
        errorMessage = error && error.message ? error.message : String(error);
        throw error;
      } finally {
        busy = false;
        notify();
      }
      return getView();
    }

    async function initialize(manifestSource) {
      return runExclusive(async function () {
        state = "loading";
        errorMessage = null;
        recovery = null;
        notify();
        const manifest = await loader.loadManifest(manifestSource);
        if (!manifest) throw new Error("Story manifest load was superseded");

        const orderedSections = [];
        for (const chapter of [...manifest.main, ...manifest.extras]) {
          for (const section of chapter.sections) {
            orderedSections.push({
              id: section.id,
              title: section.title || section.id,
              chapterTitle: chapter.title || chapter.id
            });
          }
        }
        if (!orderedSections.length) throw new Error("Story manifest has no sections");

        sections = orderedSections;
        activeEvents = [];
        activeSectionIndex = -1;
        player.reset();
        const bookmark = progress.getBookmark();
        const bookmarkIndex = bookmark
          ? sections.findIndex(section => section.id === bookmark.contentId)
          : -1;
        if (bookmarkIndex >= 0) {
          const target = await findReadable(bookmarkIndex, 1);
          if (target.index >= 0) {
            if (target.index !== bookmarkIndex) {
              recovery = { reason: "bookmark-empty-section", sectionId: bookmark.contentId };
            }
            commitReading(target, target.index === bookmarkIndex ? "bookmark" : "first", bookmark);
            completeEmptySections(target.emptyIndices);
          } else {
            completeEmptySections(target.emptyIndices);
            enterComplete();
            recovery = { reason: "bookmark-empty-section", sectionId: bookmark.contentId };
          }
        } else {
          const nextUnread = sections.findIndex(section => !progress.getStatus(section.id).completed);
          if (bookmark) {
            recovery = { reason: "bookmark-section-missing", sectionId: bookmark.contentId };
          }
          if (nextUnread < 0) {
            enterComplete();
          } else {
            // 所有位置已完讀時不要因無效書籤強制重讀。
            const target = await findReadable(nextUnread, 1);
            if (target.index >= 0) {
              commitReading(target, "first");
              completeEmptySections(target.emptyIndices);
            } else {
              completeEmptySections(target.emptyIndices);
              enterComplete();
            }
          }
        }
        return getView();
      });
    }

    async function next() {
      return runExclusive(async function () {
        requireInitialized();
        if (state !== "reading") return getView();
        recovery = null;
        const position = player.snapshot();
        if (position.status === "playing" && position.index < position.count - 1) {
          player.advance();
          savePosition();
        } else {
          const finishedIndex = activeSectionIndex;
          const nextIndex = finishedIndex + 1;
          // 先取得下一小節成功，才把目前章節標記完成。
          state = "loading";
          notify();
          const target = await findReadable(nextIndex, 1);
          if (target.index < 0) {
            progress.finish(sections[finishedIndex].id);
            completeEmptySections(target.emptyIndices);
            enterComplete();
          } else {
            commitReading(target, "first");
            progress.finish(sections[finishedIndex].id);
            completeEmptySections(target.emptyIndices);
          }
        }
        return getView();
      });
    }

    async function previous() {
      return runExclusive(async function () {
        requireInitialized();
        recovery = null;
        if (state === "complete") {
          await enterFrom(sections.length - 1, -1, "last");
        } else if (state === "reading") {
          const index = player.snapshot().index;
          if (index > 0) {
            player.seekByIndex(index - 1);
            savePosition();
          } else if (activeSectionIndex > 0) {
            await enterFrom(activeSectionIndex - 1, -1, "last");
          }
        }
        return getView();
      });
    }

    async function openSection(sectionId) {
      return runExclusive(async function () {
        requireInitialized();
        const index = sections.findIndex(section => section.id === sectionId);
        if (index < 0) throw new RangeError("Unknown section ID: " + sectionId);
        recovery = null;
        await enterFrom(index, 1);
        return getView();
      });
    }

    async function readFromStart() {
      return runExclusive(async function () {
        requireInitialized();
        recovery = null;
        await enterFrom(0, 1);
        return getView();
      });
    }

    return Object.freeze({ initialize, next, previous, openSection, readFromStart, getView, subscribe });
  }

  global.SlowlyLinearStoryReader = Object.freeze({ create, VERSION: "1.1.0" });
})(typeof window !== "undefined" ? window : globalThis);
