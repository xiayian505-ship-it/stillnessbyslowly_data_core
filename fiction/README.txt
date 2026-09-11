Fiction_data.js 拆分包
stillness by slowly

內容：
- Fiction_search.js
- Fiction_filter.js
- Fiction_sort.js
- Fiction_shuffle.js
- Fiction_paginate.js
- Fiction_storage.js
- test_search.html
- test_filter.html
- test_sort.html
- test_shuffle.html
- test_paginate.html
- test_storage.html
- test_data.html（原完整 Fiction_data.js 測試頁，避免與既有 test.html 重名）

原則：
- 原 Fiction_data.js 完整版不動。
- 這 6 支為可單獨引用的功能版。
- 測試頁沿用原 test.html 的視覺與互動模式。
- 每支功能版皆可獨立載入，不需要先載 Fiction_data.js。

SelectOrCreate.js v1.0.0

用途：
搜尋既有項目 → 以 ID 選取 → 找不到可新增 → 同名時直接使用既有項目。

核心 API：
- new SelectOrCreate(options)
- setItems(items)
- getItems()
- getSelected()
- clearSelection()
- findById(id)
- findDuplicateByName(name)
- search(keyword)
- selectById(id)
- addOrSelect(name, extra)

options：
- items: 初始資料陣列
- getId(item): 自訂 ID 欄位讀法
- getName(item): 自訂名稱欄位讀法
- normalizeText(value): 自訂名稱正規化
- createId(): 自訂新 ID 生成方式
- maxResults: 搜尋最多回傳筆數，預設 20
- onSelect(item, meta): 選取／新增後回呼
- onCreate(newItem): 實際建立資料的 async callback，可接 Supabase/API

meta.reason：
- select：選取既有項目
- duplicate：新增時發現同名，回收既有項目
- create：新增成功

設計原則：
- 模組不碰 DOM。
- 模組不綁 localStorage / Supabase。
- UI 與資料儲存由使用端決定。
- 搜尋時自動清除目前選取，避免畫面文字與實際 ID 不一致。