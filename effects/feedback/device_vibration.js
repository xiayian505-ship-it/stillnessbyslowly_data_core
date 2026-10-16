/**
 * Slowly Device Vibration v1.0.0
 * 慢慢軍火庫｜Effects / Feedback｜裝置震動
 *
 * 職責：
 * - 包裝瀏覽器 Vibration API，供宿主傳入單次時長或震動／停頓節奏。
 * - 管理單一實例的啟用狀態、背景分頁的安全略過與停止震動。
 * - 不綁定遊戲、卡牌、攻擊／治療等事件名稱。
 *
 * 不負責：
 * - 本機儲存、音效、動畫、UI 按鈕或觸發震動的業務規則。
 * - 在不支援 Vibration API 的裝置上模擬實體震動。
 *
 * 全域 API：window.SlowlyDeviceVibration
 * 引用：<script src="https://lib.stillnessbyslowly.com/effects/feedback/device_vibration.js"></script>
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  /** 逐次查詢，避免載入時就把某個瀏覽器能力永久寫死。 */
  function isSupported() {
    return Boolean(
      global.navigator &&
      typeof global.navigator.vibrate === "function"
    );
  }

  /**
   * 驗證並正規化震動節奏。
   * number 表示單次震動的毫秒數；number[] 交替表示震動、停頓、震動……
   * 不限制宿主的語意和節奏，但不接受負值、非有限數字或空陣列。
   */
  function normalizePattern(pattern) {
    function normalizeDuration(value) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new TypeError("Vibration durations must be finite, non-negative numbers.");
      }

      return Math.round(value);
    }

    if (Array.isArray(pattern)) {
      if (pattern.length === 0) {
        throw new TypeError("A vibration pattern array must not be empty.");
      }

      return pattern.map(normalizeDuration);
    }

    return normalizeDuration(pattern);
  }

  /**
   * 建立獨立實例。
   * @param {Object} [options]
   * @param {boolean} [options.enabled=true] 初始啟用狀態，由宿主負責持久化。
   * @param {boolean} [options.skipWhenHidden=true] 背景頁面不啟動新的震動。
   * @param {Function} [options.vibrationFunction] 測試替身，正式使用可省略。
   */
  function create(options = {}) {
    const hasCustomFunction = Object.prototype.hasOwnProperty.call(
      options,
      "vibrationFunction"
    );

    if (hasCustomFunction && typeof options.vibrationFunction !== "function") {
      throw new TypeError("vibrationFunction must be a function when supplied.");
    }

    const vibrationFunction = hasCustomFunction
      ? options.vibrationFunction
      : function (pattern) {
          return global.navigator.vibrate(pattern);
        };

    const skipWhenHidden = options.skipWhenHidden !== false;
    let enabled = options.enabled !== false;

    function supportsVibration() {
      return hasCustomFunction || isSupported();
    }

    /** 停止目前裝置震動；即使 enabled=false 仍可以停止。 */
    function stop() {
      if (!supportsVibration()) {
        return false;
      }

      try {
        return vibrationFunction(0) === true;
      } catch (error) {
        return false;
      }
    }

    /**
     * 啟動指定震動節奏。
     * 回傳 true 表示瀏覽器接受要求，不保證實體馬達一定有震動。
     */
    function play(pattern) {
      const normalizedPattern = normalizePattern(pattern);

      if (!enabled || !supportsVibration()) {
        return false;
      }

      if (skipWhenHidden && global.document && global.document.hidden) {
        return false;
      }

      try {
        return vibrationFunction(normalizedPattern) === true;
      } catch (error) {
        return false;
      }
    }

    /** 宿主在需要時切換啟用狀態；關閉時也會停止既有震動。 */
    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);

      if (!enabled) {
        stop();
      }

      return enabled;
    }

    function isEnabled() {
      return enabled;
    }

    return Object.freeze({
      isSupported: supportsVibration,
      isEnabled,
      setEnabled,
      play,
      stop
    });
  }

  global.SlowlyDeviceVibration = Object.freeze({
    version: VERSION,
    isSupported,
    create
  });
})(window);
