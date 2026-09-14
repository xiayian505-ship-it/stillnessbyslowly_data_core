/* Slowly Library | Data Diff
 * 通用資料差異比較核心。
 * 只處理資料比較，不負責 JSON 解析、DOM、UI 或顯示。
 */
(function (global) {
  "use strict";

  function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;

    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function isComparableContainer(value) {
    return Array.isArray(value) || isPlainObject(value);
  }

  function formatPath(segments) {
    if (segments.length === 0) return "$";

    let path = "$";

    for (const segment of segments) {
      if (typeof segment === "number") {
        path += `[${segment}]`;
        continue;
      }

      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
        path += `.${segment}`;
      } else {
        path += `[${JSON.stringify(segment)}]`;
      }
    }

    return path;
  }

  function makeRecord(type, segments, oldValue, newValue) {
    const record = {
      type,
      path: formatPath(segments),
      segments: segments.slice()
    };

    if (type === "added") {
      record.newValue = newValue;
    } else if (type === "removed") {
      record.oldValue = oldValue;
    } else {
      record.oldValue = oldValue;
      record.newValue = newValue;
    }

    return record;
  }

  function diff(oldData, newData) {
    const added = [];
    const removed = [];
    const changed = [];

    compareValue(oldData, newData, []);

    return {
      equal: added.length === 0 && removed.length === 0 && changed.length === 0,
      added,
      removed,
      changed,
      summary: {
        added: added.length,
        removed: removed.length,
        changed: changed.length,
        total: added.length + removed.length + changed.length
      }
    };

    function compareValue(oldValue, newValue, segments) {
      if (Object.is(oldValue, newValue)) {
        return;
      }

      const oldIsArray = Array.isArray(oldValue);
      const newIsArray = Array.isArray(newValue);

      if (oldIsArray && newIsArray) {
        compareArray(oldValue, newValue, segments);
        return;
      }

      const oldIsObject = isPlainObject(oldValue);
      const newIsObject = isPlainObject(newValue);

      if (oldIsObject && newIsObject) {
        compareObject(oldValue, newValue, segments);
        return;
      }

      if (isComparableContainer(oldValue) !== isComparableContainer(newValue)) {
        changed.push(makeRecord("changed", segments, oldValue, newValue));
        return;
      }

      changed.push(makeRecord("changed", segments, oldValue, newValue));
    }

    function compareArray(oldArray, newArray, segments) {
      const sharedLength = Math.min(oldArray.length, newArray.length);

      for (let index = 0; index < sharedLength; index += 1) {
        compareValue(oldArray[index], newArray[index], segments.concat(index));
      }

      for (let index = sharedLength; index < oldArray.length; index += 1) {
        removed.push(
          makeRecord("removed", segments.concat(index), oldArray[index], undefined)
        );
      }

      for (let index = sharedLength; index < newArray.length; index += 1) {
        added.push(
          makeRecord("added", segments.concat(index), undefined, newArray[index])
        );
      }
    }

    function compareObject(oldObject, newObject, segments) {
      const oldKeys = Object.keys(oldObject);
      const newKeys = Object.keys(newObject);
      const oldKeySet = new Set(oldKeys);
      const newKeySet = new Set(newKeys);

      for (const key of oldKeys) {
        if (!newKeySet.has(key)) {
          removed.push(
            makeRecord("removed", segments.concat(key), oldObject[key], undefined)
          );
        }
      }

      for (const key of newKeys) {
        if (!oldKeySet.has(key)) {
          added.push(
            makeRecord("added", segments.concat(key), undefined, newObject[key])
          );
        }
      }

      for (const key of oldKeys) {
        if (newKeySet.has(key)) {
          compareValue(oldObject[key], newObject[key], segments.concat(key));
        }
      }
    }
  }

  global.SlowlyDataDiff = Object.freeze({
    diff
  });
})(window);
