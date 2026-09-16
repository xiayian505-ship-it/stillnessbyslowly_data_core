/* =========================================================
   Slowly Canvas Icons Core
   ---------------------------------------------------------
   Registry + unified draw entry.
   Icon families decide how to draw; hosts decide appearance.
========================================================= */
(() => {
  "use strict";

  const root = window;
  const families = new Map();

  function isCanvas(value) {
    return value && typeof value.getContext === "function";
  }

  function isContext2D(value) {
    return value && value.canvas && typeof value.save === "function";
  }

  function resolveContext(target) {
    if (isContext2D(target)) return target;

    if (isCanvas(target)) {
      const context = target.getContext("2d");
      if (!context) {
        throw new Error("[SlowlyCanvasIcons] 無法取得 2D Canvas context。");
      }
      return context;
    }

    throw new TypeError(
      "[SlowlyCanvasIcons] draw() 的 target 必須是 canvas 或 CanvasRenderingContext2D。"
    );
  }

  function normalizeFamilyName(name) {
    const value = String(name || "").trim();
    if (!value) {
      throw new TypeError("[SlowlyCanvasIcons] family name 不可為空。");
    }
    return value;
  }

  function normalizeIconName(name) {
    const value = String(name || "").trim();
    if (!value) {
      throw new TypeError("[SlowlyCanvasIcons] icon name 不可為空。");
    }
    return value;
  }

  function registerFamily(name, definition) {
    const familyName = normalizeFamilyName(name);

    if (!definition || typeof definition !== "object") {
      throw new TypeError("[SlowlyCanvasIcons] family definition 必須是物件。");
    }

    const icons = definition.icons;

    if (!icons || typeof icons !== "object" || Array.isArray(icons)) {
      throw new TypeError("[SlowlyCanvasIcons] family.icons 必須是物件。");
    }

    Object.entries(icons).forEach(([iconName, icon]) => {
      if (!icon || typeof icon.draw !== "function") {
        throw new TypeError(
          `[SlowlyCanvasIcons] ${familyName}.${iconName} 缺少 draw(ctx, options)。`
        );
      }
    });

    families.set(familyName, {
      label: definition.label || familyName,
      desc: definition.desc || "",
      previewOrder: Array.isArray(definition.previewOrder)
        ? definition.previewOrder.slice()
        : [],
      defaults: { ...(definition.defaults || {}) },
      controls: Array.isArray(definition.controls)
        ? definition.controls.map((control) => ({ ...control }))
        : [],
      icons: { ...icons }
    });

    return api;
  }

  function hasFamily(name) {
    return families.has(String(name || "").trim());
  }

  function getFamily(name) {
    const familyName = normalizeFamilyName(name);
    const family = families.get(familyName);

    if (!family) {
      throw new Error(`[SlowlyCanvasIcons] 找不到 family：${familyName}`);
    }

    return family;
  }

  function getIcon(familyName, iconName) {
    const family = getFamily(familyName);
    const name = normalizeIconName(iconName);
    const icon = family.icons[name];

    if (!icon) {
      throw new Error(`[SlowlyCanvasIcons] 找不到 icon：${familyName}.${name}`);
    }

    return { family, icon, iconName: name };
  }

  function draw(familyName, iconName, target, options = {}) {
    const ctx = resolveContext(target);
    const { family, icon } = getIcon(familyName, iconName);

    const resolved = {
      ...family.defaults,
      ...(icon.defaults || {}),
      ...(options || {})
    };

    const shouldClear = resolved.clear !== false;

    ctx.save();
    try {
      if (shouldClear) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }

      icon.draw(ctx, resolved);
    } finally {
      ctx.restore();
    }

    return resolved;
  }

  function listFamilies() {
    return Array.from(families.entries()).map(([name, family]) => ({
      name,
      label: family.label,
      desc: family.desc,
      previewOrder: family.previewOrder.slice(),
      controls: family.controls.map((control) => ({ ...control })),
      defaults: { ...family.defaults },
      icons: Object.keys(family.icons)
    }));
  }

  function listIcons(familyName) {
    const family = getFamily(familyName);

    return Object.entries(family.icons).map(([name, icon]) => ({
      name,
      label: icon.label || name,
      desc: icon.desc || "",
      defaults: { ...(icon.defaults || {}) }
    }));
  }

  function getDefaults(familyName, iconName) {
    const { family, icon } = getIcon(familyName, iconName);

    return {
      ...family.defaults,
      ...(icon.defaults || {})
    };
  }

  const api = Object.freeze({
    registerFamily,
    hasFamily,
    getFamily,
    listFamilies,
    listIcons,
    getDefaults,
    draw
  });

  root.SlowlyCanvasIcons = api;
})();
