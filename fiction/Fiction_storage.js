/*!
 * Fiction_storage.js
 * stillness by slowly
 *
 * 從 Fiction_data.js 拆出的獨立 localStorage / CRUD 資料層。
 * 保留 Adapter 介面，之後可替換成其他資料來源。
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function randomId(prefix = "id") {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function deepClone(value) {
    if (typeof global.structuredClone === "function") {
      return global.structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  class LocalStorageAdapter {
    constructor(namespace) {
      this.namespace = normalizeText(namespace) || "fiction-data";
    }

    key(collectionName) {
      return `${this.namespace}:${collectionName}`;
    }

    async read(collectionName) {
      const raw = global.localStorage.getItem(this.key(collectionName));

      if (!raw) return [];

      try {
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(
          `[FictionStorage] 無法解析 localStorage：${collectionName}`,
          error
        );
        return [];
      }
    }

    async write(collectionName, records) {
      global.localStorage.setItem(
        this.key(collectionName),
        JSON.stringify(records)
      );

      return deepClone(records);
    }

    async clear(collectionName) {
      global.localStorage.removeItem(this.key(collectionName));
    }

    async clearNamespace() {
      const prefix = `${this.namespace}:`;
      const keys = [];

      for (let i = 0; i < global.localStorage.length; i++) {
        const key = global.localStorage.key(i);

        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }

      keys.forEach(key => global.localStorage.removeItem(key));
    }
  }

  class Collection {
    constructor(store, name, options = {}) {
      this.store = store;
      this.name = normalizeText(name);

      if (!this.name) {
        throw new Error("[FictionStorage] collection 名稱不能是空白。");
      }

      this.normalize =
        typeof options.normalize === "function"
          ? options.normalize
          : value => value;

      this.idField = normalizeText(options.idField) || "id";
      this.createdAtField =
        normalizeText(options.createdAtField) || "createdAt";
      this.updatedAtField =
        normalizeText(options.updatedAtField) || "updatedAt";
    }

    prepare(raw, { isNew = false } = {}) {
      const now = new Date().toISOString();

      let record = deepClone(raw ?? {});

      if (!record[this.idField]) {
        record[this.idField] = randomId(this.name);
      }

      if (isNew && !record[this.createdAtField]) {
        record[this.createdAtField] = now;
      }

      record[this.updatedAtField] = now;

      record = this.normalize(record);

      return deepClone(record);
    }

    async all() {
      const records = await this.store.adapter.read(this.name);
      return deepClone(records);
    }

    async get(id) {
      const records = await this.all();

      return (
        records.find(
          item =>
            String(item?.[this.idField]) === String(id)
        ) || null
      );
    }

    async has(id) {
      return Boolean(await this.get(id));
    }

    async add(raw) {
      const records = await this.all();
      const record = this.prepare(raw, { isNew: true });

      const duplicate = records.some(
        item =>
          String(item?.[this.idField]) ===
          String(record[this.idField])
      );

      if (duplicate) {
        throw new Error(
          `[FictionStorage] ${this.name} 已存在相同 ID：${record[this.idField]}`
        );
      }

      records.push(record);
      await this.store.adapter.write(this.name, records);

      return deepClone(record);
    }

    async update(idOrRecord, patch = null) {
      const records = await this.all();

      const id =
        patch === null
          ? idOrRecord?.[this.idField]
          : idOrRecord;

      const index = records.findIndex(
        item =>
          String(item?.[this.idField]) === String(id)
      );

      if (index < 0) {
        throw new Error(
          `[FictionStorage] ${this.name} 找不到 ID：${id}`
        );
      }

      const incoming =
        patch === null
          ? idOrRecord
          : { ...records[index], ...patch };

      const merged = {
        ...records[index],
        ...deepClone(incoming),
        [this.idField]: records[index][this.idField],
        [this.createdAtField]:
          records[index][this.createdAtField] ||
          incoming?.[this.createdAtField] ||
          new Date().toISOString()
      };

      const saved = this.prepare(merged);
      records[index] = saved;

      await this.store.adapter.write(this.name, records);

      return deepClone(saved);
    }

    async upsert(raw) {
      const id = raw?.[this.idField];

      if (id && (await this.has(id))) {
        return this.update(raw);
      }

      return this.add(raw);
    }

    async remove(id) {
      const records = await this.all();

      const next = records.filter(
        item =>
          String(item?.[this.idField]) !== String(id)
      );

      const removed = next.length !== records.length;

      if (removed) {
        await this.store.adapter.write(this.name, next);
      }

      return removed;
    }

    async replace(records) {
      if (!Array.isArray(records)) {
        throw new TypeError(
          `[FictionStorage] ${this.name}.replace() 必須傳入陣列。`
        );
      }

      const prepared = records.map(record => {
        const cloned = deepClone(record);

        if (!cloned[this.idField]) {
          cloned[this.idField] = randomId(this.name);
        }

        if (!cloned[this.createdAtField]) {
          cloned[this.createdAtField] =
            new Date().toISOString();
        }

        return this.prepare(cloned);
      });

      await this.store.adapter.write(this.name, prepared);

      return deepClone(prepared);
    }

    async clear() {
      await this.store.adapter.clear(this.name);
    }

    async count() {
      return (await this.all()).length;
    }

    async find(predicate) {
      if (typeof predicate !== "function") {
        throw new TypeError(
          `[FictionStorage] ${this.name}.find() 需要函式。`
        );
      }

      const records = await this.all();
      return records.find(predicate) || null;
    }

    async filter(predicate) {
      if (typeof predicate !== "function") {
        throw new TypeError(
          `[FictionStorage] ${this.name}.filter() 需要函式。`
        );
      }

      const records = await this.all();
      return records.filter(predicate);
    }
  }

  class Store {
    constructor(options = {}) {
      const namespace =
        normalizeText(options.namespace) || "fiction-data";

      this.namespace = namespace;
      this.adapter =
        options.adapter ||
        new LocalStorageAdapter(namespace);

      this.collectionOptions =
        options.collections || {};

      this.cache = new Map();
    }

    collection(name, options = {}) {
      const key = normalizeText(name);

      if (!key) {
        throw new Error(
          "[FictionStorage] collection 名稱不能是空白。"
        );
      }

      if (!this.cache.has(key)) {
        this.cache.set(
          key,
          new Collection(this, key, {
            ...(this.collectionOptions[key] || {}),
            ...options
          })
        );
      }

      return this.cache.get(key);
    }

    async clearAll() {
      if (
        typeof this.adapter.clearNamespace !== "function"
      ) {
        throw new Error(
          "[FictionStorage] 目前 Adapter 不支援 clearAll()。"
        );
      }

      await this.adapter.clearNamespace();
    }
  }

  const FictionStorage = Object.freeze({
    version: VERSION,

    create(options = {}) {
      return new Store(options);
    },

    adapters: Object.freeze({
      LocalStorageAdapter
    })
  });

  Object.defineProperty(global, "FictionStorage", {
    value: FictionStorage,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);
