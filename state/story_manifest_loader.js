/* 慢慢軍火庫｜Story Manifest Loader 1.0.0
 * 從篇章索引安全地載入小節 JSON；不播放故事、不記錄進度、不操作 UI。
 * 原型來自《霧林之契》索引載入與過期回應防護，抽離遊戲專屬規則。
 */
(function (global) {
  "use strict";

  function copyJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function requireId(value, label) {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError(label + " must be a nonempty string");
    }
    return value;
  }

  function create(options = {}) {
    if (!options.baseUrl) throw new TypeError("baseUrl is required");
    // 視為目錄；不允許忽略根路徑層級或使用帶查詢的 baseUrl。
    const suppliedBase = new URL(options.baseUrl, global.location && global.location.href || undefined);
    if (suppliedBase.search || suppliedBase.hash) throw new TypeError("baseUrl must not contain search or hash");
    const directoryUrl = new URL(suppliedBase.href.endsWith("/") ? suppliedBase.href : suppliedBase.href + "/");
    if (!["http:", "https:"].includes(directoryUrl.protocol)) throw new TypeError("baseUrl must use HTTP(S)");
    const fetcher = options.fetcher || (typeof global.fetch === "function" ? global.fetch.bind(global) : null);
    if (typeof fetcher !== "function") throw new TypeError("fetcher is required");
    const manifestFile = options.manifestUrl || "chapters.json";

    function safeUrl(file) {
      if (typeof file !== "string" || !file.trim() || file.startsWith("/") ||
          file.includes("\\") || file.includes("?") || file.includes("#") ||
          /%(?:2f|5c|00)/i.test(file)) {
        throw new Error("Invalid story data path");
      }
      const url = new URL(file, directoryUrl);
      if (url.origin !== directoryUrl.origin || !url.pathname.startsWith(directoryUrl.pathname) ||
          url.search || url.hash || !url.pathname.endsWith(".json")) {
        throw new Error("Story data path outside allowed directory");
      }
      return url;
    }

    async function readJson(url) {
      const response = await fetcher(url.href, { cache: "no-cache" });
      if (!response || response.ok !== true || typeof response.json !== "function") {
        throw new Error("Story fetch failed (HTTP " + (response && response.status || "unknown") + ")");
      }
      return response.json();
    }

    function validateManifest(data) {
      if (!data || typeof data !== "object" || Array.isArray(data) ||
          !Array.isArray(data.main) || !Array.isArray(data.extras)) {
        throw new TypeError("Manifest requires main and extras arrays");
      }
      if (data.schemaVersion !== undefined &&
          (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1)) {
        throw new TypeError("Invalid schemaVersion");
      }
      const chapterIds = new Set();
      const sectionIds = new Set();
      const index = new Map();
      for (const chapter of [...data.main, ...data.extras]) {
        if (!chapter || typeof chapter !== "object") throw new TypeError("Invalid chapter entry");
        const chapterId = requireId(chapter.id, "chapter.id");
        if (chapterIds.has(chapterId)) throw new Error("Duplicate chapter ID: " + chapterId);
        chapterIds.add(chapterId);
        if (!Array.isArray(chapter.sections) || chapter.sections.length === 0) {
          throw new TypeError("Missing chapter sections: " + chapterId);
        }
        for (const section of chapter.sections) {
          if (!section || typeof section !== "object") throw new TypeError("Invalid section entry");
          const sectionId = requireId(section.id, "section.id");
          if (sectionIds.has(sectionId)) throw new Error("Duplicate section ID: " + sectionId);
          sectionIds.add(sectionId);
          safeUrl(section.file); // 在正式載入前驗證全部路徑，避免部分索引有效。
          index.set(sectionId, { chapterId, file: section.file });
        }
      }
      return index;
    }

    let manifest = null;
    let sectionsById = new Map();
    let cachedSections = new Map();
    let inFlightSections = new Map();
    let manifestSerial = 0;
    let status = "idle";
    let lastError = null;

    async function loadManifest(source = manifestFile) {
      const serial = ++manifestSerial;
      status = "loading-manifest";
      lastError = null;
      try {
        const incoming = typeof source === "string" ? await readJson(safeUrl(source)) : copyJson(source);
        const index = validateManifest(incoming);
        if (serial !== manifestSerial) return null; // 舊回應不能覆蓋最新資料。
        manifest = copyJson(incoming);
        sectionsById = index;
        cachedSections = new Map();
        inFlightSections = new Map();
        status = "ready";
        return getManifest();
      } catch (error) {
        if (serial === manifestSerial) {
          status = "error";
          lastError = error.message || String(error);
        }
        if (serial !== manifestSerial) return null;
        throw error;
      }
    }

    async function loadSection(sectionId) {
      requireId(sectionId, "sectionId");
      if (!manifest) throw new Error("Load manifest before sections");
      const entry = sectionsById.get(sectionId);
      if (!entry) throw new RangeError("Unknown section ID: " + sectionId);
      if (cachedSections.has(sectionId)) return copyJson(cachedSections.get(sectionId));
      if (inFlightSections.has(sectionId)) {
        const shared = await inFlightSections.get(sectionId);
        return shared === null ? null : copyJson(shared);
      }
      const serial = manifestSerial;
      const pending = (async function () {
        try {
          const data = await readJson(safeUrl(entry.file));
          if (!data || data.id !== sectionId || !Array.isArray(data.events)) {
            throw new TypeError("Invalid section ID or events: " + sectionId);
          }
          // 重新載入索引或 clearCache 後，舊請求不得寫回快取。
          if (serial !== manifestSerial || inFlightSections.get(sectionId) !== pending) return null;
          const stored = copyJson(data);
          cachedSections.set(sectionId, stored);
          lastError = null;
          return stored;
        } catch (error) {
          if (serial === manifestSerial && inFlightSections.get(sectionId) === pending) {
            lastError = error.message || String(error);
          }
          if (serial !== manifestSerial || inFlightSections.get(sectionId) !== pending) return null;
          throw error;
        } finally {
          if (inFlightSections.get(sectionId) === pending) inFlightSections.delete(sectionId);
        }
      })();
      inFlightSections.set(sectionId, pending);
      const value = await pending;
      return value === null ? null : copyJson(value);
    }

    function getManifest() { return manifest === null ? null : copyJson(manifest); }
    function getSection(id) { return cachedSections.has(id) ? copyJson(cachedSections.get(id)) : null; }
    function hasSection(id) { return cachedSections.has(id); }
    function clearCache(sectionId) {
      if (sectionId === undefined) {
        cachedSections.clear();
        inFlightSections.clear();
        return;
      }
      requireId(sectionId, "sectionId");
      cachedSections.delete(sectionId);
      inFlightSections.delete(sectionId);
    }
    function getState() {
      return { status, error: lastError, loaded: manifest !== null,
        cachedCount: cachedSections.size, latestRequest: manifestSerial };
    }
    return Object.freeze({ loadManifest, loadSection, getManifest, getSection, hasSection, clearCache, getState });
  }
  global.SlowlyStoryManifestLoader = Object.freeze({ create, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
