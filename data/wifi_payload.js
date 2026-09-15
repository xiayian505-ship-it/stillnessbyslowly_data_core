/* 慢慢的倉庫｜Data｜WiFi Payload v1.0.0
   將 Wi-Fi 設定序列化成 QRCode 常用的 WIFI: payload。
   不產生 QRCode、不碰 DOM、不保存帳密。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function escapeField(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/([;,:"])/g, "\\$1");
  }

  function normalizeType(type) {
    const raw = String(type ?? "WPA").trim();
    if (!raw) return "nopass";

    const lower = raw.toLowerCase();

    if (lower === "none" || lower === "open" || lower === "nopass") {
      return "nopass";
    }

    return raw;
  }

  function build(options = {}) {
    const ssid = String(options.ssid ?? "");
    const password = String(options.password ?? "");
    const type = normalizeType(options.type);

    if (!ssid) {
      throw new TypeError("ssid must not be empty.");
    }

    let payload =
      "WIFI:T:" + escapeField(type) +
      ";S:" + escapeField(ssid) +
      ";P:" + escapeField(password) + ";";

    if (options.hidden === true) {
      payload += "H:true;";
    }

    return payload + ";";
  }

  global.WiFiPayload = Object.freeze({
    version: VERSION,
    escapeField,
    build
  });

})(typeof window !== "undefined" ? window : globalThis);
