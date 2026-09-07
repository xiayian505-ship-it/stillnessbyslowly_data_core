"use strict";

/* =========================================================
   慢慢的倉庫｜Currency v1.0.0
   通用匯率與幣別換算工具：
   - 固定匯率表
   - TWD 基準換算
   - 即時匯率取得
   - 匯率方向轉換

   約定：
   rateToTWD = 1 單位外幣可換多少 TWD
   例：USD 32 => 1 USD = 32 TWD
========================================================= */

(function(global){
  const DEFAULT_RATES_TO_TWD = Object.freeze({
    TWD: 1,
    USD: 32,
    EUR: 35,
    JPY: 0.22,
    CNY: 4.4,
    HKD: 4.1
  });

  function getRateToTWD(currency, rateTable = DEFAULT_RATES_TO_TWD){
    const rate = Number(rateTable?.[currency]);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  }

  function foreignToTWD(amount, rateToTWD){
    const amountNumber = Number(amount);
    const rateNumber = Number(rateToTWD);

    if(!Number.isFinite(amountNumber)) return NaN;
    if(!Number.isFinite(rateNumber) || rateNumber <= 0) return NaN;

    return amountNumber * rateNumber;
  }

  function twdToForeign(amountTWD, rateToTWD){
    const amountNumber = Number(amountTWD);
    const rateNumber = Number(rateToTWD);

    if(!Number.isFinite(amountNumber)) return NaN;
    if(!Number.isFinite(rateNumber) || rateNumber <= 0) return NaN;

    return amountNumber / rateNumber;
  }

  function invertRate(rate){
    const number = Number(rate);
    if(!Number.isFinite(number) || number <= 0) return NaN;
    return 1 / number;
  }

  function rateFromTwdBaseRates(rates, currency){
    const rate = Number(rates?.[currency]);
    if(!Number.isFinite(rate) || rate <= 0) return NaN;

    // API 若以 TWD 為 base，rates.USD 通常代表 1 TWD = x USD
    // 轉為 1 USD = 幾 TWD，因此取倒數。
    return invertRate(rate);
  }

  async function fetchRates({
    base = "TWD",
    endpoint = "https://open.er-api.com/v6/latest",
    fetchImpl = global.fetch
  } = {}){
    if(typeof fetchImpl !== "function"){
      throw new Error("fetch is not available");
    }

    const url = `${String(endpoint).replace(/\/$/, "")}/${encodeURIComponent(base)}`;
    const response = await fetchImpl(url);

    if(!response.ok){
      throw new Error(`匯率 API 回應失敗：HTTP ${response.status}`);
    }

    const data = await response.json();

    if(!data || typeof data.rates !== "object"){
      throw new Error("匯率 API 回傳格式不正確。");
    }

    return data.rates;
  }

  async function fetchRateToTWD(currency, options = {}){
    if(currency === "TWD") return 1;

    const rates = await fetchRates({
      ...options,
      base: "TWD"
    });

    const rate = rateFromTwdBaseRates(rates, currency);

    if(!Number.isFinite(rate)){
      throw new Error(`找不到 ${currency} 匯率。`);
    }

    return rate;
  }

  global.Currency = Object.freeze({
    version: "1.0.0",
    DEFAULT_RATES_TO_TWD,
    getRateToTWD,
    foreignToTWD,
    twdToForeign,
    invertRate,
    rateFromTwdBaseRates,
    fetchRates,
    fetchRateToTWD
  });
})(window);