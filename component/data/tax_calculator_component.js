/* 慢慢的倉庫｜Slowly Tax Calculator Component
 * 依指定稅率拆分含稅金額。
 * 依賴：SlowlyTax
 */
(function (global) {
  "use strict";

  let uid = 0;

  function resolveTarget(target) {
    if (typeof target === "string") {
      return document.querySelector(target);
    }

    if (target instanceof HTMLElement) {
      return target;
    }

    return null;
  }

  function create(options) {
    const opts = Object.assign({
      target: null,
      title: "含稅金額計算",
      defaultRate: 5,
      amountLabel: "金額（含稅）",
      rateLabel: "稅率",
      salesLabel: "營業額",
      taxLabel: "稅額",
      placeholder: "請輸入金額",
      locale: "zh-TW"
    }, options || {});

    const target = resolveTarget(opts.target);

    if (!target) {
      throw new Error("SlowlyTaxCalculator：找不到 target。");
    }

    if (!global.SlowlyTax || typeof global.SlowlyTax.splitInclusive !== "function") {
      throw new Error("SlowlyTaxCalculator：請先載入 Tax.js。");
    }

    uid += 1;
    const amountId = `slowly-tax-amount-${uid}`;
    const rateId = `slowly-tax-rate-${uid}`;

    target.innerHTML = `
      <section class="slowly-tax-calculator">
        ${opts.title ? `<h2 class="stc-title">${opts.title}</h2>` : ""}

        <div class="stc-field">
          <label for="${amountId}">${opts.amountLabel}</label>
          <input
            id="${amountId}"
            class="stc-input"
            data-role="amount"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            autocomplete="off"
            placeholder="${opts.placeholder}"
          >
        </div>

        <div class="stc-field">
          <label for="${rateId}">${opts.rateLabel}</label>
          <div class="stc-rate-wrap">
            <input
              id="${rateId}"
              class="stc-input"
              data-role="rate"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              value="${Number(opts.defaultRate)}"
            >
            <span aria-hidden="true">%</span>
          </div>
        </div>

        <div class="stc-results" aria-live="polite">
          <div class="stc-result">
            <span>${opts.salesLabel}</span>
            <strong data-role="sales">—</strong>
          </div>

          <div class="stc-result">
            <span>${opts.taxLabel}</span>
            <strong data-role="tax">—</strong>
          </div>
        </div>
      </section>
    `;

    const root = target.querySelector(".slowly-tax-calculator");
    const amountInput = root.querySelector('[data-role="amount"]');
    const rateInput = root.querySelector('[data-role="rate"]');
    const salesOutput = root.querySelector('[data-role="sales"]');
    const taxOutput = root.querySelector('[data-role="tax"]');
    const formatter = new Intl.NumberFormat(opts.locale);

    function clear() {
      salesOutput.textContent = "—";
      taxOutput.textContent = "—";
    }

    function calculate() {
      if (amountInput.value.trim() === "" || rateInput.value.trim() === "") {
        clear();
        return null;
      }

      try {
        const result = global.SlowlyTax.splitInclusive(
          amountInput.value,
          rateInput.value
        );

        salesOutput.textContent = formatter.format(result.sales);
        taxOutput.textContent = formatter.format(result.tax);

        root.dispatchEvent(new CustomEvent("slowlytaxchange", {
          bubbles: true,
          detail: result
        }));

        return result;
      } catch (error) {
        clear();
        return null;
      }
    }

    amountInput.addEventListener("input", calculate);
    rateInput.addEventListener("input", calculate);

    return {
      element: root,
      calculate,
      getValue() {
        return calculate();
      },
      setAmount(value) {
        amountInput.value = value ?? "";
        return calculate();
      },
      setRate(value) {
        rateInput.value = value ?? "";
        return calculate();
      },
      focus() {
        amountInput.focus();
      },
      destroy() {
        target.innerHTML = "";
      }
    };
  }

  global.SlowlyTaxCalculator = Object.freeze({
    create
  });
})(window);
