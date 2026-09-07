Slowly DateTime

用途
----
一般網站常用的日期／時間共用模組。

目前提供
--------
- dateKey：本地 Date → YYYY-MM-DD
- parseDateKey：YYYY-MM-DD → 本地 Date
- addDays：日期加減
- diffDays：日曆日期差
- formatDate：YYYY/MM/DD
- formatMMDD：MM/DD
- formatDateTime：YYYY-MM-DD HH:mm
- diffParts：實際經過時間拆成天／小時／分鐘

不處理
------
農曆、節氣、節日資料、日曆 UI、專案自己的日期規則、localStorage、DOM。

檔案
----
datetime.js
date_test_datetime.html
README.txt

使用
----
<script src="./datetime.js"></script>

DateTime.dateKey();
DateTime.parseDateKey("2026-09-08");
DateTime.addDays("2026-09-08", 7);
DateTime.diffDays("2026-09-01", "2026-09-08");
DateTime.formatDate("2026-09-08");
DateTime.formatMMDD("2026-09-08");
DateTime.formatDateTime(new Date());
DateTime.diffParts(fromDate, toDate);

補充
----
dateKey() 使用本地年月日，不使用 toISOString().slice(0,10)，
避免 UTC 日期和使用者本地日期不同時產生前一天／後一天的問題。

diffDays() 計算「日曆日期差」，以年月日對應的 UTC 日序相減，
避免夏令時間造成一天不是固定 24 小時的問題。

diffParts() 計算「實際經過時間」，
適合「距離上次紀錄已過幾天幾小時幾分鐘」這類用途。
