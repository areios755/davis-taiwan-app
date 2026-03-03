# Davis Taiwan APP — 毛安住外接改造規格 v1

> 📅 2026-02-27
> 用途：分析現有 Davis APP 與毛安住系統的整合缺口，開出改造規格

---

## 一、現有 APP 架構總覽

### 1.1 技術棧

| 項目 | 現況 |
|------|------|
| 前端 | 單一 `index.html`（2,554 行），HTML + CSS + JS 全部內嵌 |
| 後端 | Netlify Functions × 8 支（Node.js） |
| 資料庫 | Supabase（6 張表：settings / products / breeds / analytics / users / shares + certifications） |
| AI | Claude API（後端 proxy，不暴露 key 給前端） |
| 部署 | Netlify（靜態站 + serverless） |
| PWA | 有 manifest.json + service worker |

### 1.2 現有功能清單

| 功能 | 狀態 | 說明 |
|------|------|------|
| 📷 照片 AI 分析 | ✅ 完整 | 上傳照片 → Claude 辨識品種毛質 → 三等級推薦 |
| ⚡ 品種快選 | ✅ 完整 | 前端 BREEDS 對照表 → 不呼叫 AI |
| 🏷️ 三等級方案 | ✅ 完整 | Basic / Advanced / Signature（Tab 切換） |
| 📤 分享功能 | ✅ 完整 | Canvas 圖片 + 短連結（Supabase 儲存） |
| 📊 後台管理 | ✅ 完整 | Admin panel（產品/品種 CRUD、AI 助手、Analytics、成本追蹤） |
| 🔗 Embed 模式 | ✅ 部分完成 | iframe 嵌入 + postMessage，**但只支援「汪得福」** |
| 🏅 美容師認證 | ✅ 完整 | 申請 → 審核 → QR Badge |
| 📈 Analytics | ✅ 完整 | 使用紀錄 + Token 成本追蹤 |

### 1.3 後端 Functions 清單

| Function | 行數 | 用途 |
|----------|------|------|
| `analyze.js` | 156 | 核心：Claude AI 分析照片，回傳三等級 JSON |
| `admin.js` | 236 | Admin CRUD API（products/breeds/settings/users/analytics/certifications） |
| `ai-assist.js` | 160 | Admin AI 助手：貼文字 → 提取品種配方 |
| `davis-config.js` | 63 | 前端動態設定（products/breeds/settings） |
| `share.js` | 114 | 分享短連結儲存/查詢 |
| `certify.js` | 192 | 認證申請/審核 |
| `log.js` | 55 | Analytics 寫入 |
| `ping.js` | 48 | 健康檢查 |

### 1.4 現有 Embed 模式運作方式

```
父視窗 URL 參數：
  ?embed=true&breed=貴賓&weight=5&hotel=wangdefu&lang=zh-TW

Davis APP embed 行為：
  1. 隱藏 hero / CTA footer / 安裝提示
  2. 顯示 embed info bar（品種 + 體重 + 旅館名）
  3. 品種預填 → 假裝 AI 分析動畫 → 自動選品種 chip
  4. 顯示三等級推薦 → 底部「確認」按鈕
  5. 用戶按確認 → postMessage 回傳結果給父視窗
```

---

## 二、毛安住系統的外接需求（來源：規格文件）

> 來源：grooming-flow-spec §18、settings-module-spec §9、inventory-supply-chain-spec §4

### 2.1 觸發場景

| 場景 | 觸發位置 |
|------|---------|
| 客戶前台預約美容 | 選洗澡方案時彈出 iframe |
| 客戶前台住宿照護設定 | 設定洗澡類型時彈出 |
| 員工端到店檢查 | 推銷輔助 |

### 2.2 嵌入 URL

```
https://davis-app-url/?embed=true
  &breed=貴賓
  &weight=5
  &hotel=maoanzu
  &lang=zh-TW
  &store_name=毛安住寵物旅館    ← 🆕 白牌店名
  &pet_name=Lucky              ← 🆕 寵物名（個人化體驗）
```

### 2.3 postMessage 需要回傳的完整格式

```json
{
  "type": "davis-recommendation",
  "source": "davis-grooming-ai",
  "hotel": "maoanzu",
  "breed": "貴賓",
  "weight": 5.0,
  "result": {
    "recommended": "advanced",
    "reason": "皮膚偏乾，建議深層滋潤",
    "autoApply": true,
    "products": [
      {
        "phase": "第一洗",
        "name": "奢華洗劑",
        "dilution": "12:1",
        "dwell_time": "5-8min"
      },
      {
        "phase": "第二洗",
        "name": "高級炫彩洗劑",
        "dilution": "10:1",
        "dwell_time": "5-8min"
      },
      {
        "phase": "護毛素",
        "name": "滋潤護毛素",
        "dilution": "7:1",
        "dwell_time": "3-5min"
      }
    ]
  }
}
```

---

## 三、缺口分析（現有 vs 需要）

### 🔴 必改（不改就不能接毛安住）

| # | 缺口 | 現況 | 需要 | 影響 |
|---|------|------|------|------|
| 1 | **postMessage 缺 `products` 欄位** | `embedConfirmTier()` 只送 `recommended` + `reason` | 需要完整產品清單（name / phase / dilution / dwell_time） | 毛安住無法做庫存扣減 |
| 2 | **hotel 品種映射只有「汪得福」** | `BREED_MAP_FROM_WANGDEFU` 硬編碼 | 需要通用品種映射或毛安住專用映射 | 品種預填失敗 |
| 3 | **UI 文字硬編碼「汪得福」** | 確認按鈕「✅ 已選擇…，已同步到汪得福」、info bar 顯示「汪得福」 | 依 hotel 參數動態顯示店名 | 用戶體驗不一致 |
| 4 | **embed_whitelist 不含毛安住** | 設定值只有 `wonderpet.netlify.app` | 需加入毛安住 domain（或改為通用 `*`） | iframe 載入可能被擋 |

### 🟡 應改（安全與品質）

| # | 缺口 | 現況 | 需要 | 影響 |
|---|------|------|------|------|
| 5 | **安全審計 7 項問題未修** | AUDIT_REPORT.md 列出 XSS / Token 硬編碼 / 無 Rate Limit 等 | 全部修復 | 安全漏洞 |
| 6 | **postMessage 的 `targetOrigin` 用 `'*'`** | `window.parent.postMessage(payload, '*')` | 應用 embed_whitelist 的 origin 限制 | 數據外洩風險 |
| 7 | **AI 分析 model 過度使用** | 用 `claude-opus-4-6`（最貴的 model） | 照片分析改用 Sonnet（更快更便宜，視覺能力足夠） | 成本過高 |
| 8 | **品種快選的品種映射只做了犬貓各十幾種** | 只有 35 種品種對照 | 缺少台灣常見品種（如：蝴蝶犬已有，但暹羅貓、孟加拉等缺） | 品種匹配失敗率高 |

### 🟢 建議改（提升體驗）

| # | 缺口 | 現況 | 需要 | 影響 |
|---|------|------|------|------|
| 9 | **embed 模式無法接收毛安住的寵物照片** | 只能在 iframe 內拍照或上傳 | 毛安住已有到店檢查照片，可用 URL param 傳入 | 避免重複拍照 |
| 10 | **品種快選和 AI 分析兩條路徑的結果格式不同** | 品種快選 → `renderBreedBasic()`（只有基礎方案）；AI 分析 → `renderResults()`（三等級） | 品種快選也應該產出三等級（用前端 PRODUCTS 組合） | 快選在 embed 模式下無法選進階/SPA |
| 11 | **embed 新增參數：`pet_name` / `store_name`** | 無 | 個人化體驗（「Lucky 的專屬洗護方案」） | 體驗加分 |
| 12 | **分享功能在 embed 模式下不需要** | 分享按鈕仍顯示 | embed 模式隱藏分享，專注在選方案 | UI 干淨 |

---

## 四、改造規格（逐項）

### 4.1 postMessage 增加 products 欄位 🔴

**位置**：`index.html` → `embedConfirmTier()` 函式（第 2142-2188 行）

**改法**：從 `currentAiResult.tiers[selectedTierId].steps` 提取產品清單

```javascript
// 原本只送：
const payload = {
  type: 'davis-recommendation',
  result: { recommended, reason, autoApply: true }
};

// 改為：
function extractProducts(tierId) {
  if (!currentAiResult?.tiers?.[tierId]?.steps) return [];
  return currentAiResult.tiers[tierId].steps.map(step => ({
    phase: step.phase,           // "第一洗・深層清潔"
    name: step.products[0],      // "奢華洗劑" (主產品名)
    dilution: step.dilution,     // "稀釋 12:1"
    dwell_time: step.dwell_time  // "停留 5-8 分鐘"
  }));
}

const payload = {
  type: 'davis-recommendation',
  result: {
    recommended,
    reason,
    autoApply: true,
    products: extractProducts(tierId)  // ← 新增
  }
};
```

**⚠️ 討論點：`name` 一致性**

毛安住庫存系統需要 `products[].name` 跟產品目錄的 `name` **完全一致**才能比對扣庫存。

目前 AI 回傳的 `steps[].products[]` 是 AI 自由生成的文字，可能有：
- 「Davis 奢華洗劑 Best Luxury Shampoo」 vs 產品目錄叫「奢華洗劑」
- 「滋潤護毛素 Creme Rinse」 vs 產品目錄叫「滋潤護毛素」

**方案 A**：在 AI prompt 中嚴格約束只輸出繁中短名（不含英文）
**方案 B**：Davis APP 後端做名稱正規化（AI 回傳後 mapping 到標準名）
**方案 C**：毛安住端做模糊比對（contain 而非完全相等）

> 🔵 **建議 A+B**：prompt 約束 + 後端 double check。最可靠。

---

### 4.2 通用 Hotel 支援（取代硬編碼汪得福） 🔴

**改動範圍**：

```javascript
// ① 品種映射 — 從硬編碼改為通用設定
// 刪除 BREED_MAP_FROM_WANGDEFU
// 改為從 davis_settings 動態載入 breed_aliases

// davis_settings 新增一筆：
// key: "breed_aliases"
// value: {
//   "maoanzu": { "貴賓（迷你/玩具）": "貴賓犬 🐩", ... },
//   "wangdefu": { ... 原本的 mapping ... }
// }

// ② UI 文字動態化
const hotelNames = {
  wangdefu: '汪得福寵物旅館',
  maoanzu: '{store_name}',       // 從 URL param 讀取
  default: 'Davis 洗護顧問'
};

// ③ 確認按鈕文字
confirmBtn.textContent = `✅ 確認「${recLabel}」，回到${storeName}`;

// ④ Toast 文字
toast.textContent = `✅ 已選擇「${tierName}」，已同步到${storeName}`;
```

---

### 4.3 embed_whitelist 更新 🔴

```sql
-- Supabase 更新
UPDATE davis_settings
SET value = '["https://wonderpet.netlify.app", "https://maoanzu.com", "https://*.maoanzu.com"]'
WHERE key = 'embed_whitelist';
```

並在 `sendRecommendationToParent()` 和 `embedConfirmTier()` 中改用白名單 origin：

```javascript
// 從 *（不安全）改為白名單
const targetOrigin = getWhitelistedOrigin();  // 從 settings 讀取
window.parent.postMessage(payload, targetOrigin);
```

---

### 4.4 安全修復 🟡

依 AUDIT_REPORT.md 修復：

| 問題 | 修復方式 |
|------|---------|
| XSS：innerHTML 未消毒 | 所有用戶輸入用 `escapeHtml()` 處理 |
| Token secret 硬編碼 | 改讀環境變數 `DAVIS_TOKEN_SECRET` |
| Admin API 無 rate limit | 加入 IP-based rate limiting（Netlify Edge Function 或 Supabase RLS） |
| CORS `*` | 限制為白名單 origin |
| 認證頁 URL 注入 | safeUrl() 過濾 |

---

### 4.5 AI Model 降級 🟡

```javascript
// analyze.js
// 從：model: "claude-opus-4-6"
// 改為：model: "claude-sonnet-4-5-20250929"

// 理由：
// - 照片品種辨識 Sonnet 綽綽有餘
// - 輸入成本：Opus $15/MTok → Sonnet $3/MTok（5 倍差距）
// - 輸出成本：Opus $75/MTok → Sonnet $15/MTok（5 倍差距）
// - 速度更快（Sonnet 回應 ~2s vs Opus ~5-8s）
```

---

### 4.6 品種快選 → 三等級推薦 🟢

**現況問題**：品種快選（點 chip）只呼叫 `renderBreedBasic()`，只渲染基礎方案。在 embed 模式下，用戶無法選進階/SPA。

**改法**：品種快選也要產出三等級，用前端 PRODUCTS 資料庫組合：

```javascript
function buildThreeTiersFromBreed(breedName) {
  const productKeys = BREEDS[breedName] || [];
  const productData = productKeys.map(k => PRODUCTS[k]);

  return {
    breed: breedName,
    pet_type: breedName.includes('貓') ? '貓' : '狗',
    tiers: {
      basic: buildTier('basic', productData),     // 第一洗 + 護毛素
      advanced: buildTier('advanced', productData), // + 第二洗
      signature: buildTier('signature', productData) // + SPA 第三洗
    }
  };
}
```

這樣品種快選和 AI 分析的結果格式就統一了，embed 模式下兩條路徑都能選三等級。

---

### 4.7 embed 模式接收外部照片 🟢

毛安住到店檢查時已有寵物照片，可透過 URL param 傳入：

```
?embed=true&breed=貴賓&weight=5&hotel=maoanzu
&photo_url=https://storage.maoanzu.com/checkin/abc123.jpg
```

Davis APP 接到 `photo_url` 後：
1. 直接顯示為預覽圖
2. 自動觸發 AI 分析（不需用戶再拍照）
3. 省去上傳步驟，體驗更流暢

**⚠️ 討論點**：安全性 — photo_url 需要驗證來源是否在白名單內。

---

### 4.8 embed 模式 UI 精簡 🟢

embed 模式下額外隱藏：
- 分享按鈕 / 分享 modal
- 品種快選區塊（如果已有 breed param 且匹配成功）
- 「重新分析」按鈕 → 改為「🔄 重新拍照分析」（更精簡）

embed 模式下額外新增：
- 顯示寵物名（如有 pet_name param）：「Lucky 的專屬洗護方案」
- 顯示店家名（如有 store_name param）：info bar 用店名取代旅館名

---

## 五、待討論清單

以下問題需要確認後才能定版規格：

### ❓ 1. 產品名稱一致性策略

Davis AI 回傳的產品名 vs 毛安住庫存的產品名，要怎麼確保一致？

- **A**：Prompt 約束 + 後端正規化（推薦）
- **B**：毛安住端做模糊比對
- **C**：兩邊共用同一份產品 ID（最嚴謹但耦合高）

### ❓ 2. 品種映射管理方式

各 hotel 的品種名稱不同（汪得福叫「法鬥」、毛安住可能叫「法國鬥牛犬」）。

- **A**：Davis Admin 後台新增「品種別名管理」頁面，各 hotel 各一組 mapping
- **B**：毛安住端負責送標準品種名（由毛安住的品種庫轉換）
- **C**：Davis APP 做模糊比對（contain / similarity）

### ❓ 3. embed 外部照片要不要做？

- 如果做：到店檢查照片直接傳給 AI 分析，體驗好但需處理跨域圖片
- 如果不做：用戶在 iframe 內重新拍照，簡單但多一步

### ❓ 4. 認證系統是否保留？

美容師認證（certify / verify / badge）是獨立功能，跟毛安住系統無直接關係。

- **A**：保留（Davis APP 同時服務獨立用戶和毛安住）
- **B**：拆出去另一個 project
- **C**：先保留但不動

### ❓ 5. 前端架構要不要重寫？

現在是 2,554 行的單一 HTML 檔案，所有 JS/CSS 內嵌。

- **A**：保持現狀，只修改必要的部分（最快，但維護性差）
- **B**：拆分為模組化 JS（多檔案），但仍然是純 HTML + Vanilla JS
- **C**：改為 React + Vite 項目（最好維護，但是整個重寫）

### ❓ 6. davis/ 子資料夾的重複版本要不要清理？

`davis/` 資料夾下有另一個版本的 `index.html`（2,556 行）和獨立的 netlify functions，跟根目錄幾乎一樣。

- **A**：刪掉 `davis/`，只保留根目錄版本
- **B**：保留但不動（可能有歷史原因）

---

## 六、改造工作清單與時間估算

| 優先 | 項目 | 估算時間 | 依賴 |
|------|------|---------|------|
| 🔴 P0 | postMessage 增加 products 欄位 | 0.5 天 | 討論 ❓1 |
| 🔴 P0 | 通用 hotel 支援（去掉汪得福硬編碼） | 0.5 天 | 討論 ❓2 |
| 🔴 P0 | embed_whitelist 加入毛安住 | 10 分鐘 | — |
| 🔴 P0 | postMessage targetOrigin 安全化 | 0.5 天 | — |
| 🟡 P1 | 安全修復（XSS / Token / Rate Limit） | 1 天 | — |
| 🟡 P1 | AI Model 降級 Opus → Sonnet | 10 分鐘 | — |
| 🟡 P1 | 品種快選產出三等級 | 1 天 | — |
| 🟢 P2 | embed 接收外部照片 | 0.5 天 | 討論 ❓3 |
| 🟢 P2 | embed UI 精簡 + pet_name/store_name | 0.5 天 | — |
| 🟢 P2 | 重複檔案清理 | 10 分鐘 | 討論 ❓6 |
| — | 前端架構重寫（如選 C） | 3-5 天 | 討論 ❓5 |

**P0 + P1 合計**：~3.5 天
**含 P2**：~5 天
**含架構重寫**：~8-10 天

---

## 七、改造後架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                     毛安住 SaaS 系統                         │
│                                                             │
│  美容預約 / 到店檢查 / 住宿照護設定                          │
│       │                                                     │
│       │ 按「🤖 AI 洗護建議」                                │
│       ▼                                                     │
│  ┌─────────────────────────────────────────┐               │
│  │ iframe: Davis APP (embed mode)          │               │
│  │                                         │               │
│  │  ?embed=true                            │               │
│  │  &breed=貴賓                             │               │
│  │  &weight=5                              │               │
│  │  &hotel=maoanzu                         │               │
│  │  &store_name=毛茸茸寵物沙龍              │               │
│  │  &pet_name=Lucky                        │               │
│  │  &lang=zh-TW                            │               │
│  │  &photo_url=https://...（可選）          │               │
│  │                                         │               │
│  │  [拍照 / 品種快選]                       │               │
│  │       ↓                                 │               │
│  │  [三等級推薦面板]                         │               │
│  │       ↓                                 │               │
│  │  [✅ 確認，回到{store_name}]             │               │
│  │       │                                 │               │
│  └───────│─────────────────────────────────┘               │
│          │ postMessage                                      │
│          ▼                                                  │
│  ┌──────────────────────────────┐                          │
│  │ davis-recommendation         │                          │
│  │  recommended: "advanced"     │ → 對應價格等級（×1.3）    │
│  │  products: [                 │                          │
│  │    {name: "奢華洗劑", ...}   │ → 庫存扣減               │
│  │    {name: "炫彩洗劑", ...}   │ → 庫存扣減               │
│  │    {name: "滋潤護毛素", ...} │ → 庫存扣減               │
│  │  ]                           │                          │
│  └──────────────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
