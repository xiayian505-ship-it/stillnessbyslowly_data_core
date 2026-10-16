/* =========================================================
   慢慢軍火庫｜Slot Stage Layout v1.0.0

   用途：透過宿主提供的 CSS Grid 區域矩陣安排內容插槽。
   - 任意命名插槽，不認識玩家、Boss 或戰鬥規則。
   - 依「自身容器」寬度選擇宿主提供的布局。
   - 支援多組布局、ResizeObserver、重新設定與 destroy。

   不負責：
   - 建立／移動宿主內容、血條、卡牌、操作鈕或遊戲事件。
   - 設定角色美術、顏色、字體或勝負條件。
   - 製作拖曳式版型編輯器。
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const ROOT_CLASS_NAME = "slowly-slot-stage-layout";
  const SLOT_SELECTOR = ":scope > [data-stage-slot]";
  const VALID_AREA_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const RESERVED_NAMES = new Set(["auto", "none", "span"]);
  const instances = new WeakMap();

  function resolveRoot(target) {
    if (typeof target === "string") {
      return document.querySelector(target);
    }
    return target instanceof global.HTMLElement ? target : null;
  }

  function readSlots(root) {
    const slots = new Map();
    Array.from(root.querySelectorAll(SLOT_SELECTOR)).forEach(element => {
      const name = element.getAttribute("data-stage-slot")?.trim() || "";
      if (!VALID_AREA_NAME.test(name) || RESERVED_NAMES.has(name.toLowerCase())) {
        throw new Error(`SlotStageLayout 的插槽名稱無效：${name}`);
      }
      if (slots.has(name)) {
        throw new Error(`SlotStageLayout 的插槽名稱重複：${name}`);
      }
      slots.set(name, element);
    });

    if (!slots.size) {
      throw new Error("SlotStageLayout 至少需要一個 data-stage-slot。");
    }
    return slots;
  }

  function validateAreas(areas, slotNames) {
    if (!Array.isArray(areas) || !areas.length || !Array.isArray(areas[0])) {
      throw new TypeError("SlotStageLayout 的 areas 必須是非空二維陣列。");
    }

    const columnCount = areas[0].length;
    if (!columnCount || areas.some(row => !Array.isArray(row) || row.length !== columnCount)) {
      throw new Error("SlotStageLayout 每一列的欄數必須相同。");
    }

    const cellPositions = new Map();
    areas.forEach((row, rowIndex) => {
      row.forEach((name, columnIndex) => {
        if (name === ".") {
          return;
        }
        if (!slotNames.has(name)) {
          throw new Error(`SlotStageLayout 的布局使用未知插槽：${name}`);
        }
        if (!cellPositions.has(name)) {
          cellPositions.set(name, []);
        }
        cellPositions.get(name).push([rowIndex, columnIndex]);
      });
    });

    for (const name of slotNames) {
      const positions = cellPositions.get(name);
      if (!positions) {
        throw new Error(`SlotStageLayout 的布局缺少插槽：${name}`);
      }

      // CSS Grid 同名區域必須是矩形；提前檢查可避免瀏覽器默默忽略模板。
      const rows = positions.map(position => position[0]);
      const columns = positions.map(position => position[1]);
      const rowSpan = Math.max(...rows) - Math.min(...rows) + 1;
      const columnSpan = Math.max(...columns) - Math.min(...columns) + 1;
      if (positions.length !== rowSpan * columnSpan) {
        throw new Error(`SlotStageLayout 的插槽 ${name} 不是連續矩形。`);
      }
    }
    return columnCount;
  }

  function normalizeLayouts(layouts, slotNames) {
    if (!Array.isArray(layouts) || !layouts.length) {
      throw new Error("SlotStageLayout 至少需要一組 layouts 設定。");
    }

    const seenNames = new Set();
    const normalizedLayouts = layouts.map(layout => {
      const name = String(layout?.name || "").trim();
      if (!name || seenNames.has(name)) {
        throw new Error("SlotStageLayout 每組布局需要不重複的 name。");
      }
      seenNames.add(name);

      const minWidth = layout.minWidth ?? 0;
      if (!Number.isFinite(minWidth) || minWidth < 0) {
        throw new RangeError(`SlotStageLayout ${name} 的 minWidth 必須大於等於 0。`);
      }

      const columnCount = validateAreas(layout.areas, slotNames);
      const columns = layout.columns || Array(columnCount).fill("minmax(0, 1fr)");
      const rows = layout.rows || Array(layout.areas.length).fill("auto");
      if (!Array.isArray(columns) || columns.length !== columnCount ||
          columns.some(value => typeof value !== "string" || !value.trim())) {
        throw new Error(`SlotStageLayout ${name} 的 columns 數量或內容不正確。`);
      }
      if (!Array.isArray(rows) || rows.length !== layout.areas.length ||
          rows.some(value => typeof value !== "string" || !value.trim())) {
        throw new Error(`SlotStageLayout ${name} 的 rows 數量或內容不正確。`);
      }

      return {
        name,
        minWidth,
        areas: layout.areas.map(row => [...row]),
        columns: [...columns],
        rows: [...rows]
      };
    });

    if (!normalizedLayouts.some(layout => layout.minWidth === 0)) {
      throw new Error("SlotStageLayout 必須有一組 minWidth: 0 的後備布局。");
    }

    return normalizedLayouts.sort((first, second) => first.minWidth - second.minWidth);
  }

  function rememberStyle(element, propertyName) {
    return {
      element,
      propertyName,
      originalValue: element.style.getPropertyValue(propertyName),
      originalPriority: element.style.getPropertyPriority(propertyName)
    };
  }

  function restoreStyle(record) {
    if (record.originalValue) {
      record.element.style.setProperty(record.propertyName, record.originalValue, record.originalPriority);
    } else {
      record.element.style.removeProperty(record.propertyName);
    }
  }

  function create(target, options = {}) {
    const root = resolveRoot(target);
    if (!root) {
      throw new Error("SlotStageLayout 找不到舞台容器。");
    }
    if (instances.has(root)) {
      return instances.get(root);
    }

    const slots = readSlots(root);
    const slotNames = new Set(slots.keys());
    let layouts = normalizeLayouts(options.layouts, slotNames);
    let activeLayout = null;
    let destroyed = false;
    let resizeObserver = null;
    const hadRootClass = root.classList.contains(ROOT_CLASS_NAME);
    const changedStyles = [
      rememberStyle(root, "grid-template-areas"),
      rememberStyle(root, "grid-template-columns"),
      rememberStyle(root, "grid-template-rows")
    ];

    slots.forEach(slot => changedStyles.push(rememberStyle(slot, "grid-area")));
    root.classList.add(ROOT_CLASS_NAME);
    slots.forEach((slot, name) => slot.style.setProperty("grid-area", name));

    function assertActive() {
      if (destroyed) {
        throw new Error("SlotStageLayout 已 destroy，不能繼續操作。");
      }
    }

    function refresh() {
      assertActive();
      const containerWidth = root.clientWidth;
      const matchingLayouts = layouts.filter(layout => containerWidth >= layout.minWidth);
      const matchingLayout = matchingLayouts[matchingLayouts.length - 1] || layouts[0];

      if (activeLayout !== matchingLayout.name) {
        root.style.setProperty(
          "grid-template-areas",
          matchingLayout.areas.map(row => `"${row.join(" ")}"`).join(" ")
        );
        root.style.setProperty("grid-template-columns", matchingLayout.columns.join(" "));
        root.style.setProperty("grid-template-rows", matchingLayout.rows.join(" "));
        activeLayout = matchingLayout.name;
      }
      return activeLayout;
    }

    const api = {
      root,
      get activeLayout() {
        return activeLayout;
      },
      getSlot(name) {
        assertActive();
        return slots.get(name) || null;
      },
      refresh,
      setLayouts(nextLayouts) {
        assertActive();
        const validatedLayouts = normalizeLayouts(nextLayouts, slotNames);
        layouts = validatedLayouts;
        activeLayout = null;
        return refresh();
      },
      destroy() {
        if (destroyed) {
          return;
        }
        destroyed = true;
        resizeObserver?.disconnect();
        global.removeEventListener("resize", onWindowResize);
        changedStyles.forEach(restoreStyle);
        if (!hadRootClass) {
          root.classList.remove(ROOT_CLASS_NAME);
        }
        instances.delete(root);
      }
    };

    function onWindowResize() {
      if (!destroyed) {
        refresh();
      }
    }

    instances.set(root, api);
    try {
      refresh();
      if (typeof global.ResizeObserver === "function") {
        resizeObserver = new global.ResizeObserver(onWindowResize);
        resizeObserver.observe(root);
      } else {
        global.addEventListener("resize", onWindowResize);
      }
    } catch (error) {
      api.destroy();
      throw error;
    }
    return api;
  }

  global.SlowlySlotStageLayout = Object.freeze({ VERSION, create });
})(window);
