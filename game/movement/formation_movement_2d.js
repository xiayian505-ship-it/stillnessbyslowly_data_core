/*
 * Formation Movement 2D 1.0.0｜慢慢軍火庫
 * 一整隊矩形物件同步水平移動；任一有效成員即將碰邊時，整隊折返並下移。
 * 純計算：不修改宿主陣列、不綁定遊戲迴圈、Canvas、敵人或計分規則。
 * API: window.SlowlyFormationMovement2D.plan_step(options)
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function finite_number(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " 必須是有限數字。");
    }
    return value;
  }

  function non_negative(value, name) {
    const result = finite_number(value, name);
    if (result < 0) {
      throw new RangeError(name + " 不可以小於 0。");
    }
    return result;
  }

  function plan_step(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("options 必須是物件。");
    }

    const entities = options.entities;
    if (!Array.isArray(entities)) {
      throw new TypeError("entities 必須是陣列。");
    }

    const direction = options.direction;
    if (direction !== -1 && direction !== 1) {
      throw new RangeError("direction 必須是 -1 或 1。");
    }

    const speed = non_negative(options.speed, "speed");
    const delta_seconds = non_negative(options.delta_seconds, "delta_seconds");
    const drop_distance = non_negative(options.drop_distance, "drop_distance");
    const left_bound = finite_number(options.left_bound, "left_bound");
    const right_bound = finite_number(options.right_bound, "right_bound");
    const margin = non_negative(options.margin === undefined ? 0 : options.margin, "margin");
    const inner_left = left_bound + margin;
    const inner_right = right_bound - margin;

    if (!Number.isFinite(inner_left) || !Number.isFinite(inner_right) || inner_left >= inner_right) {
      throw new RangeError("left_bound、right_bound 與 margin 必須提供正寬度的可用範圍。");
    }

    const is_active = options.is_active === undefined
      ? function (entity) { return entity.active !== false; }
      : options.is_active;
    if (typeof is_active !== "function") {
      throw new TypeError("is_active 必須是函式。");
    }

    const active_flags = entities.map(function (entity, index) {
      if (!entity || typeof entity !== "object" || Array.isArray(entity)) {
        throw new TypeError("entities[" + index + "] 必須是矩形物件。");
      }
      const active = Boolean(is_active(entity, index));
      if (!active) return false;

      const x = finite_number(entity.x, "entities[" + index + "].x");
      finite_number(entity.y, "entities[" + index + "].y");
      const width = non_negative(entity.width, "entities[" + index + "].width");
      non_negative(entity.height, "entities[" + index + "].height");
      if (x < inner_left || x + width > inner_right) {
        throw new RangeError("entities[" + index + "] 已超出可用水平邊界。");
      }
      return true;
    });

    const active_count = active_flags.filter(Boolean).length;
    const planned_distance = speed * delta_seconds;
    if (!Number.isFinite(planned_distance)) {
      throw new RangeError("speed * delta_seconds 超出有限數值範圍。");
    }

    // 非零步進才判斷碰邊；若一步跨越多個畫面，也只折返一次並下移一次。
    const bounced = active_count > 0 && planned_distance > 0 && entities.some(function (entity, index) {
      if (!active_flags[index]) return false;
      const next_x = entity.x + direction * planned_distance;
      return direction > 0
        ? next_x + entity.width >= inner_right
        : next_x <= inner_left;
    });

    const next_direction = bounced ? -direction : direction;
    const displacement = {
      x: active_count === 0 || bounced ? 0 : direction * planned_distance,
      y: bounced ? drop_distance : 0
    };

    // 僅淺層複製每個物件；宿主自己的巢狀欄位會保留引用，不修改它們。
    const next_entities = entities.map(function (entity, index) {
      const next_entity = Object.assign({}, entity);
      if (active_flags[index]) {
        next_entity.x = entity.x + displacement.x;
        next_entity.y = entity.y + displacement.y;
      }
      return next_entity;
    });

    return {
      entities: next_entities,
      direction: next_direction,
      bounced,
      displacement,
      active_count
    };
  }

  global.SlowlyFormationMovement2D = Object.freeze({ version: VERSION, plan_step });
})(typeof window !== "undefined" ? window : globalThis);
