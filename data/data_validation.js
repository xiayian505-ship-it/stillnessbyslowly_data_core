/* Slowly Library | Data Validation
 * 通用資料驗證核心。
 * 只處理驗證規則與錯誤結果，不負責 DOM、表單 UI、資料儲存或提交。
 */
(function (global) {
  "use strict";

  function getValue(data, path) {
    if (path === "" || path == null) return data;

    const segments = Array.isArray(path)
      ? path
      : String(path).split(".").filter(Boolean);

    let current = data;

    for (const segment of segments) {
      if (current == null || !Object.prototype.hasOwnProperty.call(current, segment)) {
        return undefined;
      }
      current = current[segment];
    }

    return current;
  }

  function isEmpty(value) {
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  function matchesType(value, type) {
    switch (type) {
      case "array":
        return Array.isArray(value);
      case "object":
        return value !== null && typeof value === "object" && !Array.isArray(value);
      case "integer":
        return Number.isInteger(value);
      case "null":
        return value === null;
      default:
        return typeof value === type;
    }
  }

  function createError(path, rule, message, value) {
    return {
      path,
      rule,
      message,
      value
    };
  }

  function validate(data, schema) {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      throw new TypeError("schema 必須是物件。");
    }

    const errors = [];

    for (const [path, rules] of Object.entries(schema)) {
      if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
        throw new TypeError(`欄位 ${path} 的 rules 必須是物件。`);
      }

      const value = getValue(data, path);
      const empty = isEmpty(value);

      if (rules.required === true && empty) {
        errors.push(
          createError(path, "required", rules.requiredMessage || "此欄位為必填。", value)
        );
        continue;
      }

      if (empty) {
        continue;
      }

      if (rules.type && !matchesType(value, rules.type)) {
        errors.push(
          createError(
            path,
            "type",
            rules.typeMessage || `資料型態必須為 ${rules.type}。`,
            value
          )
        );
        continue;
      }

      if (typeof rules.min === "number") {
        const target =
          typeof value === "number"
            ? value
            : typeof value === "string" || Array.isArray(value)
              ? value.length
              : null;

        if (target !== null && target < rules.min) {
          errors.push(
            createError(path, "min", rules.minMessage || `不可小於 ${rules.min}。`, value)
          );
        }
      }

      if (typeof rules.max === "number") {
        const target =
          typeof value === "number"
            ? value
            : typeof value === "string" || Array.isArray(value)
              ? value.length
              : null;

        if (target !== null && target > rules.max) {
          errors.push(
            createError(path, "max", rules.maxMessage || `不可大於 ${rules.max}。`, value)
          );
        }
      }

      if (rules.pattern !== undefined) {
        if (!(rules.pattern instanceof RegExp)) {
          throw new TypeError(`欄位 ${path} 的 pattern 必須是 RegExp。`);
        }

        rules.pattern.lastIndex = 0;
        if (typeof value !== "string" || !rules.pattern.test(value)) {
          errors.push(
            createError(path, "pattern", rules.patternMessage || "格式不符合規則。", value)
          );
        }
      }

      if (typeof rules.validate === "function") {
        const result = rules.validate(value, data);

        if (result !== true && result !== undefined) {
          errors.push(
            createError(
              path,
              "validate",
              typeof result === "string"
                ? result
                : rules.validateMessage || "未通過自訂驗證。",
              value
            )
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCount: errors.length
    };
  }

  global.SlowlyDataValidation = Object.freeze({
    validate,
    getValue
  });
})(window);
