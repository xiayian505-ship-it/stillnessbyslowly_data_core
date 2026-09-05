/*!
 * Fiction_data.js
 * stillness by slowly
 *
 * 從「作品探索 / Fiction Index」拆出的共用資料底層。
 * 預設使用 localStorage；保留 Adapter 介面，之後可替換成 Supabase / 其他資料來源。
 *
 * 用法：
 * <script src="https://lib.stillnessbyslowly.com/Fiction_data.js"></script>
 *
 * const db = FictionData.create({
 *   namespace: "my-project"
 * });
 *
 * const works = db.collection("works");
 * await works.add({ title: "作品 A" });
 * const list = await works.all();
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  /* =========================================================
     基礎工具
  ========================================================= */

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

  function getByPath(object, path) {
    if (!path) return object;

    return String(path)
      .split(".")
      .reduce((current, key) => {
        if (current == null) return undefined;
        return current[key];
      }, object);
  }

  function unique(values) {
    return [...new Set(values)];
  }

  /* =========================================================
     LocalStorage Adapter
     之後如果要接 Supabase，只要做一個相同介面的 Adapter
  ========================================================= */

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
          `[FictionData] 無法解析 localStorage：${collectionName}`,
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

  /* =========================================================
     Collection
  ========================================================= */

  class Collection {
    constructor(store, name, options = {}) {
      this.store = store;
      this.name = normalizeText(name);

      if (!this.name) {
        throw new Error("[FictionData] collection 名稱不能是空白。");
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
          `[FictionData] ${this.name} 已存在相同 ID：${record[this.idField]}`
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
          `[FictionData] ${this.name} 找不到 ID：${id}`
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
          `[FictionData] ${this.name}.replace() 必須傳入陣列。`
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
          `[FictionData] ${this.name}.find() 需要函式。`
        );
      }

      const records = await this.all();
      return records.find(predicate) || null;
    }

    async filter(predicate) {
      if (typeof predicate !== "function") {
        throw new TypeError(
          `[FictionData] ${this.name}.filter() 需要函式。`
        );
      }

      const records = await this.all();
      return records.filter(predicate);
    }

    async query(options = {}) {
      const records = await this.all();
      return query(records, options);
    }
  }

  /* =========================================================
     Store
  ========================================================= */

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
          "[FictionData] collection 名稱不能是空白。"
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
          "[FictionData] 目前 Adapter 不支援 clearAll()。"
        );
      }

      await this.adapter.clearNamespace();
    }
  }

  /* =========================================================
     搜尋 / 篩選 / 排序 / 分頁
  ========================================================= */

  function search(items, keyword, fields = []) {
    const q = normalizeText(keyword)
      .toLocaleLowerCase("zh-Hant");

    if (!q) return [...items];

    return items.filter(item => {
      const values =
        fields.length > 0
          ? fields.map(field => getByPath(item, field))
          : Object.values(item || {});

      const blob = values
        .flatMap(value => {
          if (Array.isArray(value)) return value;
          if (
            value &&
            typeof value === "object"
          ) {
            return Object.values(value);
          }
          return [value];
        })
        .map(value => String(value ?? ""))
        .join(" ")
        .toLocaleLowerCase("zh-Hant");

      return blob.includes(q);
    });
  }

  function filter(items, rules = {}) {
    let result = [...items];

    if (
      typeof rules.predicate === "function"
    ) {
      result = result.filter(rules.predicate);
    }

    if (rules.equals) {
      Object.entries(rules.equals).forEach(
        ([field, expected]) => {
          if (
            expected === "" ||
            expected === null ||
            expected === undefined
          ) {
            return;
          }

          result = result.filter(
            item =>
              String(getByPath(item, field)) ===
              String(expected)
          );
        }
      );
    }

    if (rules.boolean) {
      Object.entries(rules.boolean).forEach(
        ([field, expected]) => {
          if (expected === null || expected === undefined) {
            return;
          }

          result = result.filter(
            item =>
              Boolean(getByPath(item, field)) ===
              Boolean(expected)
          );
        }
      );
    }

    if (rules.containsAll) {
      Object.entries(rules.containsAll).forEach(
        ([field, required]) => {
          const wanted = Array.isArray(required)
            ? required
            : [];

          if (!wanted.length) return;

          result = result.filter(item => {
            const source = getByPath(item, field);
            const values = Array.isArray(source)
              ? source
              : [];

            return wanted.every(value =>
              values.includes(value)
            );
          });
        }
      );
    }

    if (rules.containsAny) {
      Object.entries(rules.containsAny).forEach(
        ([field, required]) => {
          const wanted = Array.isArray(required)
            ? required
            : [];

          if (!wanted.length) return;

          result = result.filter(item => {
            const source = getByPath(item, field);
            const values = Array.isArray(source)
              ? source
              : [];

            return wanted.some(value =>
              values.includes(value)
            );
          });
        }
      );
    }

    return result;
  }

  function sort(items, options = {}) {
    const {
      field = "createdAt",
      direction = "asc",
      type = "auto",
      compare
    } = options;

    const sign = direction === "desc" ? -1 : 1;
    const result = [...items];

    result.sort((a, b) => {
      if (typeof compare === "function") {
        return compare(a, b) * sign;
      }

      const av = getByPath(a, field);
      const bv = getByPath(b, field);

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (type === "number") {
        return (Number(av) - Number(bv)) * sign;
      }

      if (type === "date") {
        return (
          new Date(av).getTime() -
          new Date(bv).getTime()
        ) * sign;
      }

      if (type === "string") {
        return String(av).localeCompare(
          String(bv),
          "zh-Hant"
        ) * sign;
      }

      const aNumber = Number(av);
      const bNumber = Number(bv);

      if (
        av !== "" &&
        bv !== "" &&
        Number.isFinite(aNumber) &&
        Number.isFinite(bNumber)
      ) {
        return (aNumber - bNumber) * sign;
      }

      const aDate = new Date(av);
      const bDate = new Date(bv);

      if (
        !Number.isNaN(aDate.getTime()) &&
        !Number.isNaN(bDate.getTime())
      ) {
        return (
          aDate.getTime() - bDate.getTime()
        ) * sign;
      }

      return String(av).localeCompare(
        String(bv),
        "zh-Hant"
      ) * sign;
    });

    return result;
  }

  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [
        result[j],
        result[i]
      ];
    }

    return result;
  }

  function paginate(items, options = {}) {
    const pageSize = Math.max(
      1,
      Number(options.pageSize) || 12
    );

    const totalItems = items.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / pageSize)
    );

    const requestedPage =
      Number(options.page) || 1;

    const page = Math.min(
      Math.max(1, requestedPage),
      totalPages
    );

    const startIndex = (page - 1) * pageSize;
    const data = items.slice(
      startIndex,
      startIndex + pageSize
    );

    return {
      data,
      page,
      pageSize,
      totalItems,
      totalPages,
      startIndex,
      endIndex:
        data.length > 0
          ? startIndex + data.length - 1
          : startIndex,
      hasPrevious: page > 1,
      hasNext: page < totalPages
    };
  }

  function query(items, options = {}) {
    let result = [...items];

    if (options.search) {
      const config =
        typeof options.search === "string"
          ? { keyword: options.search }
          : options.search;

      result = search(
        result,
        config.keyword,
        config.fields || []
      );
    }

    if (options.filter) {
      result = filter(result, options.filter);
    }

    if (options.shuffle) {
      result = shuffle(result);
    }

    if (options.sort) {
      result = sort(result, options.sort);
    }

    if (options.page) {
      return paginate(result, options.page);
    }

    return result;
  }

  /* =========================================================
     對外 API
  ========================================================= */

  const FictionData = Object.freeze({
    version: VERSION,

    create(options = {}) {
      return new Store(options);
    },

    adapters: Object.freeze({
      LocalStorageAdapter
    }),

    utils: Object.freeze({
      randomId,
      deepClone,
      normalizeText,
      getByPath,
      unique,
      search,
      filter,
      sort,
      shuffle,
      paginate,
      query
    })
  });

  Object.defineProperty(global, "FictionData", {
    value: FictionData,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);
