/* =========================================================
   SelectOrCreate.js
   Stillness by Slowly - 慢慢的倉庫
   v1.0.0

   用途：
   搜尋既有項目 → 以 ID 選取 → 找不到可新增 → 同名時回收既有項目。

   不綁資料來源；可搭配 localStorage、Supabase 或其他 API。
========================================================= */
(function (global) {
  "use strict";

  function defaultNormalizeText(value) {
    return String(value ?? "").trim().toLocaleLowerCase("zh-Hant");
  }

  function defaultGetId(item) {
    return item?.id ?? null;
  }

  function defaultGetName(item) {
    return String(item?.name ?? "");
  }

  function defaultCreateId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  }

  class SelectOrCreate {
    constructor(options = {}) {
      this.items = Array.isArray(options.items) ? [...options.items] : [];
      this.getId = options.getId || defaultGetId;
      this.getName = options.getName || defaultGetName;
      this.normalizeText = options.normalizeText || defaultNormalizeText;
      this.createId = options.createId || defaultCreateId;
      this.maxResults = Number.isFinite(options.maxResults) ? options.maxResults : 20;
      this.onSelect = typeof options.onSelect === "function" ? options.onSelect : null;
      this.onCreate = typeof options.onCreate === "function" ? options.onCreate : null;
      this.selectedItem = null;
    }

    setItems(items) {
      this.items = Array.isArray(items) ? [...items] : [];
      return this;
    }

    getItems() {
      return [...this.items];
    }

    getSelected() {
      return this.selectedItem;
    }

    clearSelection() {
      this.selectedItem = null;
      return null;
    }

    findById(id) {
      return this.items.find(item => String(this.getId(item)) === String(id)) || null;
    }

    findDuplicateByName(name) {
      const normalized = this.normalizeText(name);
      if (!normalized) return null;

      return this.items.find(item =>
        this.normalizeText(this.getName(item)) === normalized
      ) || null;
    }

    search(keyword) {
      const q = this.normalizeText(keyword);
      this.clearSelection();

      if (!q) return [];

      return this.items
        .filter(item => {
          const name = this.normalizeText(this.getName(item));
          const id = String(this.getId(item) ?? "");
          return name.includes(q) || id.includes(String(keyword ?? "").trim());
        })
        .slice(0, this.maxResults);
    }

    selectById(id) {
      const item = this.findById(id);
      if (!item) return null;

      this.selectedItem = item;
      if (this.onSelect) this.onSelect(item, { reason: "select" });
      return item;
    }

    async addOrSelect(name, extra = {}) {
      const cleanName = String(name ?? "").trim();
      if (!cleanName) {
        return { status: "invalid", item: null, created: false };
      }

      const existing = this.findDuplicateByName(cleanName);
      if (existing) {
        this.selectedItem = existing;
        if (this.onSelect) this.onSelect(existing, { reason: "duplicate" });
        return { status: "existing", item: existing, created: false };
      }

      let newItem = {
        id: this.createId(),
        name: cleanName,
        ...extra
      };

      if (this.onCreate) {
        const created = await this.onCreate(newItem);
        if (created) newItem = created;
      }

      this.items.push(newItem);
      this.selectedItem = newItem;

      if (this.onSelect) this.onSelect(newItem, { reason: "create" });

      return { status: "created", item: newItem, created: true };
    }
  }

  global.SelectOrCreate = SelectOrCreate;
})(window);
