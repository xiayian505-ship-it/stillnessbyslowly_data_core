/* 慢慢軍火庫｜Card Branch Selection 1.0.0
 * 為單張實體卡選擇合法的戰術分支；不升級、無戰鬥效果、不修改宿主原卡。
 * 來源概念：《霧林之契》依等級及卡牌類型切換 branch。
 */
(function (global) {
  "use strict";
  const copy = value => JSON.parse(JSON.stringify(value));
  const isNonempty = value => typeof value === "string" && value.trim().length > 0;

  function create(options = {}) {
    const configuration = options.branchesByType;
    if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
      throw new TypeError("branchesByType must be a type-to-branches object");
    }
    const branches = copy(configuration);
    for (const [type, choices] of Object.entries(branches)) {
      if (!isNonempty(type) || !Array.isArray(choices) || choices.length === 0 ||
          choices.some(choice => !isNonempty(choice)) || new Set(choices).size !== choices.length) {
        throw new TypeError("Invalid or duplicate branches for " + type);
      }
    }
    const minimumLevel = options.minimumLevel === undefined ? 1 : options.minimumLevel;
    if (!Number.isInteger(minimumLevel) || minimumLevel < 0) throw new RangeError("Invalid minimumLevel");
    const defaultBranch = options.defaultBranch;
    if (defaultBranch !== undefined && typeof defaultBranch !== "string" &&
        (!defaultBranch || typeof defaultBranch !== "object" || Array.isArray(defaultBranch))) {
      throw new TypeError("defaultBranch must be a string or type map");
    }
    const defaults = {};
    for (const [type, choices] of Object.entries(branches)) {
      const candidate = typeof defaultBranch === "string" ? defaultBranch : defaultBranch && defaultBranch[type];
      defaults[type] = candidate === undefined ? choices[0] : candidate;
      if (!choices.includes(defaults[type])) throw new RangeError("Default branch is not allowed for " + type);
    }
    const getInstanceId = options.getInstanceId || (card => card.id);
    const getCardType = options.getCardType || (card => card.type);
    const getCardLevel = options.getCardLevel || (card => card.level);
    const getBranch = options.getBranch || (card => card.branch);
    const canSelectExtra = options.canSelect || (() => true);
    if ([getInstanceId, getCardType, getCardLevel, getBranch, canSelectExtra].some(fn => typeof fn !== "function")) {
      throw new TypeError("Card field accessors and canSelect must be functions");
    }

    function inspect(card) {
      if (!card || typeof card !== "object" || Array.isArray(card)) throw new TypeError("Invalid card");
      const id = getInstanceId(card);
      const type = getCardType(card);
      const level = getCardLevel(card);
      if (!isNonempty(id) || !isNonempty(type) || !Number.isInteger(level) || level < 0) {
        throw new TypeError("Invalid card identity, type or level");
      }
      return { id, type, level };
    }
    function getCurrent(card) {
      const { type } = inspect(card);
      const selected = getBranch(card);
      return isNonempty(selected) ? selected : defaults[type] || null;
    }
    function canSelect(card, branch, context) {
      const info = inspect(card);
      if (!isNonempty(branch)) throw new TypeError("branch must be a nonempty string");
      if (!branches[info.type]) return { ok: false, reason: "unsupported_type" };
      if (!branches[info.type].includes(branch)) return { ok: false, reason: "invalid_branch" };
      if (info.level < minimumLevel) return { ok: false, reason: "insufficient_level" };
      if (!canSelectExtra(card, branch, context)) return { ok: false, reason: "not_allowed" };
      return { ok: true, reason: null };
    }
    function getAvailable(card, context) {
      const info = inspect(card);
      if (!branches[info.type] || info.level < minimumLevel) return [];
      return branches[info.type].filter(branch => Boolean(canSelectExtra(card, branch, context)));
    }
    function select(card, branch, context) {
      const verdict = canSelect(card, branch, context);
      if (!verdict.ok) return { ...verdict, card: null };
      // 回傳新的 JSON 卡牌快照，不修改宿主原本的實體卡。
      return { ok: true, reason: null, card: { ...copy(card), branch } };
    }
    function reset(card, context) {
      const { type } = inspect(card);
      if (!defaults[type]) return { ok: false, reason: "unsupported_type", card: null };
      return select(card, defaults[type], context);
    }
    function getRules() {
      return copy({ branchesByType: branches, defaultBranch: defaults, minimumLevel });
    }
    return Object.freeze({ getAvailable, getCurrent, canSelect, select, reset, getRules });
  }
  global.SlowlyCardBranchSelection = Object.freeze({ create, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
