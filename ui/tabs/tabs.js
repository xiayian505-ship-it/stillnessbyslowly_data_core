/* =========================================================
   慢慢的倉庫｜Slowly Tabs v1.0.0

   用途：同一個頁面內切換分頁與內容區塊。
   - 沿用 data-view-target / data-view-panel
   - 同頁多組互不干擾
   - 原生按鈕點擊與鍵盤切換
   - aria-selected、tabindex、hidden 同步
   - 提供宿主切換回呼與變更事件

   不負責：
   - 分頁的配色、字體、底線與版面風格
   - 網址 hash / History / Router
   - localStorage 或其他資料儲存
   - 遊戲暫停、表單儲存等宿主業務邏輯
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const INSTANCE_KEY = "__slowlyTabsInstance";
  let nextId = 0;

  function resolveRoot(target) {
    if (typeof target === "string") return document.querySelector(target);
    return target instanceof HTMLElement ? target : null;
  }

  function belongsToRoot(element, root) {
    const owner = element.closest("[data-slowly-tabs]");
    return !owner || owner === root;
  }

  function collect(root, selector) {
    return Array.from(root.querySelectorAll(selector))
      .filter(element => belongsToRoot(element, root));
  }

  function create(target, options = {}) {
    const root = resolveRoot(target);
    if (!root) throw new Error("SlowlyTabs 找不到分頁根元素。");
    if (root[INSTANCE_KEY]) return root[INSTANCE_KEY];

    const tabs = collect(root, "[data-view-target]");
    const panels = collect(root, "[data-view-panel]");
    if (!tabs.length || !panels.length) {
      throw new Error("SlowlyTabs 需要 data-view-target 與 data-view-panel。");
    }

    const tabMap = new Map();
    const panelMap = new Map();

    tabs.forEach(tab => {
      if (!(tab instanceof HTMLButtonElement)) {
        throw new TypeError("SlowlyTabs 的分頁按鈕必須是 button 元素。");
      }
      const name = String(tab.dataset.viewTarget ?? "").trim();
      if (!name || tabMap.has(name)) {
        throw new Error(`SlowlyTabs 分頁名稱空白或重複：${name}`);
      }
      tabMap.set(name, tab);
    });

    panels.forEach(panel => {
      const name = String(panel.dataset.viewPanel ?? "").trim();
      if (!name || panelMap.has(name)) {
        throw new Error(`SlowlyTabs 內容區名稱空白或重複：${name}`);
      }
      panelMap.set(name, panel);
    });

    for (const name of tabMap.keys()) {
      if (!panelMap.has(name)) {
        throw new Error(`SlowlyTabs 找不到「${name}」的內容區。`);
      }
    }
    for (const name of panelMap.keys()) {
      if (!tabMap.has(name)) {
        throw new Error(`SlowlyTabs 找不到「${name}」的分頁按鈕。`);
      }
    }

    const enabled = () => tabs.filter(tab => !tab.disabled);
    const firstEnabled = enabled()[0];
    if (!firstEnabled) throw new Error("SlowlyTabs 至少需要一個可使用的分頁。");

    const explicitInitial = options.initial == null ? "" : String(options.initial).trim();
    const markupInitial = tabs.find(tab => tab.getAttribute("aria-selected") === "true" && !tab.disabled);
    const initialName = explicitInitial || markupInitial?.dataset.viewTarget || firstEnabled.dataset.viewTarget;
    if (!tabMap.has(initialName) || tabMap.get(initialName).disabled) {
      throw new Error(`SlowlyTabs 預設分頁無效或已停用：${initialName}`);
    }

    const instanceId = ++nextId;
    const hadRootClass = root.classList.contains("slowly-tabs");
    root.classList.add("slowly-tabs");
    let currentName = null;
    let destroyed = false;
    const listeners = [];

    for (const [name, tab] of tabMap) {
      const panel = panelMap.get(name);
      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "-");
      if (!tab.id) tab.id = `slowly-tabs-${instanceId}-tab-${safeName}`;
      if (!panel.id) panel.id = `slowly-tabs-${instanceId}-panel-${safeName}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
    }

    const api = {
      root,
      get current() { return currentName; },
      show(name, config = {}) {
        if (destroyed) throw new Error("SlowlyTabs 已 destroy，不能再切換。");
        const viewName = String(name ?? "").trim();
        const tab = tabMap.get(viewName);
        if (!tab) throw new Error(`SlowlyTabs 找不到分頁：${viewName}`);
        if (tab.disabled) throw new Error(`SlowlyTabs 分頁已停用：${viewName}`);

        const previousName = currentName;
        if (previousName === viewName) {
          if (config.focus) tab.focus();
          return viewName;
        }

        currentName = viewName;
        tabMap.forEach((item, key) => {
          const active = key === viewName;
          item.setAttribute("aria-selected", String(active));
          item.tabIndex = active ? 0 : -1;
        });
        panelMap.forEach((item, key) => {
          item.hidden = key !== viewName;
        });

        if (config.focus) tab.focus();
        if (!config.silent) {
          const detail = {
            name: viewName,
            previousName,
            instance: api,
            sourceEvent: config.sourceEvent || null
          };
          root.dispatchEvent(new CustomEvent("slowlytabschange", {
            bubbles: true,
            detail
          }));
          if (typeof options.onChange === "function") options.onChange(detail);
        }
        return viewName;
      },
      destroy() {
        if (destroyed) return;
        listeners.forEach(([element, type, handler]) => {
          element.removeEventListener(type, handler);
        });
        listeners.length = 0;
        if (!hadRootClass) root.classList.remove("slowly-tabs");
        delete root[INSTANCE_KEY];
        destroyed = true;
      }
    };

    tabs.forEach(tab => {
      const name = tab.dataset.viewTarget;
      const onClick = event => {
        if (!tab.disabled) api.show(name, { sourceEvent: event });
      };
      const onKeyDown = event => {
        const list = tab.closest('[role="tablist"]');
        const vertical = list?.getAttribute("aria-orientation") === "vertical";
        const forward = vertical ? "ArrowDown" : "ArrowRight";
        const backward = vertical ? "ArrowUp" : "ArrowLeft";
        const usable = enabled();
        if (!usable.length) return;

        let targetTab = null;
        if (event.key === "Home") targetTab = usable[0];
        else if (event.key === "End") targetTab = usable[usable.length - 1];
        else if (event.key === forward || event.key === backward) {
          const index = usable.indexOf(tab);
          if (index < 0) return;
          const step = event.key === forward ? 1 : -1;
          targetTab = usable[(index + step + usable.length) % usable.length];
        }
        if (!targetTab) return;
        event.preventDefault();
        api.show(targetTab.dataset.viewTarget, { focus: true, sourceEvent: event });
      };
      tab.addEventListener("click", onClick);
      tab.addEventListener("keydown", onKeyDown);
      listeners.push([tab, "click", onClick], [tab, "keydown", onKeyDown]);
    });

    root[INSTANCE_KEY] = api;
    api.show(initialName, { silent: true });
    return api;
  }

  function createAll(selector = "[data-slowly-tabs]", options = {}) {
    return Array.from(document.querySelectorAll(selector))
      .map(root => create(root, options));
  }

  global.SlowlyTabs = Object.freeze({ version: VERSION, create, createAll });
})(window);
