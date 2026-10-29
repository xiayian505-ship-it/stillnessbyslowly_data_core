/* 慢慢軍火庫｜Card Deck Presets 1.0.0
 * 來源概念：《霧林之契》多套牌組。管理實體 ID 的配置，不負責卡牌效果、收藏所有權或戰鬥。
 * 宿主需要驗證出戰資格時，可使用既有 CardLoadoutValidation。
 */
(function (global) {
  "use strict";
  function requireId(id) {
    if (typeof id !== "string" || !id.trim()) throw new TypeError("instance/preset ID must be a nonempty string");
    return id;
  }
  function idArray(value) {
    if (!Array.isArray(value)) throw new TypeError("Expected an array of IDs");
    const ids = value.map(requireId);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate instance ID in one preset");
    return ids;
  }
  function create(options = {}) {
    const count = options.presetCount ?? 3;
    const maximumCards = options.maximumCards ?? 30;
    if (!Number.isInteger(count) || count < 1 || count > 1000) throw new RangeError("Invalid presetCount");
    if (!Number.isInteger(maximumCards) || maximumCards < 0) throw new RangeError("Invalid maximumCards");
    let ownedIds = options.ownedIds === undefined ? null : new Set(idArray(options.ownedIds));
    let presets = Array.from({ length: count }, (_, index) => ({
      id: "preset_" + (index + 1), name: "", instanceIds: []
    }));
    let activeId = presets[0].id;
    function presetOf(id) {
      const preset = presets.find(entry => entry.id === id);
      if (!preset) throw new RangeError("Unknown preset ID: " + id);
      return preset;
    }
    function checkIds(ids) {
      const validated = idArray(ids);
      if (validated.length > maximumCards) throw new RangeError("Preset exceeds maximumCards");
      if (ownedIds && validated.some(id => !ownedIds.has(id))) throw new RangeError("Unowned instance ID");
      return validated;
    }
    function getPreset(id) { const preset = presetOf(id); return { ...preset, instanceIds: [...preset.instanceIds] }; }
    function getActive() { return getPreset(activeId); }
    function setActive(id) { presetOf(id); activeId = id; return getActive(); }
    function replacePreset(id, instanceIds) {
      const preset = presetOf(id);
      const validated = checkIds(instanceIds);
      preset.instanceIds = validated;
      return getPreset(id);
    }
    function addCard(id, instanceId) {
      requireId(instanceId);
      const preset = presetOf(id);
      if (preset.instanceIds.includes(instanceId)) throw new Error("Instance already in preset");
      return replacePreset(id, [...preset.instanceIds, instanceId]);
    }
    function removeCard(id, instanceId) {
      requireId(instanceId);
      const preset = presetOf(id);
      preset.instanceIds = preset.instanceIds.filter(existingId => existingId !== instanceId);
      return getPreset(id);
    }
    function setName(id, name) {
      if (typeof name !== "string") throw new TypeError("name must be a string");
      presetOf(id).name = name;
      return getPreset(id);
    }
    function removeUnavailable(availableIds) {
      const allowed = new Set(idArray(availableIds));
      ownedIds = allowed;
      let removed = 0;
      for (const preset of presets) {
        const before = preset.instanceIds.length;
        preset.instanceIds = preset.instanceIds.filter(id => allowed.has(id));
        removed += before - preset.instanceIds.length;
      }
      return { removed, snapshot: snapshot() };
    }
    function snapshot() {
      return { activePresetId: activeId, maximumCards,
        presets: presets.map(preset => ({ ...preset, instanceIds: [...preset.instanceIds] })) };
    }
    function restore(data) {
      if (!data || !Array.isArray(data.presets) || data.presets.length !== count ||
          data.maximumCards !== maximumCards || typeof data.activePresetId !== "string") {
        throw new TypeError("Invalid preset snapshot");
      }
      const checked = data.presets.map((incoming, index) => {
        if (!incoming || incoming.id !== presets[index].id || typeof incoming.name !== "string") {
          throw new TypeError("Invalid preset identity or name");
        }
        // 載入舊存檔時，已不持有的卡會被清掉，但不掩蓋重複與超量資料錯誤。
        const ids = idArray(incoming.instanceIds);
        if (ids.length > maximumCards) throw new RangeError("Restored preset exceeds maximumCards");
        return { id: incoming.id, name: incoming.name,
          instanceIds: ownedIds ? ids.filter(id => ownedIds.has(id)) : ids };
      });
      if (!checked.some(preset => preset.id === data.activePresetId)) throw new RangeError("Invalid active preset");
      presets = checked;
      activeId = data.activePresetId;
      return snapshot();
    }
    return Object.freeze({ getPreset, getActive, setActive, addCard, removeCard, replacePreset,
      setName, removeUnavailable, snapshot, restore });
  }
  global.CardDeckPresets = Object.freeze({ create, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
