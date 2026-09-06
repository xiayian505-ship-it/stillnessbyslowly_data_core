/* =========================================================
   Mail.js
   Public Mail Client / Interface Contract
   Version: 1.0.0
========================================================= */

/**
 * SECURITY PRINCIPLE
 * ---------------------------------------------------------
 * Assume this entire file is public.
 *
 * Anything that must remain secret
 * DOES NOT belong in this file.
 *
 * 本檔可公開放置於 GitHub / CDN。
 * 不得包含任何 Secret、私人憑證或管理權限。
 */


/* =========================================================
   RESPONSIBILITY
========================================================= */

/**
 * Mail.js 負責：
 *
 * - 提供統一 Mail API 呼叫方式
 * - 即時寄送 request
 * - 排程寄送 request
 * - 取消尚未寄送的任務
 * - 查詢寄送任務狀態
 * - 基本參數檢查
 * - 統一處理 API response / error
 *
 *
 * Mail.js 不負責：
 *
 * - 決定專案何時觸發寄信
 * - 計算生日、節日、N 天後等業務規則
 * - 決定實際收件人
 * - 決定實際寄件人
 * - 真正執行 Email 寄送
 * - Database Schema
 * - Database Table 名稱
 * - 排程器
 * - 權限驗證
 * - Rate Limit
 * - Retry
 * - 防止重複寄送
 */


/* =========================================================
   CONSUMER REQUIREMENTS
========================================================= */

/**
 * 使用 Mail.js 的專案必須自行定義：
 *
 * 1. TRIGGER
 *    什麼條件觸發寄信。
 *
 *    例如：
 *    - 使用者點擊
 *    - 使用者選擇日期
 *    - 預設日期
 *    - 建立資料後 N 天
 *    - 某個狀態成立
 *    - 其他專案自己的條件
 *
 *
 * 2. DELIVERY MODE
 *    要立即寄送，或排程寄送。
 *
 *
 * 3. SEND TIME
 *    如果是排程寄送，
 *    Consumer 必須依自己的規則產生 sendAt。
 *
 *    Mail.js 不負責解釋「生日」、「30 天後」等語意。
 *    Mail.js 只接受最後得到的時間。
 *
 *
 * 4. TEMPLATE / MAIL TYPE
 *    Consumer 必須指定要使用哪種 Email 類型。
 *
 *
 * 5. PAYLOAD
 *    Consumer 必須提供該 Email 所需資料。
 *
 *
 * 6. RECIPIENT SOURCE
 *    Consumer 必須知道收件人從哪裡取得。
 *
 *    但 Client 提供的 recipient 不得被 Backend 直接信任。
 *    實際收件人必須由 Backend 驗證或解析。
 *
 *
 * 如果上述專案規則不存在：
 *
 * → 不得自行假設。
 * → 不得自行創造業務規則。
 * → 應向使用者詢問缺少的資訊。
 */


/* =========================================================
   BACKEND REQUIREMENTS
========================================================= */

/**
 * 使用本模組前，需要真正的 Mail Backend。
 *
 * Backend 應負責：
 *
 * - 接收 Mail.js request
 * - 驗證 request
 * - 驗證 / 解析收件人
 * - 決定真正寄件人
 * - 驗證可使用的 template
 * - 執行 Email 寄送
 * - 執行排程
 * - Rate Limit / Anti-Abuse
 * - 防止重複寄送
 * - 必要時 Retry
 * - 記錄寄送結果
 *
 *
 * SERVER ONLY：
 *
 * - 實際 Mail Domain
 * - 實際寄件地址
 * - Resend API Key
 * - Database Secret / Credentials
 * - Supabase Service Role Key（如使用）
 * - 管理者憑證
 * - 其他任何 Secret
 *
 * 上述資料不得寫入本檔。
 */


/* =========================================================
   DATABASE REQUIREMENT
========================================================= */

/**
 * schedule() 需要 Backend 持久化保存寄送任務。
 *
 * Database / Equivalent Storage 至少應能表達：
 *
 * - 唯一識別值
 * - 寄送時間
 * - 寄送狀態
 * - template / mail type
 * - payload
 * - 建立時間
 *
 * 視 Backend 實作可能還需要：
 *
 * - 寄送完成時間
 * - retry 次數
 * - error 資訊
 * - cancel 狀態
 *
 *
 * IMPORTANT：
 *
 * - Mail.js 不指定 Table 名稱。
 * - Mail.js 不指定欄位名稱。
 * - Mail.js 不建立 Schema。
 * - Mail.js 不假設既有 Database 結構。
 *
 * 如果 Backend 尚未具備必要的持久化結構：
 *
 * → 提醒使用者需要 Database Table / Equivalent Storage。
 * → 不得自行假設 Table / Schema 已存在。
 */


/* =========================================================
   PUBLIC API
========================================================= */

/**
 * Mail.configure(config)
 * Mail.send(options)
 * Mail.schedule(options)
 * Mail.cancel(jobId)
 * Mail.status(jobId)
 *
 * Consumer 不應依賴其他內部函式。
 */


/* =========================================================
   MODULE
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  const config = {
    endpoint: ""
  };


  /* =======================================================
     CONFIGURE
  ======================================================= */

  /**
   * REQUIRED:
   * endpoint 必須由使用本模組的專案提供。
   *
   * endpoint 是公開 API 位址，不是 Secret。
   *
   * 不得在本檔寫入：
   * - Mail Domain
   * - API Key
   * - Service Role Key
   * - Database Password
   */
  function configure(options = {}) {
    if (options.endpoint !== undefined) {
      config.endpoint = String(options.endpoint).trim();
    }

    return api;
  }


  /* =======================================================
     INTERNAL
  ======================================================= */

  function requireEndpoint() {
    if (!config.endpoint) {
      throw new Error(
        "Mail: 尚未設定 Mail API endpoint。請先使用 Mail.configure({ endpoint })。"
      );
    }
  }


  function requireValue(value, name) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      throw new Error(`Mail: 缺少必要參數 "${name}"。`);
    }
  }


  async function request(action, body = {}) {
    requireEndpoint();

    const response = await fetch(config.endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        action,
        ...body
      })
    });


    let result = null;

    try {
      result = await response.json();
    } catch (_) {
      result = null;
    }


    if (!response.ok) {
      const message =
        result?.error ||
        result?.message ||
        `HTTP ${response.status}`;

      throw new Error(`Mail: ${message}`);
    }


    return result;
  }


  /* =======================================================
     SEND
  ======================================================= */

  /**
   * 立即建立寄信要求。
   *
   * Consumer 必須提供：
   * - template
   * - payload
   *
   * recipient 的實際處理由 Backend 規則決定。
   */
  async function send(options = {}) {
    const {
      template,
      payload = {}
    } = options;

    requireValue(template, "template");

    return request("send", {
      template,
      payload
    });
  }


  /* =======================================================
     SCHEDULE
  ======================================================= */

  /**
   * 建立未來寄送任務。
   *
   * Consumer 必須先依自己的業務規則算出 sendAt。
   *
   * Mail.js 不知道 sendAt 為什麼是這一天。
   *
   * 例如：
   *
   * Consumer:
   *   birthday → 計算日期
   *   random day → 計算日期
   *   N days → 計算日期
   *
   * 最後：
   *
   *   Mail.schedule({
   *     template,
   *     sendAt,
   *     payload
   *   });
   *
   * Backend 必須保存並真正執行排程。
   */
  async function schedule(options = {}) {
    const {
      template,
      sendAt,
      payload = {}
    } = options;

    requireValue(template, "template");
    requireValue(sendAt, "sendAt");

    return request("schedule", {
      template,
      sendAt,
      payload
    });
  }


  /* =======================================================
     CANCEL
  ======================================================= */

  /**
   * 取消尚未執行的寄送任務。
   *
   * Backend 必須自行驗證：
   * - job 是否存在
   * - 是否允許取消
   * - 是否已經寄出
   */
  async function cancel(jobId) {
    requireValue(jobId, "jobId");

    return request("cancel", {
      jobId
    });
  }


  /* =======================================================
     STATUS
  ======================================================= */

  /**
   * 查詢寄送任務狀態。
   *
   * 實際 status 名稱由 Backend contract 決定。
   * Mail.js 不預先釘死 Database status schema。
   */
  async function status(jobId) {
    requireValue(jobId, "jobId");

    return request("status", {
      jobId
    });
  }


  /* =======================================================
     EXPORT
  ======================================================= */

  const api = Object.freeze({
    VERSION,
    configure,
    send,
    schedule,
    cancel,
    status
  });


  global.Mail = api;

})(window);
