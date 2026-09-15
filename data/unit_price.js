// unit_price.js
// 慢慢的倉庫｜Data｜Unit Price 1.0.0
// 通用包裝單價計算核心。
// 不綁 UI、不綁幣別、不綁商品類型、不依賴 Money。
// 宿主自行決定輸入單位如何換成 base unit，以及要比較每多少 base units 的價格。
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

  function effectivePrice(options = {}) {
    const price = nonNegative(options.price, "price");
    const discount = options.discount === undefined
      ? 0
      : nonNegative(options.discount, "discount");
    const shipping = options.shipping === undefined
      ? 0
      : nonNegative(options.shipping, "shipping");

    return Math.max(0, price - discount + shipping);
  }

  function calculate(options = {}) {
    const size = positive(options.size, "size");
    const quantity = options.quantity === undefined
      ? 1
      : positive(options.quantity, "quantity");

    // inputFactor：
    // 輸入 2 L、base unit 想用 ml → inputFactor = 1000
    // 輸入 500 ml、base unit 就是 ml → inputFactor = 1
    const inputFactor = options.inputFactor === undefined
      ? 1
      : positive(options.inputFactor, "inputFactor");

    // compareSize：
    // 想比較「每 1 L」，base unit 為 ml → compareSize = 1000
    // 想比較「每 100 抽」 → compareSize = 100
    const compareSize = options.compareSize === undefined
      ? 1
      : positive(options.compareSize, "compareSize");

    const finalPrice = effectivePrice(options);
    const totalBaseUnits = size * inputFactor * quantity;
    const comparisonUnits = totalBaseUnits / compareSize;
    const unitPrice = finalPrice / comparisonUnits;

    return Object.freeze({
      price: nonNegative(options.price, "price"),
      discount: options.discount === undefined
        ? 0
        : nonNegative(options.discount, "discount"),
      shipping: options.shipping === undefined
        ? 0
        : nonNegative(options.shipping, "shipping"),
      effectivePrice: finalPrice,
      size,
      quantity,
      inputFactor,
      compareSize,
      totalBaseUnits,
      comparisonUnits,
      unitPrice
    });
  }

  global.UnitPrice = Object.freeze({
    version: VERSION,
    effectivePrice,
    calculate
  });

})(typeof window !== "undefined" ? window : globalThis);
