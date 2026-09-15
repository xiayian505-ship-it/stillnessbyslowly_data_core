// metered_charge.js
// 慢慢的倉庫｜Data｜Metered Charge 1.0.0
// 通用「按用量計費」核心：
// 實際用量 → 依計費單位向上取整 → 套最低計費量 → 計算費用。
// 可另外設定「最低可受理用量」門檻。
// 不綁運輸、商品、幣別、UI，也不依賴 Money / UnitPrice。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function finiteNumber(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(name + " must be a finite number.");
    }

    return number;
  }

  function nonNegative(value, name) {
    const number = finiteNumber(value, name);

    if (number < 0) {
      throw new RangeError(name + " must be >= 0.");
    }

    return number;
  }

  function positive(value, name) {
    const number = finiteNumber(value, name);

    if (number <= 0) {
      throw new RangeError(name + " must be > 0.");
    }

    return number;
  }

  function calculate(options = {}) {
    const usage = nonNegative(options.usage, "usage");
    const rate = nonNegative(options.rate, "rate");

    const billingUnit = options.billingUnit === undefined
      ? 1
      : positive(options.billingUnit, "billingUnit");

    const minimumBillable = options.minimumBillable === undefined
      ? 0
      : nonNegative(options.minimumBillable, "minimumBillable");

    const eligibleFrom = options.eligibleFrom === undefined
      ? 0
      : nonNegative(options.eligibleFrom, "eligibleFrom");

    const eligible = usage >= eligibleFrom;

    if (!eligible) {
      return Object.freeze({
        usage,
        rate,
        billingUnit,
        minimumBillable,
        eligibleFrom,
        eligible: false,
        roundedUsage: null,
        billableUsage: null,
        billingUnits: null,
        cost: null
      });
    }

    const roundedUsage =
      Math.ceil(usage / billingUnit) * billingUnit;

    const billableUsage =
      Math.max(roundedUsage, minimumBillable);

    const billingUnits =
      billableUsage / billingUnit;

    const cost =
      billingUnits * rate;

    return Object.freeze({
      usage,
      rate,
      billingUnit,
      minimumBillable,
      eligibleFrom,
      eligible: true,
      roundedUsage,
      billableUsage,
      billingUnits,
      cost
    });
  }

  global.MeteredCharge = Object.freeze({
    version: VERSION,
    calculate
  });

})(typeof window !== "undefined" ? window : globalThis);
