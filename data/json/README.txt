Slowly JSON Viewer
Version 1.0.0

定位
----
通用 JSON 結構化展示元件。

它不認識任何特定 schema，
也不推測 module、api、dependencies 等欄位的意思。
JSON 裡有什麼，就忠實展示什麼。

支援
----
- JavaScript object / array / primitive
- JSON 字串
- .json
- 內容為合法 JSON 的 .txt
- Object / Array / String / Number / Boolean / null
- 巢狀資料
- 全部展開 / 全部收合
- 可設定預設收合深度
- 可選擇是否顯示型別
- 可選擇是否排序 object keys

隱私
----
loadFile() 使用瀏覽器 File / Blob API 在本機讀取。
本模組本身不會上傳，也不會儲存資料。

最小使用
--------
<link rel="stylesheet" href="./json_viewer.css">

<div id="viewer"></div>

<script src="./json_viewer.js"></script>
<script>
const viewer = SlowlyJSONViewer.mount("#viewer");
viewer.load({
  hello: "world",
  enabled: true
});
</script>

公開 API
--------
SlowlyJSONViewer.mount(target, options)

Instance:
load(value)
loadText(text)
loadFile(file)
update(options)
expandAll()
collapseAll()
clear()
destroy()

Options
-------
rootLabel       string   預設 "root"
showTypes       boolean  預設 true
showRoot        boolean  預設 true
collapsedDepth  number   預設 Infinity
sortKeys        boolean  預設 false

CSS
---
json_viewer.css 只提供必要結構 CSS。

宿主頁可自行決定：
- 字體
- 顏色
- border
- spacing
- 型別顏色
- 展開箭頭樣式
- 背景
- 其他視覺設計

主要 class
----------
.slowly-json-viewer
.sjv-content
.sjv-node
.sjv-branch
.sjv-leaf
.sjv-details
.sjv-summary
.sjv-children
.sjv-key
.sjv-type
.sjv-count
.sjv-value
.sjv-empty
.sjv-status

data-type
---------
節點會帶：
data-type="object"
data-type="array"
data-type="string"
data-type="number"
data-type="boolean"
data-type="null"

宿主頁可直接用這些 selector 自訂視覺。
