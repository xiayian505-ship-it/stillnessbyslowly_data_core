/*!
 * Slowly Data CRUD Component v1
 * stillness by slowly
 *
 * 依賴：
 * - Timestamp.create()    https://lib.stillnessbyslowly.com/date/timestamp.js
 * - FictionStorage       https://lib.stillnessbyslowly.com/fiction/Fiction_storage.js
 *
 * 元件負責：
 * - localStorage CRUD 操作
 * - schema 驅動的列表 / 詳情 / 新增 / 編輯 UI
 * - 基礎欄位驗證
 * - 自動產生資料 ID
 *
 * 宿主負責：
 * - target
 * - 唯一 storageKey
 * - fields 欄位設定
 * - 視覺覆寫（建議透過 CSS --sdc-* 變數）
 *
 * 重要：
 * - storageKey 沒有預設值，空白時會直接停止初始化。
 * - id / createdAt / updatedAt 為系統欄位，不會出現在表單中。
 * - 不要在元件內自行重做 localStorage 或 Timestamp；資料層交給既有倉庫模組。
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const SUPPORTED_TYPES = new Set([
    "text",
    "number",
    "textarea",
    "date",
    "select",
    "checkbox"
  ]);

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function escapeSelectorId(value) {
    if (global.CSS && typeof global.CSS.escape === "function") {
      return global.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function clone(value) {
    if (typeof global.structuredClone === "function") {
      return global.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function resolveTarget(target) {
    if (typeof target === "string") {
      const element = global.document.querySelector(target);
      if (!element) {
        throw new Error(`[SlowlyDataCRUD] 找不到 target：${target}`);
      }
      return element;
    }

    if (target instanceof global.HTMLElement) {
      return target;
    }

    throw new TypeError(
      "[SlowlyDataCRUD] target 必須是 selector 字串或 HTMLElement。"
    );
  }

  function normalizeOptions(rawOptions) {
    const options = rawOptions ?? {};

    const storageKey = normalizeText(options.storageKey);
    if (!storageKey) {
      throw new Error(
        "[SlowlyDataCRUD] storageKey 為必填，且不可為空白。每個工具請使用自己的唯一 storageKey。"
      );
    }

    if (!Array.isArray(options.fields) || options.fields.length === 0) {
      throw new TypeError(
        "[SlowlyDataCRUD] fields 必須是至少包含一個欄位的陣列。"
      );
    }

    const seenKeys = new Set();

    const fields = options.fields.map((rawField, index) => {
      const field = rawField ?? {};
      const key = normalizeText(field.key);
      const label = normalizeText(field.label);
      const type = normalizeText(field.type || "text").toLowerCase();

      if (!key) {
        throw new Error(
          `[SlowlyDataCRUD] fields[${index}] 缺少 key。`
        );
      }

      if (seenKeys.has(key)) {
        throw new Error(
          `[SlowlyDataCRUD] fields 出現重複 key：${key}`
        );
      }
      seenKeys.add(key);

      if (!label) {
        throw new Error(
          `[SlowlyDataCRUD] fields[${index}] (${key}) 缺少 label。`
        );
      }

      if (!SUPPORTED_TYPES.has(type)) {
        throw new Error(
          `[SlowlyDataCRUD] ${key} 使用不支援的 type：${type}`
        );
      }

      let selectOptions = null;

      if (type === "select") {
        if (!Array.isArray(field.options) || field.options.length === 0) {
          throw new Error(
            `[SlowlyDataCRUD] select 欄位 ${key} 必須提供非空的 options。`
          );
        }

        selectOptions = field.options.map((option, optionIndex) => {
          if (
            option &&
            typeof option === "object" &&
            !Array.isArray(option)
          ) {
            if (!("value" in option)) {
              throw new Error(
                `[SlowlyDataCRUD] ${key}.options[${optionIndex}] 缺少 value。`
              );
            }

            return {
              value: String(option.value),
              label: String(
                option.label ?? option.value
              )
            };
          }

          return {
            value: String(option),
            label: String(option)
          };
        });
      }

      return {
        key,
        label,
        type,
        required: Boolean(field.required),
        placeholder: String(field.placeholder ?? ""),
        defaultValue:
          field.defaultValue !== undefined
            ? clone(field.defaultValue)
            : type === "checkbox"
              ? false
              : "",
        list: field.list !== false,
        options: selectOptions
      };
    });

    return {
      target: resolveTarget(options.target),
      storageKey,
      fields,
      emptyText: String(options.emptyText ?? "目前沒有資料。"),
      addLabel: String(options.addLabel ?? "新增"),
      title: String(options.title ?? ""),
      confirmDelete:
        typeof options.confirmDelete === "function"
          ? options.confirmDelete
          : null
    };
  }

  function assertDependencies() {
    if (
      !global.Timestamp ||
      typeof global.Timestamp.create !== "function"
    ) {
      throw new Error(
        "[SlowlyDataCRUD] 缺少 Timestamp.create()。請先載入 date/timestamp.js。"
      );
    }

    if (
      !global.FictionStorage ||
      typeof global.FictionStorage.create !== "function"
    ) {
      throw new Error(
        "[SlowlyDataCRUD] 缺少 FictionStorage。請先載入 fiction/Fiction_storage.js。"
      );
    }
  }

  function displayValue(field, value) {
    if (field.type === "checkbox") {
      return value ? "是" : "否";
    }

    if (field.type === "select" && field.options) {
      const matched = field.options.find(
        option => String(option.value) === String(value)
      );
      return matched ? matched.label : String(value ?? "");
    }

    return String(value ?? "");
  }

  function hasDisplayValue(field, value) {
    if (field.type === "checkbox") return true;
    return value !== null &&
      value !== undefined &&
      String(value).trim() !== "";
  }

  class DataCRUDComponent {
    constructor(rawOptions) {
      assertDependencies();

      this.options = normalizeOptions(rawOptions);
      this.target = this.options.target;
      this.fields = this.options.fields;

      this.store = global.FictionStorage.create({
        namespace: this.options.storageKey
      });

      // storageKey 由宿主決定；元件內部固定使用 records collection。
      // 實際 localStorage key 會是：<storageKey>:records
      this.collection = this.store.collection("records");

      this.mode = "closed";
      this.activeId = null;
      this.destroyed = false;

      this.handleRootClick = this.handleRootClick.bind(this);
      this.handleFormSubmit = this.handleFormSubmit.bind(this);

      this.renderShell();
      this.refresh();
    }

    renderShell() {
      this.target.innerHTML = "";

      const root = global.document.createElement("section");
      root.className = "slowly-data-crud";
      root.dataset.sdcVersion = VERSION;

      const toolbar = global.document.createElement("div");
      toolbar.className = "sdc-toolbar";

      const heading = global.document.createElement("div");
      heading.className = "sdc-heading";

      if (this.options.title) {
        const title = global.document.createElement("h2");
        title.className = "sdc-title";
        title.textContent = this.options.title;
        heading.append(title);
      }

      const count = global.document.createElement("div");
      count.className = "sdc-count";
      count.setAttribute("aria-live", "polite");
      heading.append(count);

      const addButton = global.document.createElement("button");
      addButton.type = "button";
      addButton.className = "sdc-button sdc-button-primary";
      addButton.dataset.sdcAction = "create";
      addButton.textContent = this.options.addLabel;

      toolbar.append(heading, addButton);

      const layout = global.document.createElement("div");
      layout.className = "sdc-layout";

      const list = global.document.createElement("div");
      list.className = "sdc-list";
      list.setAttribute("aria-live", "polite");

      const panel = global.document.createElement("aside");
      panel.className = "sdc-panel";
      panel.hidden = true;

      layout.append(list, panel);
      root.append(toolbar, layout);

      root.addEventListener("click", this.handleRootClick);

      this.root = root;
      this.countElement = count;
      this.listElement = list;
      this.panelElement = panel;

      this.target.append(root);
    }

    async refresh() {
      this.ensureAlive();
      const records = await this.collection.all();
      this.records = records;
      this.renderList(records);
      return clone(records);
    }

    renderList(records) {
      this.countElement.textContent = `共 ${records.length} 筆`;

      this.listElement.innerHTML = "";

      if (records.length === 0) {
        const empty = global.document.createElement("div");
        empty.className = "sdc-empty";
        empty.textContent = this.options.emptyText;
        this.listElement.append(empty);
        return;
      }

      records.forEach(record => {
        this.listElement.append(this.createListItem(record));
      });
    }

    createListItem(record) {
      const item = global.document.createElement("article");
      item.className = "sdc-item";

      const main = global.document.createElement("div");
      main.className = "sdc-item-main";

      const primaryField = this.fields[0];
      const primaryValue = displayValue(
        primaryField,
        record?.[primaryField.key]
      );

      const title = global.document.createElement("div");
      title.className = "sdc-item-title";
      title.textContent =
        primaryValue || `未填寫${primaryField.label}`;
      main.append(title);

      const meta = global.document.createElement("dl");
      meta.className = "sdc-item-meta";

      this.fields.slice(1).forEach(field => {
        if (!field.list) return;

        const value = record?.[field.key];
        if (!hasDisplayValue(field, value)) return;

        const row = global.document.createElement("div");
        row.className = "sdc-item-meta-row";

        const dt = global.document.createElement("dt");
        dt.textContent = field.label;

        const dd = global.document.createElement("dd");
        dd.textContent = displayValue(field, value);

        row.append(dt, dd);
        meta.append(row);
      });

      if (meta.childElementCount > 0) {
        main.append(meta);
      }

      const actions = global.document.createElement("div");
      actions.className = "sdc-item-actions";

      actions.append(
        this.createActionButton("view", "查看", record.id),
        this.createActionButton("edit", "編輯", record.id),
        this.createActionButton("delete", "刪除", record.id, true)
      );

      item.append(main, actions);
      return item;
    }

    createActionButton(action, label, id, danger = false) {
      const button = global.document.createElement("button");
      button.type = "button";
      button.className =
        "sdc-button sdc-button-small" +
        (danger ? " sdc-button-danger" : "");
      button.dataset.sdcAction = action;
      button.dataset.sdcId = String(id);
      button.textContent = label;
      return button;
    }

    handleRootClick(event) {
      const button = event.target.closest("[data-sdc-action]");
      if (!button || !this.root.contains(button)) return;

      const action = button.dataset.sdcAction;
      const id = button.dataset.sdcId;

      if (action === "create") {
        this.openCreate();
      } else if (action === "view") {
        this.openView(id);
      } else if (action === "edit") {
        this.openEdit(id);
      } else if (action === "delete") {
        this.deleteRecord(id);
      } else if (action === "close") {
        this.closePanel();
      } else if (action === "edit-active") {
        this.openEdit(this.activeId);
      }
    }

    openCreate() {
      this.ensureAlive();
      this.mode = "create";
      this.activeId = null;
      this.renderFormPanel(null);
    }

    async openView(id) {
      this.ensureAlive();
      const record = await this.collection.get(id);
      if (!record) {
        await this.refresh();
        this.closePanel();
        return null;
      }

      this.mode = "view";
      this.activeId = record.id;
      this.renderViewPanel(record);
      return clone(record);
    }

    async openEdit(id) {
      this.ensureAlive();
      const record = await this.collection.get(id);
      if (!record) {
        await this.refresh();
        this.closePanel();
        return null;
      }

      this.mode = "edit";
      this.activeId = record.id;
      this.renderFormPanel(record);
      return clone(record);
    }

    renderPanelHeader(titleText) {
      this.panelElement.innerHTML = "";
      this.panelElement.hidden = false;

      const header = global.document.createElement("div");
      header.className = "sdc-panel-header";

      const title = global.document.createElement("h3");
      title.className = "sdc-panel-title";
      title.textContent = titleText;

      const close = global.document.createElement("button");
      close.type = "button";
      close.className = "sdc-button sdc-button-small";
      close.dataset.sdcAction = "close";
      close.textContent = "關閉";

      header.append(title, close);
      this.panelElement.append(header);
    }

    renderViewPanel(record) {
      const primaryField = this.fields[0];
      const primaryValue = displayValue(
        primaryField,
        record?.[primaryField.key]
      );

      this.renderPanelHeader(
        primaryValue || "查看資料"
      );

      const detail = global.document.createElement("dl");
      detail.className = "sdc-detail";

      this.fields.forEach(field => {
        const row = global.document.createElement("div");
        row.className = "sdc-detail-row";

        const dt = global.document.createElement("dt");
        dt.textContent = field.label;

        const dd = global.document.createElement("dd");
        const value = record?.[field.key];
        dd.textContent = hasDisplayValue(field, value)
          ? displayValue(field, value)
          : "—";

        row.append(dt, dd);
        detail.append(row);
      });

      const footer = global.document.createElement("div");
      footer.className = "sdc-panel-actions";

      const edit = global.document.createElement("button");
      edit.type = "button";
      edit.className = "sdc-button sdc-button-primary";
      edit.dataset.sdcAction = "edit-active";
      edit.textContent = "編輯";

      footer.append(edit);

      this.panelElement.append(detail, footer);
    }

    renderFormPanel(record) {
      const isEdit = Boolean(record);
      this.renderPanelHeader(isEdit ? "編輯資料" : "新增資料");

      const form = global.document.createElement("form");
      form.className = "sdc-form";
      form.noValidate = true;
      form.addEventListener("submit", this.handleFormSubmit);

      this.fields.forEach(field => {
        form.append(
          this.createFieldControl(
            field,
            isEdit
              ? record?.[field.key]
              : clone(field.defaultValue)
          )
        );
      });

      const message = global.document.createElement("div");
      message.className = "sdc-status";
      message.setAttribute("role", "status");
      message.setAttribute("aria-live", "polite");

      const actions = global.document.createElement("div");
      actions.className = "sdc-panel-actions";

      const save = global.document.createElement("button");
      save.type = "submit";
      save.className = "sdc-button sdc-button-primary";
      save.textContent = "儲存";

      const cancel = global.document.createElement("button");
      cancel.type = "button";
      cancel.className = "sdc-button";
      cancel.dataset.sdcAction = "close";
      cancel.textContent = "取消";

      actions.append(save, cancel);
      form.append(message, actions);
      this.panelElement.append(form);

      this.formElement = form;
      this.statusElement = message;

      const firstControl = form.querySelector(
        "input:not([type='checkbox']), textarea, select"
      );
      if (firstControl) {
        global.setTimeout(() => firstControl.focus(), 0);
      }
    }

    createFieldControl(field, value) {
      const wrapper = global.document.createElement("div");
      wrapper.className = "sdc-field";
      wrapper.dataset.sdcField = field.key;

      const controlId =
        `sdc-${this.options.storageKey}-${field.key}`
          .replace(/\s+/g, "-");

      if (field.type === "checkbox") {
        const line = global.document.createElement("label");
        line.className = "sdc-checkbox-line";

        const input = global.document.createElement("input");
        input.type = "checkbox";
        input.name = field.key;
        input.id = controlId;
        input.checked = Boolean(value);

        const text = global.document.createElement("span");
        text.textContent =
          field.label + (field.required ? " *" : "");

        line.append(input, text);
        wrapper.append(line);
        return wrapper;
      }

      const label = global.document.createElement("label");
      label.className = "sdc-label";
      label.htmlFor = controlId;
      label.textContent =
        field.label + (field.required ? " *" : "");

      let control;

      if (field.type === "textarea") {
        control = global.document.createElement("textarea");
        control.rows = 4;
      } else if (field.type === "select") {
        control = global.document.createElement("select");

        if (!field.required) {
          const blank = global.document.createElement("option");
          blank.value = "";
          blank.textContent = "請選擇";
          control.append(blank);
        }

        field.options.forEach(option => {
          const item = global.document.createElement("option");
          item.value = option.value;
          item.textContent = option.label;
          control.append(item);
        });
      } else {
        control = global.document.createElement("input");
        control.type = field.type;
      }

      control.id = controlId;
      control.name = field.key;
      control.className = "sdc-control";
      control.required = field.required;

      if (field.placeholder && field.type !== "select") {
        control.placeholder = field.placeholder;
      }

      if (field.type === "number") {
        control.value =
          value === null || value === undefined
            ? ""
            : String(value);
      } else {
        control.value = String(value ?? "");
      }

      wrapper.append(label, control);
      return wrapper;
    }

    handleFormSubmit(event) {
      event.preventDefault();
      this.saveForm();
    }

    readFormValues() {
      const values = {};

      for (const field of this.fields) {
        const selector =
          `[name="${escapeSelectorId(field.key)}"]`;
        const control = this.formElement.querySelector(selector);

        if (!control) continue;

        if (field.type === "checkbox") {
          values[field.key] = control.checked;
          continue;
        }

        const raw = control.value;

        if (field.required && String(raw).trim() === "") {
          control.focus();
          throw new Error(`${field.label}為必填。`);
        }

        if (field.type === "number") {
          values[field.key] =
            String(raw).trim() === ""
              ? ""
              : Number(raw);

          if (
            values[field.key] !== "" &&
            !Number.isFinite(values[field.key])
          ) {
            control.focus();
            throw new Error(`${field.label}必須是有效數字。`);
          }
        } else {
          values[field.key] = raw;
        }
      }

      return values;
    }

    async saveForm() {
      this.ensureAlive();

      if (!this.formElement) return;

      this.statusElement.textContent = "";

      let values;

      try {
        values = this.readFormValues();
      } catch (error) {
        this.statusElement.textContent = error.message;
        return;
      }

      try {
        if (this.mode === "edit" && this.activeId) {
          await this.collection.update(this.activeId, values);
        } else {
          const id = global.Timestamp.create();

          if (!id) {
            throw new Error(
              "[SlowlyDataCRUD] Timestamp.create() 無法產生 ID。"
            );
          }

          await this.collection.add({
            id,
            ...values
          });
        }

        await this.refresh();
        this.closePanel();
      } catch (error) {
        console.error(error);
        this.statusElement.textContent =
          error?.message || "儲存失敗。";
      }
    }

    async deleteRecord(id) {
      this.ensureAlive();

      const record = await this.collection.get(id);
      if (!record) {
        await this.refresh();
        return false;
      }

      let approved;

      if (this.options.confirmDelete) {
        approved = await this.options.confirmDelete(
          clone(record)
        );
      } else {
        approved = global.confirm("確定要刪除這筆資料嗎？");
      }

      if (!approved) return false;

      const removed = await this.collection.remove(id);

      if (
        removed &&
        String(this.activeId) === String(id)
      ) {
        this.closePanel();
      }

      await this.refresh();
      return removed;
    }

    closePanel() {
      if (!this.panelElement) return;

      const form = this.panelElement.querySelector("form");
      if (form) {
        form.removeEventListener(
          "submit",
          this.handleFormSubmit
        );
      }

      this.panelElement.innerHTML = "";
      this.panelElement.hidden = true;

      this.formElement = null;
      this.statusElement = null;
      this.mode = "closed";
      this.activeId = null;
    }

    ensureAlive() {
      if (this.destroyed) {
        throw new Error(
          "[SlowlyDataCRUD] 此元件已 destroy()。"
        );
      }
    }

    destroy() {
      if (this.destroyed) return;

      if (this.root) {
        this.root.removeEventListener(
          "click",
          this.handleRootClick
        );
      }

      this.target.innerHTML = "";
      this.destroyed = true;
    }
  }

  const SlowlyDataCRUD = Object.freeze({
    version: VERSION,

    create(options = {}) {
      return new DataCRUDComponent(options);
    }
  });

  Object.defineProperty(global, "SlowlyDataCRUD", {
    value: SlowlyDataCRUD,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(typeof window !== "undefined" ? window : globalThis);
