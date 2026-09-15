// pair_matching.js
// 慢慢的倉庫｜Game / Card｜Pair Matching 1.0.0
// 通用兩兩配對回合核心。
// 不處理 DOM、翻牌動畫、洗牌、計分保存、提示、音效或完成畫面。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function cloneItems(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function defaultGetId(item, index) {
    if (item && typeof item === "object" && item.id != null) {
      return item.id;
    }
    return index;
  }

  function noop() {}

  function create(options = {}) {
    const getId = typeof options.getId === "function"
      ? options.getId
      : defaultGetId;

    const getMatchKey = typeof options.getMatchKey === "function"
      ? options.getMatchKey
      : null;

    const isMatch = typeof options.isMatch === "function"
      ? options.isMatch
      : function (a, b) {
          if (getMatchKey) {
            return getMatchKey(a) === getMatchKey(b);
          }

          const aKey = a && typeof a === "object" ? a.matchKey : undefined;
          const bKey = b && typeof b === "object" ? b.matchKey : undefined;
          return aKey !== undefined && aKey === bKey;
        };

    const onSelect = typeof options.onSelect === "function" ? options.onSelect : noop;
    const onMove = typeof options.onMove === "function" ? options.onMove : noop;
    const onMatch = typeof options.onMatch === "function" ? options.onMatch : noop;
    const onMismatch = typeof options.onMismatch === "function" ? options.onMismatch : noop;
    const onComplete = typeof options.onComplete === "function" ? options.onComplete : noop;
    const onReset = typeof options.onReset === "function" ? options.onReset : noop;

    let sourceItems = cloneItems(options.items);
    let entries = [];
    let entryMap = new Map();
    let selected = [];
    let matchedIds = new Set();
    let moves = 0;
    let locked = false;
    let complete = false;

    function rebuild(nextItems) {
      sourceItems = cloneItems(nextItems);
      entries = sourceItems.map(function (item, index) {
        return {
          id: getId(item, index),
          item,
          index
        };
      });

      entryMap = new Map();

      entries.forEach(function (entry) {
        if (entryMap.has(entry.id)) {
          throw new Error("PairMatching requires unique item ids.");
        }
        entryMap.set(entry.id, entry);
      });
    }

    function snapshot() {
      return {
        items: sourceItems.slice(),
        selectedIds: selected.map(function (entry) { return entry.id; }),
        matchedIds: Array.from(matchedIds),
        moves,
        matchedPairs: Math.floor(matchedIds.size / 2),
        totalPairs: Math.floor(entries.length / 2),
        locked,
        complete
      };
    }

    function result(accepted, reason, extra) {
      return Object.assign({
        accepted,
        reason,
        state: snapshot()
      }, extra || {});
    }

    function canSelect(id) {
      if (locked || complete) return false;
      if (!entryMap.has(id)) return false;
      if (matchedIds.has(id)) return false;
      return !selected.some(function (entry) { return entry.id === id; });
    }

    async function select(id) {
      if (locked) return result(false, "locked");
      if (complete) return result(false, "complete");

      const entry = entryMap.get(id);
      if (!entry) return result(false, "unknown");
      if (matchedIds.has(id)) return result(false, "matched");
      if (selected.some(function (picked) { return picked.id === id; })) {
        return result(false, "selected");
      }

      selected.push(entry);

      await onSelect({
        id: entry.id,
        item: entry.item,
        index: entry.index,
        selection: selected.length,
        state: snapshot()
      });

      if (selected.length < 2) {
        return result(true, "first", {
          item: entry.item,
          id: entry.id
        });
      }

      locked = true;
      moves += 1;

      const first = selected[0];
      const second = selected[1];

      await onMove({
        moves,
        first: first.item,
        second: second.item,
        state: snapshot()
      });

      const matched = Boolean(isMatch(
        first.item,
        second.item,
        {
          firstId: first.id,
          secondId: second.id,
          moves,
          state: snapshot()
        }
      ));

      if (matched) {
        matchedIds.add(first.id);
        matchedIds.add(second.id);
      }

      complete = matchedIds.size === entries.length && entries.length > 0;

      const pairPayload = {
        first: first.item,
        second: second.item,
        firstId: first.id,
        secondId: second.id,
        moves,
        matchedPairs: Math.floor(matchedIds.size / 2),
        totalPairs: Math.floor(entries.length / 2),
        complete,
        state: snapshot()
      };

      try {
        if (matched) {
          await onMatch(pairPayload);

          if (complete) {
            await onComplete({
              moves,
              matchedPairs: pairPayload.matchedPairs,
              totalPairs: pairPayload.totalPairs,
              state: snapshot()
            });
          }
        } else {
          await onMismatch(pairPayload);
        }
      } finally {
        selected = [];
        locked = false;
      }

      return result(true, matched ? (complete ? "complete" : "match") : "mismatch", {
        matched,
        complete,
        first: first.item,
        second: second.item,
        firstId: first.id,
        secondId: second.id
      });
    }

    function reset(nextItems) {
      if (arguments.length > 0) {
        rebuild(nextItems);
      } else {
        rebuild(sourceItems);
      }

      selected = [];
      matchedIds = new Set();
      moves = 0;
      locked = false;
      complete = false;

      onReset({ state: snapshot() });
      return api;
    }

    const api = {
      version: VERSION,
      select,
      canSelect,
      reset,
      snapshot,
      isMatched: function (id) {
        return matchedIds.has(id);
      },
      isLocked: function () {
        return locked;
      }
    };

    reset(sourceItems);
    return api;
  }

  global.PairMatching = Object.freeze({
    version: VERSION,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
