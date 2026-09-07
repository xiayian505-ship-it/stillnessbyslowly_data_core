/**
 * CommentBoard
 * 輕型留言板功能模組
 *
 * 依賴：
 *   FictionData
 *
 * 設計原則：
 * - JS 只負責留言功能與 DOM 行為，不綁定視覺設計。
 * - 公開使用者：讀取、新增。
 * - 管理者：讀取、新增、編輯、刪除、回覆／修改／刪除回覆。
 * - 排序只提供 createdAt 新→舊、舊→新。
 * - 日期使用原生 Intl.DateTimeFormat 輕量顯示。
 *
 * ============================================================
 * BACKEND SECURITY WARNING
 * ============================================================
 * 目前 FictionData / localStorage 版本沒有真正的伺服器端權限。
 * role / permissions 只控制前端 UI 與 CommentBoard 對外方法，
 * 絕對不能視為真正的安全限制。
 *
 * 未來接公開後端前，必須在資料庫 / API / RLS 層真正限制：
 *
 * PUBLIC
 * - 可 SELECT 公開留言
 * - 只可 INSERT 允許的公開欄位（例如 name、content）
 * - 不可 UPDATE
 * - 不可 DELETE
 * - 不可自行寫入 id、createdAt、updatedAt
 * - 不可寫入 adminReply、adminRepliedAt
 *
 * ADMIN
 * - UPDATE / DELETE / admin reply 必須先驗證管理者身分
 *
 * 另外必須限制公開寫入內容：
 * - 欄位白名單
 * - 字串長度
 * - 資料型別
 * - 必要的頻率限制 / 防濫用機制
 *
 * ⚠ 隱藏按鈕不等於權限控制。
 * ⚠ 上線公開寫入前，不可忘記完成後端限制。
 * ============================================================
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  const DEFAULTS = {
    namespace: "comment_board",
    collection: "comments",
    role: "public",
    sort: "newest",
    locale: "zh-TW",
    selectors: {
      form: "#commentForm",
      name: "#commentName",
      content: "#commentContent",
      list: "#commentList",
      count: "#commentCount",
      sort: "#commentSort",
      status: "#commentStatus",
      formTitle: "#commentFormTitle",
      submit: "#commentSubmit",
      cancelEdit: "#commentCancelEdit"
    },
    labels: {
      addTitle: "新增留言",
      editTitle: "編輯留言",
      submit: "送出留言",
      save: "儲存修改",
      edit: "編輯",
      remove: "刪除",
      reply: "管理者回覆",
      editReply: "修改回覆",
      removeReply: "刪除回覆",
      replyLabel: "管理者回覆",
      empty: "目前沒有留言。",
      added: "留言已新增。",
      updated: "留言已更新。",
      removed: "留言已刪除。",
      replied: "管理者回覆已儲存。",
      replyRemoved: "管理者回覆已刪除。",
      cancelled: "已取消編輯。",
      loadError: "讀取留言時發生錯誤。",
      saveError: "儲存失敗，請查看 console。"
    }
  };

  function merge(base, extra) {
    const result = { ...base };
    for (const [key, value] of Object.entries(extra || {})) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        base[key] &&
        typeof base[key] === "object" &&
        !Array.isArray(base[key])
      ) {
        result[key] = merge(base[key], value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function defaultFormatDate(value, locale) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function resolveElement(target) {
    if (!target) return null;
    if (target instanceof Element) return target;
    return document.querySelector(target);
  }

  function createFictionDataAdapter(config) {
    if (!global.FictionData) {
      throw new Error("CommentBoard: FictionData 尚未載入。");
    }

    const db = global.FictionData.create({
      namespace: config.namespace
    });

    const collection = db.collection(config.collection);

    return {
      async list(sort) {
        return collection.query({
          sort: {
            field: "createdAt",
            direction: sort === "oldest" ? "asc" : "desc",
            type: "date"
          }
        });
      },

      async get(id) {
        return collection.get(id);
      },

      async create(data) {
        // PUBLIC WRITE
        // 未來接後端時，只能把允許的公開欄位送入 INSERT。
        // 不可讓訪客自行寫入管理欄位或系統欄位。
        return collection.add({
          name: data.name,
          content: data.content,
          adminReply: "",
          adminRepliedAt: null
        });
      },

      async update(id, data) {
        // ADMIN ONLY
        // TODO BACKEND: 後端必須驗證管理者身分，不可依賴前端 role。
        return collection.update(id, data);
      },

      async remove(id) {
        // ADMIN ONLY
        // TODO BACKEND: 後端必須驗證管理者身分，不可依賴前端 role。
        return collection.remove(id);
      },

      async reply(id, content) {
        // ADMIN ONLY
        // TODO BACKEND:
        // adminReply / adminRepliedAt 必須限制為管理者才能寫入。
        return collection.update(id, {
          adminReply: content,
          adminRepliedAt: new Date().toISOString()
        });
      },

      async removeReply(id) {
        // ADMIN ONLY
        // TODO BACKEND: 必須由後端權限限制此操作。
        return collection.update(id, {
          adminReply: "",
          adminRepliedAt: null
        });
      }
    };
  }

  class CommentBoardInstance {
    constructor(options) {
      this.config = merge(DEFAULTS, options || {});
      this.role = this.config.role === "admin" ? "admin" : "public";
      this.sort = this.config.sort === "oldest" ? "oldest" : "newest";
      this.editingId = null;
      this.statusTimer = null;

      this.els = {};
      for (const [key, selector] of Object.entries(this.config.selectors)) {
        this.els[key] = resolveElement(selector);
      }

      if (!this.els.form || !this.els.name || !this.els.content || !this.els.list) {
        throw new Error(
          "CommentBoard: form、name、content、list 為必要元素，請確認 selectors。"
        );
      }

      // BACKEND ADAPTER INTERFACE
      // 未來可傳入自訂 adapter，不必修改 CommentBoard UI / 行為層。
      //
      // adapter 必須提供：
      // list(sort)
      // get(id)
      // create(data)
      // update(id, data)       [ADMIN]
      // remove(id)             [ADMIN]
      // reply(id, content)     [ADMIN]
      // removeReply(id)        [ADMIN]
      //
      // 真正的身分驗證與寫入限制必須由後端完成。
      this.adapter =
        this.config.adapter || createFictionDataAdapter(this.config);

      this.formatDate =
        typeof this.config.formatDate === "function"
          ? this.config.formatDate
          : value => defaultFormatDate(value, this.config.locale);

      this.bindEvents();
      this.applyRole();
    }

    isAdmin() {
      return this.role === "admin";
    }

    applyRole() {
      this.els.form.dataset.commentRole = this.role;
      this.els.list.dataset.commentRole = this.role;
    }

    setStatus(text) {
      if (!this.els.status) return;

      this.els.status.textContent = text;

      if (this.statusTimer) {
        global.clearTimeout(this.statusTimer);
      }

      if (text) {
        this.statusTimer = global.setTimeout(() => {
          if (this.els.status.textContent === text) {
            this.els.status.textContent = "";
          }
        }, 2200);
      }
    }

    resetForm() {
      this.editingId = null;
      this.els.form.reset();

      if (this.els.formTitle) {
        this.els.formTitle.textContent = this.config.labels.addTitle;
      }

      if (this.els.submit) {
        this.els.submit.textContent = this.config.labels.submit;
      }

      if (this.els.cancelEdit) {
        this.els.cancelEdit.hidden = true;
      }
    }

    async load() {
      try {
        const items = await this.adapter.list(this.sort);
        this.render(items || []);
        return items || [];
      } catch (error) {
        console.error(error);
        this.els.list.innerHTML =
          `<p class="comment-board__error">${escapeHtml(this.config.labels.loadError)}</p>`;
        return [];
      }
    }

    render(items) {
      if (this.els.count) {
        this.els.count.textContent = `${items.length} 則`;
      }

      if (!items.length) {
        this.els.list.innerHTML =
          `<p class="comment-board__empty">${escapeHtml(this.config.labels.empty)}</p>`;
        return;
      }

      this.els.list.innerHTML = items.map(item => {
        const hasReply = Boolean(item.adminReply);
        const adminActions = this.isAdmin()
          ? `
            <div class="comment-board__actions">
              <button type="button" data-action="edit">${escapeHtml(this.config.labels.edit)}</button>
              <button type="button" data-action="delete">${escapeHtml(this.config.labels.remove)}</button>
              <button type="button" data-action="reply">
                ${escapeHtml(hasReply ? this.config.labels.editReply : this.config.labels.reply)}
              </button>
              ${
                hasReply
                  ? `<button type="button" data-action="delete-reply">${escapeHtml(this.config.labels.removeReply)}</button>`
                  : ""
              }
            </div>
          `
          : "";

        const reply = hasReply
          ? `
            <section class="comment-board__reply">
              <strong class="comment-board__reply-label">${escapeHtml(this.config.labels.replyLabel)}</strong>
              <div class="comment-board__reply-content">${escapeHtml(item.adminReply)}</div>
              ${
                item.adminRepliedAt
                  ? `<time class="comment-board__reply-time">${escapeHtml(this.formatDate(item.adminRepliedAt))}</time>`
                  : ""
              }
            </section>
          `
          : "";

        return `
          <article class="comment-board__item" data-comment-id="${escapeHtml(item.id)}">
            <header class="comment-board__header">
              <strong class="comment-board__name">${escapeHtml(item.name || "未命名")}</strong>
              <time class="comment-board__time">${escapeHtml(this.formatDate(item.createdAt))}</time>
            </header>

            <div class="comment-board__content">${escapeHtml(item.content)}</div>

            ${reply}
            ${adminActions}
          </article>
        `;
      }).join("");
    }

    bindEvents() {
      this.els.form.addEventListener("submit", async event => {
        event.preventDefault();

        const name = this.els.name.value.trim();
        const content = this.els.content.value.trim();

        if (!name || !content) return;

        try {
          if (this.editingId) {
            if (!this.isAdmin()) {
              throw new Error("CommentBoard: 公開模式不可編輯留言。");
            }

            await this.adapter.update(this.editingId, { name, content });
            this.setStatus(this.config.labels.updated);
          } else {
            await this.adapter.create({ name, content });
            this.setStatus(this.config.labels.added);
          }

          this.resetForm();
          await this.load();
        } catch (error) {
          console.error(error);
          this.setStatus(this.config.labels.saveError);
        }
      });

      if (this.els.cancelEdit) {
        this.els.cancelEdit.addEventListener("click", () => {
          this.resetForm();
          this.setStatus(this.config.labels.cancelled);
        });
      }

      if (this.els.sort) {
        this.els.sort.value = this.sort;
        this.els.sort.addEventListener("change", async () => {
          this.sort = this.els.sort.value === "oldest" ? "oldest" : "newest";
          await this.load();
        });
      }

      this.els.list.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button || !this.isAdmin()) return;

        const card = button.closest("[data-comment-id]");
        if (!card) return;

        const id = card.dataset.commentId;
        const action = button.dataset.action;

        try {
          if (action === "edit") {
            const item = await this.adapter.get(id);
            if (!item) return;

            this.editingId = id;
            this.els.name.value = item.name || "";
            this.els.content.value = item.content || "";

            if (this.els.formTitle) {
              this.els.formTitle.textContent = this.config.labels.editTitle;
            }

            if (this.els.submit) {
              this.els.submit.textContent = this.config.labels.save;
            }

            if (this.els.cancelEdit) {
              this.els.cancelEdit.hidden = false;
            }

            this.els.name.focus();
            return;
          }

          if (action === "delete") {
            if (!global.confirm("確定要刪除這則留言嗎？")) return;

            const removed = await this.adapter.remove(id);
            if (removed) {
              if (this.editingId === id) this.resetForm();
              this.setStatus(this.config.labels.removed);
              await this.load();
            }
            return;
          }

          if (action === "reply") {
            const item = await this.adapter.get(id);
            if (!item) return;

            const value = global.prompt(
              this.config.labels.reply,
              item.adminReply || ""
            );

            if (value === null) return;

            const replyContent = value.trim();
            if (!replyContent) return;

            await this.adapter.reply(id, replyContent);
            this.setStatus(this.config.labels.replied);
            await this.load();
            return;
          }

          if (action === "delete-reply") {
            if (!global.confirm("確定要刪除管理者回覆嗎？")) return;

            await this.adapter.removeReply(id);
            this.setStatus(this.config.labels.replyRemoved);
            await this.load();
          }
        } catch (error) {
          console.error(error);
          this.setStatus(this.config.labels.saveError);
        }
      });
    }
  }

  global.CommentBoard = Object.freeze({
    version: VERSION,

    create(options) {
      const instance = new CommentBoardInstance(options);
      instance.load();
      return instance;
    }
  });
})(window);
