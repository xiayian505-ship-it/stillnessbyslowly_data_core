/* 慢慢的倉庫｜Data / Storage｜Snapshot Mirror v1.0.0
   多儲存來源 snapshot 協調核心：
   - 從多個 store 讀取 snapshot
   - 選出最新資料
   - 可自訂同時間 tie-break
   - 將最新 snapshot 回寫到所有 store 修補不一致
   Store 只需提供 read() / write(snapshot)。
   不綁 localStorage、不綁 IndexedDB、不綁業務資料格式。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeStores(stores) {
    if (!Array.isArray(stores) || stores.length === 0) {
      throw new TypeError("stores must be a non-empty array.");
    }

    return stores.map(function (store, index) {
      if (!store || typeof store.read !== "function") {
        throw new TypeError(
          "stores[" + index + "] must provide read()."
        );
      }

      if (typeof store.write !== "function") {
        throw new TypeError(
          "stores[" + index + "] must provide write(snapshot)."
        );
      }

      return store;
    });
  }

  function defaultGetTimestamp(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return 0;
    }

    const value =
      snapshot.updatedAt ??
      snapshot.savedAt ??
      snapshot.exportedAt ??
      "";

    const timestamp =
      typeof value === "number"
        ? value
        : Date.parse(String(value));

    return Number.isFinite(timestamp)
      ? timestamp
      : 0;
  }

  function defaultTieBreak(a, b) {
    const aData = a && a.data;
    const bData = b && b.data;

    const aSize =
      Array.isArray(aData)
        ? aData.length
        : 0;

    const bSize =
      Array.isArray(bData)
        ? bData.length
        : 0;

    return bSize - aSize;
  }

  function create(options = {}) {
    const stores = normalizeStores(options.stores);

    const getTimestamp =
      typeof options.getTimestamp === "function"
        ? options.getTimestamp
        : defaultGetTimestamp;

    const tieBreak =
      typeof options.tieBreak === "function"
        ? options.tieBreak
        : defaultTieBreak;

    async function readCandidates() {
      const results = await Promise.all(
        stores.map(async function (store, index) {
          try {
            const snapshot = await store.read();

            if (snapshot == null) {
              return null;
            }

            return Object.freeze({
              index,
              name:
                String(
                  store.name ??
                  ("store-" + index)
                ),
              snapshot,
              timestamp: Number(
                getTimestamp(snapshot)
              ) || 0
            });
          } catch (error) {
            return Object.freeze({
              index,
              name:
                String(
                  store.name ??
                  ("store-" + index)
                ),
              error
            });
          }
        })
      );

      return Object.freeze(
        results.filter(Boolean)
      );
    }

    function chooseLatest(candidates) {
      const valid = candidates
        .filter(item => item && !item.error && item.snapshot != null)
        .slice();

      if (valid.length === 0) {
        return null;
      }

      valid.sort(function (a, b) {
        const timeDiff =
          b.timestamp - a.timestamp;

        if (timeDiff !== 0) {
          return timeDiff;
        }

        return Number(
          tieBreak(
            a.snapshot,
            b.snapshot,
            a,
            b
          )
        ) || 0;
      });

      return valid[0];
    }

    async function writeAll(snapshot) {
      const results = await Promise.all(
        stores.map(async function (store, index) {
          try {
            await store.write(snapshot);

            return Object.freeze({
              index,
              name:
                String(
                  store.name ??
                  ("store-" + index)
                ),
              ok: true
            });
          } catch (error) {
            return Object.freeze({
              index,
              name:
                String(
                  store.name ??
                  ("store-" + index)
                ),
              ok: false,
              error
            });
          }
        })
      );

      return Object.freeze(results);
    }

    async function readLatest(options = {}) {
      const candidates = await readCandidates();
      const latest = chooseLatest(candidates);

      if (!latest) {
        return Object.freeze({
          found: false,
          latest: null,
          candidates
        });
      }

      let repairs = null;

      if (options.repair === true) {
        repairs = await writeAll(
          latest.snapshot
        );
      }

      return Object.freeze({
        found: true,
        latest,
        candidates,
        repairs
      });
    }

    async function save(snapshot) {
      const writes = await writeAll(snapshot);
      const okCount =
        writes.filter(item => item.ok).length;

      return Object.freeze({
        snapshot,
        writes,
        okCount,
        failedCount:
          writes.length - okCount,
        allSucceeded:
          okCount === writes.length
      });
    }

    return Object.freeze({
      version: VERSION,
      readCandidates,
      chooseLatest,
      readLatest,
      writeAll,
      save
    });
  }

  global.SnapshotMirror = Object.freeze({
    version: VERSION,
    defaultGetTimestamp,
    defaultTieBreak,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
