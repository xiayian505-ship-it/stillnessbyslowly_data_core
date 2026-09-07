慢慢的倉庫｜Data 共用模組拆分

包含：
- Data_backup.js
- Money.js
- Currency.js
- test_backup.html
- test_money.html
- test_currency.html

建議用途：

1. Data_backup.js
   DataBackup.todayISO()
   DataBackup.downloadJson(filename, data)
   DataBackup.readJsonFile(file)
   DataBackup.createPayload({...})
   DataBackup.extractData(input, options)

2. Money.js
   Money.toNumber(value, fallback)
   Money.roundTo(value, digits)
   Money.cleanNumber(value)
   Money.sum(items, selector)
   Money.formatNumber(value, options)
   Money.formatMoney(value, currency, options)

3. Currency.js
   Currency.getRateToTWD(currency)
   Currency.foreignToTWD(amount, rateToTWD)
   Currency.twdToForeign(amountTWD, rateToTWD)
   Currency.invertRate(rate)
   Currency.rateFromTwdBaseRates(rates, currency)
   Currency.fetchRates(options)
   Currency.fetchRateToTWD(currency, options)

設計原則：
- 不綁定「帳本」資料結構。
- 不處理 DOM / modal / toast / 雙人結算規則。
- 不重做 FictionData 已經有的 Storage / CRUD / Filter / Sort。
- Currency 的匯率約定統一為：
  rateToTWD = 1 單位外幣可換多少 TWD。
- 即時匯率 API 仍使用原帳本的 open.er-api.com；
  若 API 無法連線，固定匯率與純換算功能仍可獨立使用。