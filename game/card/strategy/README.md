# 慢慢軍火庫｜策略卡牌獨立積木（待驗收）

## 放置位置

請將本交付包內 `game/card/strategy/` 目錄合併到原有軍火庫 repo 的相同位置。

```text
stillnessbyslowly_data_core/
└── game/
    └── card/
        ├── deck.js                  ← 軍火庫已經有，不要覆蓋
        ├── deck_usage.html          ← 原有檔案保持原樣
        ├── test_deck.html           ← 原有檔案保持原樣
        └── strategy/                ← 本次新增
            ├── README.md
            ├── card_instance_identity.js
            ├── card_instance_identity_usage.html
            ├── card_instance_identity_demo.html
            ├── test_card_instance_identity.html
            └── ...其餘七組相同結構
```

沒有整包自製的 `game/card/deck.js`，也沒有更動原本 repo 的任何檔案。

## 八個零件

| JS 原始碼 | 瀏覽器全域 API | 單一職責 | 對應文件 |
|---|---|---|---|
| `card_instance_identity.js` | `CardInstanceIdentity` | 分辨卡種和實體卡，建立實體卡、查找、依卡種分組及找出重複身分。 | `card_instance_identity_usage.html`、`card_instance_identity_demo.html`、`test_card_instance_identity.html` |
| `card_zone_transfer.js` | `CardZoneTransfer` | 借用既有 Deck 的快照與還原介面，在牌庫／手牌／棄牌區之間移動或交換卡牌。 | `card_zone_transfer_usage.html`、`card_zone_transfer_demo.html`、`test_card_zone_transfer.html` |
| `card_resource_pool.js` | `CardResourcePool` | 保存宿主自訂名稱的資源，檢查多種資源是否足夠，並在足額時一次扣除。 | `card_resource_pool_usage.html`、`card_resource_pool_demo.html`、`test_card_resource_pool.html` |
| `card_target_selection.js` | `CardTargetSelection` | 從宿主提供的卡牌區域收集候選目標，依自訂條件篩選、查找或選取。 | `card_target_selection_usage.html`、`card_target_selection_demo.html`、`test_card_target_selection.html` |
| `card_effect_registry.js` | `CardEffectRegistry` | 儲存宿主登記的效果名稱、可執行條件與同步處理函式；依名稱檢查或執行。 | `card_effect_registry_usage.html`、`card_effect_registry_demo.html`、`test_card_effect_registry.html` |
| `card_turn_order.js` | `CardTurnOrder` | 保存參與者順序、目前輪到誰、整輪計數和宿主自訂的階段標記。 | `card_turn_order_usage.html`、`card_turn_order_demo.html`、`test_card_turn_order.html` |
| `card_level_progression.js` | `CardLevelProgression` | 計算暫時等級增減後的有效等級；依宿主條件及上限升級選定卡牌。 | `card_level_progression_usage.html`、`card_level_progression_demo.html`、`test_card_level_progression.html` |
| `card_loadout_validation.js` | `CardLoadoutValidation` | 根據收藏中的實體卡 ID 還原出戰清單，檢查遺失、重複、資格與宿主設定的數量上限。 | `card_loadout_validation_usage.html`、`card_loadout_validation_demo.html`、`test_card_loadout_validation.html` |

每個零件都分為四份實體檔案：**原始碼**、**使用說明頁**、**Demo 展示頁**、**測試頁**。

## 為什麼沒有 `.cjs`？

`.cjs` 是 Node.js CommonJS 測試腳本的副檔名，並不是你原本軍火庫公開給網站 `<script src>` 使用的零件格式。
這一包是預備放進 GitHub Pages 軍火庫的瀏覽器交付，所以不提供 Node 專用測試腳本。
測試統一放在每個 `test_*.html`，可在瀏覽器直接驗收。

## 軍火庫首頁索引

軍火庫首頁的 `index_data.js` 在 `page: "game" → group id: "card"` 管理卡牌項目。
本次**沒有改動原本 `index_data.js`**，因為這批零件仍待你逐件驗收；接受後才適合把八個 JS、使用說明、Demo 與測試頁路徑加入該卡牌群組。
新檔的預定 HTTPS 網址前綴是 `https://lib.stillnessbyslowly.com/game/card/strategy/`，在實際發布之前不要視為已存在的連結。

## API 與宿主規則

八個 JS 都是 IIFE 的瀏覽器全域物件，無框架、無 DOM 依賴，不使用 ES module 或 CommonJS。
**唯一引用既有積木的是 `card_zone_transfer.js`**：接受真正的 `Deck.create()` 產生的物件，透過 `snapshot()` / `restore()` 完成跨區域與跨牌庫移動。

請依各自 `_usage.html` 的**真實 API** 使用，切勿只看檔名猜呼叫方式。
所有出牌限制、費用名稱與數值、效果、目標合法性、每回合可操作次數、升級上限、選牌數量、AI 和勝敗條件，都由宿主決定。

## 原始碼格式

所有 JS 保留完整函式、段落與註解，未做 Minify、沒有合併成一行。
Demo 與測試頁的 JS 同樣正常縮排排版。

## 這次刻意沒有做

沒有策略卡牌完成品、沒有替《霧林之契》重新組遊戲、沒有修改《霧林之契》，也沒有覆蓋既有軍火庫檔案。
此包屬於**待驗收的新增檔案**，沒有代替你直接上傳 GitHub。
