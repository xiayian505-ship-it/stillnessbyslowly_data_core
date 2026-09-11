Date Overlap v1.0.0
慢慢的倉庫｜stillness by slowly

用途
----
通用日期集合重疊比對核心。
輸入多個「對象 ID + 日期集合」，可反查每個日期有哪些對象、
取得重疊日期、指定最低重疊數、最大重疊與基本統計。

不處理
------
- UI
- localStorage / Supabase / 其他儲存
- Calendar Component
- 日期合法性驗證
- 姓名或顯示文字

輸入格式
--------
[
  { id: "A", dates: ["2026-09-01", "2026-09-03"] },
  { id: "B", dates: ["2026-09-03", "2026-09-06"] }
]

API
---
DateOverlap.normalizeItems(items)
DateOverlap.buildIndex(items)
DateOverlap.byDate(items, options)
DateOverlap.getDate(items, date)
DateOverlap.overlaps(items, { min })
DateOverlap.max(items)
DateOverlap.stats(items, { min })
DateOverlap.analyze(items, { min })

說明
----
Date_overlap.js 將日期視為可比較的 key。
例如 "2026-02-30" 是否為有效日期，不由本模組判斷。

重複日期會在單一對象內自動去重。
空 ID 的項目會被忽略。
