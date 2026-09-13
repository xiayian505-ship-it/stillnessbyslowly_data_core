/* Slowly Library | State | Preference
   Boolean preference state with localStorage persistence.
   UI, effects, and host behavior are handled by the host.
*/
(function (global) {
  "use strict";

  function assertKey(key) {
    if (typeof key !== "string" || !key.trim()) {
      throw new TypeError("Preference.create(): key must be a non-empty string.");
    }

    return key.trim();
  }

  function normalizeBoolean(value, fallback) {
    if (value === true || value === false) {
      return value;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return fallback;
  }

  function create(options) {
    options = options || {};

    var key = assertKey(options.key);
    var defaultValue = normalizeBoolean(options.defaultValue, false);
    var storage = options.storage || global.localStorage;

    function read() {
      try {
        var stored = storage.getItem(key);

        if (stored === null) {
          return defaultValue;
        }

        return normalizeBoolean(stored, defaultValue);
      } catch (error) {
        return defaultValue;
      }
    }

    function write(value) {
      var nextValue = Boolean(value);

      try {
        storage.setItem(key, String(nextValue));
      } catch (error) {
        // Storage failure should not break the host.
      }

      return nextValue;
    }

    return {
      get: function () {
        return read();
      },

      set: function (value) {
        return write(value);
      },

      toggle: function () {
        return write(!read());
      }
    };
  }

  global.Preference = {
    create: create
  };
})(window);
