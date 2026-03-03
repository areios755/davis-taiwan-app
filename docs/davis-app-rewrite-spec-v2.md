# Davis Taiwan APP — 重寫規格 v2（定版）

> 📅 2026-02-27
> 用途：Davis APP 全面 React 重寫規格，供 AI Coding 使用
> 定位：**獨立行銷利器（主體）+ 可被毛安住嵌入的模組（附加能力）**

---

## 〇、決策紀錄

| # | 議題 | 決定 |
|---|------|------|
| 1 | 產品名稱一致性 | Prompt 約束 + 後端正規化（兩道保險） |
| 2 | 品種映射 | 毛安住端送標準名，Davis 不維護各 hotel 別名 |
| 3 | embed 外部照片 | 不做（iframe 內拍照或品種快選） |
| 4 | 認證系統 | 保留且更明顯（首頁入口 + 美容師專區 + 地圖） |
| 5 | 前端架構 | React + Vite + TypeScript 整個重寫 |
| 6 | 重複資料夾 | 刪掉 davis/ 子資料夾 |
| 7 | 四國語言 | AI 回覆 + 前端 UI 全面四語（繁中/簡中/英文/日文） |
| 8 | 語言切換 | 右上角語言切換器（用戶自選） |
| 9 | 獨立 vs embed | 獨立 = 完整行銷首頁；embed = 只留洗護分析核心 |
| 10 | 季節推薦 | 系統按當前月份自動帶入季節參數給 AI |
| — | 行銷功能 | 品牌區塊 + LINE/IG 分享 + 認證美容師地圖 + 產品圖鑑 |
| — | 體驗優化 | 帶毛色品種搜尋 + 找美容師 CTA + 離線品種快選 |
| — | 後台 | 全部保留 + 延用現有 Supabase/Netlify 設定 |

---

## 一、技術棧

| 項目 | 技術 | 說明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 跟毛安住主系統一致 |
| 建置工具 | Vite | 快速 HMR，輕量打包 |
| 樣式 | Tailwind CSS | 取代手寫 CSS |
| 國際化 | react-i18next | 四語切換 |
| 狀態管理 | React useState / useReducer | APP 規模小，不需全域狀態庫 |
| 後端 | Netlify Functions（Node.js → TypeScript） | 保持現有部署架構 |
| 資料庫 | Supabase PostgreSQL | 保持現有，精簡表結構 |
| AI | Anthropic Claude API（**Sonnet**） | 降級省成本，視覺辨識足夠 |
| PWA | vite-plugin-pwa | manifest + service worker + 離線快取 |
| 部署 | Netlify | Vite build + Functions |
| 地圖 | Google Maps Embed 或 Leaflet | 認證美容師地圖 |

### 延用的現有設定（不變）

| 項目 | 說明 |
|------|------|
| Supabase 全部表結構 | davis_settings / products / breeds / analytics / users / shares / certifications |
| 環境變數 | ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY / DAVIS_TOKEN_SECRET |
| 產品資料庫內容 | 15 組配方 + 稀釋比例 + 步驟 |
| 品種對照表 | 35+ 品種對應關係 |
| AI Prompt 核心結構 | 三等級推薦格式、品種規則、產品庫（優化但不重寫） |
| Admin 後台全功能 | 產品/品種 CRUD、AI 助手、Analytics、使用者管理、成本追蹤 |
| 認證流程 | 申請 → 審核 → Badge |

---

## 二、頁面結構

### 2.1 獨立模式（完整行銷站）

```
/                     首頁（Hero + 品牌區塊 + AI分析入口 + 認證入口）
/analyze              AI 洗護分析（拍照 + 品種搜尋 → 三等級結果）
/products             產品圖鑑（瀏覽全系列 Davis 產品）
/products/:id         單一產品詳情
/groomers             認證美容師專區（列表 + 地圖模式）
/groomers/:id         單一美容師 Badge 頁
/certify              美容師認證申請
/verify/:id           認證驗證頁（掃 QR Code）
/r/:id                分享結果頁
/admin                後台管理（登入牆後）
```

### 2.2 embed 模式（毛安住 iframe 嵌入）

```
/?embed=true&breed=貴賓&weight=5&hotel=maoanzu&store_name=毛茸茸&pet_name=Lucky&lang=zh-TW

隱藏：Hero / 品牌區塊 / 認證入口 / 產品圖鑑 / CTA footer / PWA 安裝
保留：AI 分析核心（拍照 + 品種搜尋 → 三等級結果 + 確認按鈕）
精簡：header 縮小（保留 Davis 小 logo）、隱藏分享按鈕
新增：embed info bar（品種+體重+店名）、底部確認按鈕
```

---

## 三、功能規格

### 3.1 首頁（獨立模式）

```
┌─────────────────────────────────────┐
│  🔵 Davis Logo + 語言切換（右上）    │
├─────────────────────────────────────┤
│                                     │
│  Hero 區塊                          │
│  「AI 寵物洗護顧問」                 │
│  「拍一張照，立即獲得專業洗護建議」    │
│  [ 📷 開始分析 ]  [ ⚡ 品種快選 ]    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  為什麼選 Davis？                    │
│  ┌─────┐ ┌─────┐ ┌─────┐          │
│  │CFA  │ │40年 │ │專業 │          │
│  │官方  │ │歷史 │ │配方 │          │
│  │推薦  │ │品牌 │ │研發 │          │
│  └─────┘ └─────┘ └─────┘          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  🏅 Davis 認證美容師                │
│  「尋找你附近的認證專業美容師」       │
│  [ 查看認證美容師 ]                  │
│  [ 我是美容師，申請認證 → ]          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  📦 產品圖鑑                        │
│  「探索 Davis 全系列洗護產品」        │
│  [ 瀏覽產品 → ]                     │
│                                     │
├─────────────────────────────────────┤
│  CTA Footer: davistaiwan.com        │
└─────────────────────────────────────┘
```

### 3.2 AI 洗護分析（/analyze）

核心功能，獨立模式和 embed 模式共用，embed 時精簡 UI。

#### Phase 1：上傳/選擇

```
┌─────────────────────────────────────┐
│ [embed info bar: 🐩 貴賓 5kg 毛茸茸]│ ← 僅 embed 模式
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────┐         │
│  │      📷 拍照           │         │
│  │   或拖曳上傳照片       │         │
│  └───────────────────────┘         │
│                                     │
│  ─── 或用品種搜尋 ───               │
│                                     │
│  🔍 [ 輸入品種名稱...          ]    │  ← 搜尋框（支援帶毛色）
│                                     │
│  常見品種：                          │
│  [貴賓犬] [比熊犬] [柴犬] [柯基]     │  ← chip 快選仍保留
│  [布偶貓] [英短] [金吉拉] ...       │
│                                     │
│  [ 🤖 開始 AI 分析 ]               │
└─────────────────────────────────────┘
```

**品種搜尋規則**：
- 支援打字即時篩選（fuzzy match）
- 支援帶毛色輸入：「紅貴賓」→ 拆解為品種「貴賓犬」+ 毛色「紅/棕」
- 帶毛色時，AI prompt 額外帶入毛色資訊影響推薦（如紅棕色 → 高級炫彩洗劑）
- 支援四語輸入（繁中/簡中/英文/日文品種名）
- 找不到精確匹配 → 建議拍照分析

#### Phase 2：分析中

```
┌─────────────────────────────────────┐
│                                     │
│     ┌───────────────┐              │
│     │  [照片/🐾]    │ ← 掃描動畫   │
│     └───────────────┘              │
│                                     │
│   🔍 正在辨識品種特徵...            │
│   🐾 分析毛質類型...               │
│   💧 比對 Davis 產品資料庫...       │
│   🌿 參考當季環境因素...            │ ← 新增季節步驟
│   📋 生成個人化洗護方案...          │
│                                     │
└─────────────────────────────────────┘
```

#### Phase 3：三等級結果

```
┌─────────────────────────────────────┐
│ ✅ 三等級洗護方案                    │
│ 🐩 貴賓犬 · 狗 · 紅棕色捲毛         │
│ 💬 活潑好動，毛質偏乾               │
│ 🌿 換毛季節，建議加強底層護理        │ ← 季節提示
├─────────────────────────────────────┤
│ [🔵 基礎洗] [💎 進階洗] [✨ 完美SPA] │ ← Tab 切換
├─────────────────────────────────────┤
│                                     │
│  💎 進階洗 — 加強功能性護理          │
│                                     │
│  ┌ Step 1 · 第一洗 ──────────────┐ │
│  │ 奢華洗劑                       │ │
│  │ 💧 稀釋 12:1  ⏱ 停留 5-8 分鐘  │ │
│  │ 💡 體味偏重犬首選               │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌ Step 2 · 第二洗 ──────────────┐ │
│  │ 高級炫彩洗劑                    │ │
│  │ 💧 稀釋 10:1  ⏱ 停留 5-8 分鐘  │ │
│  │ 💡 紅棕色毛色更顯亮澤           │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌ Step 3 · 護毛素 ──────────────┐ │
│  │ 滋潤護毛素                     │ │
│  │ 💧 稀釋 7:1   ⏱ 停留 3-5 分鐘  │ │
│  └────────────────────────────────┘ │
│                                     │
│  ⭐ 方案亮點：紅棕毛色提亮 + 去味   │
│                                     │
│  [ 📤 分享這個方案 ]               │ ← 獨立模式
│  [ ✅ 確認，回到毛茸茸 ]           │ ← embed 模式
│                                     │
├─────────────────────────────────────┤
│  💡 叮嚀：換毛季建議 2-3 週洗一次   │
│                                     │
│  🏅 找附近認證美容師 →             │ ← 導流 CTA（獨立模式）
└─────────────────────────────────────┘
```

### 3.3 產品圖鑑（/products）

```
┌─────────────────────────────────────┐
│  📦 Davis 產品圖鑑                  │
│                                     │
│  分類篩選：                          │
│  [全部] [清潔] [毛質] [毛色]        │
│  [季節] [SPA] [護毛素] [敏感]       │
│                                     │
│  🔍 [ 搜尋產品名稱... ]            │
│                                     │
│  ┌──────────────────┐              │
│  │ 🧴 奢華洗劑       │              │
│  │ Davis Best Luxury │              │
│  │ 體味重・油脂旺盛   │              │
│  │ 稀釋 12:1         │              │
│  │ [ 了解更多 → ]    │              │
│  └──────────────────┘              │
│  ┌──────────────────┐              │
│  │ ✨ 高級炫彩洗劑    │              │
│  │ ...               │              │
│  └──────────────────┘              │
│  ...                                │
└─────────────────────────────────────┘
```

**資料來源**：Supabase davis_products 表（Admin 後台管理），靜態 PRODUCTS 資料為 fallback。
**四語**：產品名/標籤/理由/注意事項都有四語版本（tag_zh / tag_en / tag_ja / tag_cn 等）。

### 3.4 認證美容師專區（/groomers）

```
┌─────────────────────────────────────┐
│  🏅 Davis 認證美容師                │
│                                     │
│  切換：[📋 列表] [🗺️ 地圖]         │
│                                     │
│  篩選：[ 縣市 ▼ ] [ 等級 ▼ ]       │
│                                     │
│  ── 列表模式 ──                     │
│  ┌──────────────────────────┐      │
│  │ 🏅 毛茸茸寵物沙龍         │      │
│  │ 📍 台北市大安區            │      │
│  │ ⭐ Advanced 認證           │      │
│  │ [ 查看詳情 ] [ IG ] [ FB ] │      │
│  └──────────────────────────┘      │
│                                     │
│  ── 地圖模式 ──                     │
│  ┌──────────────────────────┐      │
│  │                          │      │
│  │   🗺️ Google Maps         │      │
│  │   📍📍📍                 │      │
│  │                          │      │
│  └──────────────────────────┘      │
│                                     │
│  [ 我是美容師，申請認證 → ]          │
└─────────────────────────────────────┘
```

**資料來源**：Supabase davis_certifications 表（status = approved）。
**Badge 頁**（/groomers/:id）：公開可分享，含 QR Code、認證等級、有效期、店家資訊。

### 3.5 認證申請（/certify）

保留現有流程，重寫為 React 表單：
- 店名、負責人、電話、縣市、地址、IG/FB/LINE、申請說明
- 四語表單
- 提交後狀態追蹤

### 3.6 分享功能

**獨立模式**：分析結果可分享
- Canvas 生成分享圖片（保留現有邏輯）
- 一鍵分享到 LINE（使用 LINE Share API：`https://social-plugins.line.me/lineit/share?url=`）
- 一鍵分享到 IG Story（生成圖片 → 引導下載後分享）
- 複製分享連結（短連結 /r/:id）
- Web Share API（支援原生分享面板）

**embed 模式**：隱藏分享功能

### 3.7 後台管理（/admin）

完整保留現有功能，React 重寫：

| Tab | 功能 | 改動 |
|-----|------|------|
| Dashboard | 總覽 + 成本追蹤 | 重寫 UI，邏輯不變 |
| 產品管理 | CRUD + 排序 + 啟用/停用 | 新增四語欄位（tag_cn / reason_cn / tag_ja / reason_ja 等） |
| 品種管理 | CRUD + 排序 + 產品對應 | 新增四語欄位 |
| 設定 | 系統設定 | 新增季節設定顯示（唯讀，系統自動） |
| Analytics | 使用紀錄 + 圖表 | 重寫 UI，邏輯不變 |
| 使用者 | 帳號管理 | 重寫 UI，邏輯不變 |
| AI 助手 | 貼文字提取配方 | 重寫 UI，邏輯不變 |
| 認證管理 | 申請審核 + Badge 管理 | 重寫 UI，新增地圖預覽 |

---

## 四、embed 模式串接規格

### 4.1 嵌入 URL 參數

```
https://davis-app-url/?embed=true
  &breed=貴賓犬            # 品種標準名（毛安住端負責轉換）
  &weight=5                # 體重 kg
  &hotel=maoanzu           # 來源識別
  &store_name=毛茸茸寵物沙龍  # 店名（顯示用）
  &pet_name=Lucky           # 寵物名（顯示用）
  &lang=zh-TW              # 語言
```

### 4.2 embed 模式行為

| 項目 | 行為 |
|------|------|
| Header | 縮小，保留 Davis 小 logo |
| Hero / 品牌區塊 | 隱藏 |
| 認證入口 | 隱藏 |
| 產品圖鑑 | 隱藏 |
| CTA Footer | 隱藏 |
| PWA 安裝提示 | 隱藏 |
| 分享按鈕 | 隱藏 |
| 找美容師 CTA | 隱藏 |
| embed info bar | 顯示（品種 + 體重 + 店名 + 寵物名） |
| 確認按鈕 | 顯示（底部固定「✅ 確認，回到{store_name}」） |
| 語言 | 依 lang 參數，不顯示語言切換器 |
| **品種鎖定** | **有 breed 參數 → 品種鎖定不可修改（灰色顯示）** |

### 4.2.1 品種鎖定規則（embed 模式重要）

**品種以毛安住資料為準**（飼主填寫，保證正確）。Davis AI 可能辨識錯誤，因此 embed 模式下品種由毛安住傳入並鎖定。

```
embed + 有 breed 參數：
  ① 品種鎖定顯示（灰色不可編輯）
  ② 飼主可拍照 → AI 只分析毛況/膚質/季節，不重新辨識品種
  ③ 或直接用品種快選出三等級結果（不拍照）
  ④ AI prompt 指令：「品種已確認為{breed}，請勿重新辨識。只分析毛況/膚質/季節。」

embed + 無 breed 參數（例外）：
  → 品種搜尋 / 拍照辨識（跟獨立模式一樣）

獨立模式：
  → AI 辨識品種（正常流程，品種不鎖定）
```

### 4.3 postMessage 回傳格式

```typescript
// 型別定義
interface DavisProduct {
  phase: string;       // "第一洗" | "第二洗" | "SPA第三洗" | "護毛素"
  name: string;        // 標準產品名（經後端正規化）
  dilution: string;    // "12:1"
  dwell_time: string;  // "5-8min"
}

interface DavisRecommendation {
  type: "davis-recommendation";
  source: "davis-grooming-ai";
  hotel: string;              // "maoanzu"
  breed: string;              // "貴賓犬"
  weight: number | null;      // 5.0
  result: {
    recommended: "basic" | "advanced" | "spa";
    reason: string;           // AI 推薦理由（員工推銷話術）
    coat_analysis: string;    // 🆕 毛質分析（美容師執行參考）
    season_hint: string;      // 🆕 季節提示（操作提醒）
    autoApply: boolean;       // true（用戶按確認才送出）
    products: DavisProduct[];
  };
}
```

**postMessage 範例**：

```json
{
  "type": "davis-recommendation",
  "source": "davis-grooming-ai",
  "hotel": "maoanzu",
  "breed": "貴賓犬",
  "weight": 5.0,
  "result": {
    "recommended": "advanced",
    "reason": "紅棕色捲毛，皮膚偏乾，建議深層滋潤",
    "coat_analysis": "捲毛、偏乾、紅棕色",
    "season_hint": "換毛季，建議加強底層護理",
    "autoApply": true,
    "products": [
      { "phase": "第一洗", "name": "奢華洗劑", "dilution": "12:1", "dwell_time": "5-8min" },
      { "phase": "第二洗", "name": "高級炫彩洗劑", "dilution": "10:1", "dwell_time": "5-8min" },
      { "phase": "護毛素", "name": "滋潤護毛素", "dilution": "7:1", "dwell_time": "3-5min" }
    ]
  }
}
```

### 4.3.1 毛安住端接收後的完整流程

```
飼主端預約洗澡 → 點「🤖 AI 洗護推薦」
    │
    ▼ 開啟 iframe（Davis embed mode）
    │
    │  飼主在 Davis 內拍照/品種搜尋
    │  → AI 分析品種+毛況+季節
    │  → 三等級推薦面板
    │  → 飼主選好方案，按確認
    │
    ▼ postMessage 回傳
    │
飼主端接收：
    ① 記錄選擇等級（如「進階洗」）→ 對應價格矩陣
    ② 記錄洗護產品清單 + 稀釋比例 + 停留時間
    ③ 記錄 AI 推薦理由 + 毛質分析 + 季節提示
    ④ 關閉 iframe → 飼主完成預約
    │
    ▼ 同步到老闆端/員工端
    │
老闆端顯示：
    ┌─────────────────────────────────┐
    │ 🐩 Lucky · 貴賓犬 · 進階洗      │
    │ 🤖 AI：紅棕捲毛偏乾，深層滋潤    │
    │ 🌿 換毛季，建議加強底層護理       │
    │ 📋 洗護 SOP：                    │
    │    ① 奢華洗劑 12:1 停留5-8min    │
    │    ② 高級炫彩洗劑 10:1 停留5-8min │
    │    ③ 滋潤護毛素 7:1 停留3-5min    │
    └─────────────────────────────────┘
    → 員工照 SOP 執行
    → 庫存自動扣減（如有啟用）
```

### 4.4 products 欄位提取邏輯

```typescript
// src/lib/product-normalizer.ts

// AI 回傳的 tiers[selectedTier].steps 提取 products
function extractProducts(tier: TierData): DavisProduct[] {
  return tier.steps.map(step => ({
    phase: extractPhase(step.phase),     // "第一洗・深層清潔" → "第一洗"
    name: normalizeProductName(step.products[0]),  // 正規化
    dilution: extractDilution(step.dilution),      // "稀釋 12:1" → "12:1"
    dwell_time: extractDwellTime(step.dwell_time)  // "停留 5-8 分鐘" → "5-8min"
  }));
}
```

### 4.5 產品名稱正規化（兩道保險）

**第一道：AI Prompt 約束**

```
在 analyze.js 的 system prompt 中加入：

【重要】steps[].products[] 的產品名稱必須使用以下標準名稱，不得加入英文或任何修飾：
去油膏 | 強效清潔洗劑 | 泡沫柑橘洗劑 | 蘇打燕麥洗劑 | 奢華洗劑 | 
質感洗劑 | 柔順洗劑 | 天然洋李洗劑 | 高級炫彩洗劑 | 炫黑洗劑 | 
輕盈洗劑犬用 | 輕盈洗劑貓用 | 燕麥蘆薈洗劑 | 茶樹精油洗劑 |
甜瓜洗劑 | 純粹深層清潔洗劑 | 魔力薰衣草洗劑 | 竹節花洗劑 |
卡瓦樹舒緩洗劑 | 甘甜曲奇洗劑 | 熱帶椰子洗劑 |
滋潤護毛素 | 純粹護毛素 | 燕麥免沖護毛素 | 輕盈乳液 |
Davis Spa 潔面乳
```

**第二道：後端正規化 mapping**

```typescript
// src/data/product-name-map.ts

const PRODUCT_NAME_MAP: Record<string, string> = {
  // AI 可能的變體 → 標準名
  "Davis 奢華洗劑": "奢華洗劑",
  "Best Luxury Shampoo": "奢華洗劑",
  "奢華洗劑 Best Luxury": "奢華洗劑",
  "Davis Best Luxury Shampoo": "奢華洗劑",
  "滋潤護毛素 Creme Rinse": "滋潤護毛素",
  "Creme Rinse & Conditioner": "滋潤護毛素",
  // ... 每個產品的可能變體
};

function normalizeProductName(aiName: string): string {
  // 1. 精確匹配
  if (PRODUCT_NAME_MAP[aiName]) return PRODUCT_NAME_MAP[aiName];
  // 2. 包含匹配（標準名包含在 AI 回傳中）
  for (const [, standard] of Object.entries(PRODUCT_NAME_MAP)) {
    if (aiName.includes(standard)) return standard;
  }
  // 3. 找不到 → 原樣回傳（毛安住端記 unmatched log）
  return aiName;
}
```

### 4.6 postMessage targetOrigin 安全化

```typescript
// src/hooks/useEmbed.ts

// 從 davis_settings 的 embed_whitelist 讀取
const WHITELIST = ['https://maoanzu.com', 'https://wonderpet.netlify.app'];

function sendToParent(payload: DavisRecommendation) {
  if (window.parent === window) return;

  // 取得父視窗 origin（透過 document.referrer）
  const parentOrigin = new URL(document.referrer).origin;

  // 檢查白名單
  if (WHITELIST.some(w => parentOrigin.startsWith(w))) {
    window.parent.postMessage(payload, parentOrigin);  // 精確 origin
  } else {
    console.warn('[Davis] Parent origin not in whitelist:', parentOrigin);
  }
}
```

---

## 五、季節推薦邏輯

### 5.1 季節定義

```typescript
// src/lib/season.ts

interface SeasonConfig {
  id: string;
  months: number[];       // 1-12
  label_zh: string;
  label_en: string;
  label_ja: string;
  label_cn: string;
  prompt_hint: string;    // 注入 AI prompt 的額外指令
  recommended_products: string[];  // 優先推薦的產品
}

const SEASONS: SeasonConfig[] = [
  {
    id: 'shedding',
    months: [3, 4, 5],
    label_zh: '換毛季',
    label_en: 'Shedding Season',
    label_ja: '換毛期',
    label_cn: '换毛季',
    prompt_hint: '現在是換毛季（3-5月），雙層毛品種建議優先使用輕盈洗劑系列幫助廢毛脫落。',
    recommended_products: ['輕盈洗劑犬用', '輕盈洗劑貓用', '輕盈乳液'],
  },
  {
    id: 'summer',
    months: [6, 7, 8],
    label_zh: '夏季防蟲控油',
    label_en: 'Summer Anti-Bug',
    label_ja: '夏の虫除け',
    label_cn: '夏季防虫控油',
    prompt_hint: '現在是夏季（6-8月），蚊蟲活躍、油脂分泌旺盛，建議考慮茶樹精油洗劑防蟲，或奢華洗劑控油。',
    recommended_products: ['茶樹精油洗劑', '奢華洗劑'],
  },
  {
    id: 'autumn',
    months: [9, 10, 11],
    label_zh: '秋季保濕',
    label_en: 'Autumn Moisture',
    label_ja: '秋の保湿',
    label_cn: '秋季保湿',
    prompt_hint: '現在是秋季（9-11月），空氣轉乾，建議加強保濕護理，可考慮燕麥蘆薈系列或免沖護毛素。',
    recommended_products: ['燕麥蘆薈洗劑', '燕麥免沖護毛素'],
  },
  {
    id: 'winter',
    months: [12, 1, 2],
    label_zh: '冬季低敏保養',
    label_en: 'Winter Gentle Care',
    label_ja: '冬のやさしいケア',
    label_cn: '冬季低敏保养',
    prompt_hint: '現在是冬季（12-2月），皮膚屏障較脆弱，建議使用低敏溫和配方，如蘇打燕麥或燕麥蘆薈系列。',
    recommended_products: ['蘇打燕麥洗劑', '燕麥蘆薈洗劑', '燕麥免沖護毛素'],
  },
];

function getCurrentSeason(): SeasonConfig {
  const month = new Date().getMonth() + 1;
  return SEASONS.find(s => s.months.includes(month))!;
}
```

### 5.2 注入 AI Prompt

```typescript
// netlify/functions/analyze.ts

const season = getCurrentSeason();

const systemPrompt = `
${BASE_PROMPT}

【當季建議】
${season.prompt_hint}
在 Signature (完美SPA洗) 等級中，請特別考慮當季因素選擇 SPA 第三洗產品。
`;
```

---

## 六、品種搜尋與帶毛色處理

### 6.1 搜尋框行為

```typescript
// src/components/BreedSearch.tsx

// 用戶輸入 → 即時篩選
// 支援：繁中/簡中/英文/日文品種名
// 資料來源：BREEDS 靜態資料 + Supabase davis_breeds（動態擴充）

interface BreedSearchResult {
  breed: string;       // 標準品種名
  color?: string;      // 解析出的毛色（如有）
  display: string;     // 顯示用（如 "貴賓犬 🐩"）
  matchType: 'exact' | 'fuzzy' | 'color_parsed';
}
```

### 6.2 帶毛色解析

```typescript
// src/lib/breed-matcher.ts

// 毛色關鍵字
const COLOR_KEYWORDS = {
  '紅': { zh: '紅棕色', en: 'red/brown', product_hint: '高級炫彩洗劑' },
  '奶油': { zh: '奶油白', en: 'cream/white', product_hint: '高級炫彩洗劑' },
  '黑': { zh: '黑色', en: 'black', product_hint: '炫黑洗劑' },
  '白': { zh: '白色', en: 'white', product_hint: '高級炫彩洗劑' },
  '灰': { zh: '灰色', en: 'gray', product_hint: null },
  '棕': { zh: '棕色', en: 'brown', product_hint: '高級炫彩洗劑' },
  '金': { zh: '金色', en: 'golden', product_hint: '高級炫彩洗劑' },
  '巧克力': { zh: '巧克力色', en: 'chocolate', product_hint: '高級炫彩洗劑' },
  '藍': { zh: '藍灰色', en: 'blue/gray', product_hint: null },
  '三花': { zh: '三花/玳瑁', en: 'calico', product_hint: null },
  '虎斑': { zh: '虎斑', en: 'tabby', product_hint: null },
};

function parseBreedInput(input: string): { breed: string; color: string | null } {
  // "紅貴賓" → { breed: "貴賓犬", color: "紅棕色" }
  // "奶油英短" → { breed: "英國短毛貓", color: "奶油白" }
  // "柴犬" → { breed: "柴犬", color: null }
  for (const [keyword, info] of Object.entries(COLOR_KEYWORDS)) {
    if (input.includes(keyword)) {
      const breedPart = input.replace(keyword, '').trim();
      const matched = fuzzyMatchBreed(breedPart);
      if (matched) return { breed: matched, color: info.zh };
    }
  }
  return { breed: fuzzyMatchBreed(input) || input, color: null };
}
```

### 6.3 毛色影響推薦

品種快選帶毛色時，注入 AI prompt 或前端 tier-builder：

```
用戶輸入「紅貴賓」
→ breed = 貴賓犬, color = 紅棕色
→ AI prompt 額外指令：「此寵物為紅棕色毛色，第二洗建議使用高級炫彩洗劑增色」
→ 或品種快選 tier-builder 自動將第二洗替換為高級炫彩洗劑
```

---

## 七、四國語言（i18n）

### 7.1 架構

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zh_TW from './locales/zh-TW.json';
import zh_CN from './locales/zh-CN.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

i18n.use(initReactI18next).init({
  resources: { 'zh-TW': zh_TW, 'zh-CN': zh_CN, en, ja },
  lng: 'zh-TW',  // 預設繁中
  fallbackLng: 'zh-TW',
});
```

### 7.2 翻譯範圍

| 類別 | 內容 |
|------|------|
| UI 文字 | 所有按鈕、標題、提示、導覽、表單 label、錯誤訊息 |
| 品種名 | name_zh / name_en / name_ja / name_cn（davis_breeds 表已有 zh/en/ja，新增 cn） |
| 產品名 | tag / reason / note 各四語（davis_products 表已有 zh/en/ja，新增 cn） |
| AI 回覆 | AI prompt 依語言切換輸出語言 |
| 認證頁面 | 申請表單 + Badge 頁 + 驗證頁 |
| 品牌區塊 | 「為什麼選 Davis」內容四語 |
| 季節提示 | 季節名稱 + 描述四語 |

### 7.3 語言切換器

```
Header 右上角：
  [繁] [简] [EN] [JP]

- 點擊切換，localStorage 記住選擇
- embed 模式：依 URL lang 參數，不顯示切換器
- 品種搜尋：依當前語言搜尋對應語言的品種名
- AI 分析：依當前語言決定 AI 回覆語言
```

---

## 八、安全修復

依 AUDIT_REPORT.md 全部修復：

| 問題 | 修復方式 |
|------|---------|
| XSS：innerHTML 未消毒 | React 預設 escape，不再有 innerHTML |
| API Key 暴露 | 已改為後端 proxy（保持不變） |
| Token secret 硬編碼 | 改讀環境變數 DAVIS_TOKEN_SECRET |
| postMessage `*` | 改為白名單 origin（見 §4.6） |
| Admin API 無 rate limit | 加入 IP-based rate limiting |
| CORS `*` | 限制為白名單 origin |
| 認證頁 URL 注入 | React 自動 escape + safeUrl 過濾 |
| AI Model 過貴 | Opus → Sonnet（省 80% 成本） |

---

## 九、AI Model 降級

```typescript
// netlify/functions/analyze.ts

// 從：model: "claude-opus-4-6"
// 改為：model: "claude-sonnet-4-5-20250929"

// 成本對比：
// Opus:   輸入 $15/MTok, 輸出 $75/MTok
// Sonnet: 輸入 $3/MTok,  輸出 $15/MTok
// 降幅：80%

// AI 助手（admin ai-assist）保持 Sonnet（已是 Sonnet）
```

Admin 後台 Dashboard 的成本追蹤也要更新 DEFAULT_PRICING：

```typescript
const DEFAULT_PRICING = { input_per_mtok: 3, output_per_mtok: 15 };
```

---

## 十、DB Schema 更新

### 10.1 davis_products 新增簡中欄位

```sql
ALTER TABLE davis_products ADD COLUMN IF NOT EXISTS tag_cn TEXT;
ALTER TABLE davis_products ADD COLUMN IF NOT EXISTS reason_cn TEXT;
ALTER TABLE davis_products ADD COLUMN IF NOT EXISTS note_cn TEXT;
```

### 10.2 davis_breeds 新增簡中欄位

```sql
ALTER TABLE davis_breeds ADD COLUMN IF NOT EXISTS name_cn TEXT;
```

### 10.3 davis_certifications 新增 lat/lng（地圖用）

```sql
ALTER TABLE davis_certifications ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE davis_certifications ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
```

### 10.4 davis_settings 更新

```sql
-- 更新白名單
UPDATE davis_settings SET value = '["https://wonderpet.netlify.app", "https://maoanzu.com", "https://*.maoanzu.com"]'
WHERE key = 'embed_whitelist';

-- 更新 AI 定價
UPDATE davis_settings SET value = '{"model":"claude-sonnet-4-5-20250929","input_per_mtok":3,"output_per_mtok":15,"currency":"USD"}'
WHERE key = 'ai_pricing';
```

---

## 十一、品種快選三等級升級

**現況問題**：品種快選只產出基礎方案（`renderBreedBasic`），embed 模式下無法選進階/SPA。

**改法**：品種快選也產出三等級，用前端 PRODUCTS 資料庫組合：

```typescript
// src/lib/tier-builder.ts

function buildThreeTiers(breedName: string, color?: string): AiResult {
  const productKeys = BREEDS[breedName] || [];
  const season = getCurrentSeason();

  return {
    breed: breedName,
    pet_type: breedName.includes('貓') ? '貓' : '狗',
    coat_analysis: `依品種特徵推薦`,
    tiers: {
      basic: buildBasicTier(productKeys, color),
      advanced: buildAdvancedTier(productKeys, color, season),
      signature: buildSignatureTier(productKeys, color, season),
    }
  };
}

// Basic: 第一洗 + 護毛素（1洗1護）
// Advanced: 第一洗 + 第二洗 + 護毛素（2洗1護）
// Signature: 第一洗 + 第二洗 + SPA第三洗 + 護毛素×2（3洗2護）
```

這樣品種快選和 AI 分析的結果格式統一，兩條路徑在 embed 模式下都能選三等級並回傳 products。

---

## 十二、專案結構

```
davis-taiwan-app/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── index.html
├── public/
│   ├── icon.png
│   ├── icon-512.png
│   ├── logo.png
│   └── manifest.json
├── src/
│   ├── main.tsx
│   ├── App.tsx                          # 路由
│   ├── i18n/
│   │   ├── index.ts                     # i18next 設定
│   │   └── locales/
│   │       ├── zh-TW.json
│   │       ├── zh-CN.json
│   │       ├── en.json
│   │       └── ja.json
│   ├── types/
│   │   ├── index.ts
│   │   ├── product.ts
│   │   ├── breed.ts
│   │   └── embed.ts
│   ├── data/
│   │   ├── products.ts                  # 靜態產品資料庫（從原 PRODUCTS 搬入）
│   │   ├── breeds.ts                    # 靜態品種對照（從原 BREEDS 搬入）
│   │   ├── product-name-map.ts          # 產品名正規化 mapping
│   │   ├── seasons.ts                   # 季節定義
│   │   └── color-keywords.ts            # 毛色關鍵字
│   ├── hooks/
│   │   ├── useEmbed.ts                  # embed 模式管理
│   │   ├── useAnalysis.ts               # AI 分析狀態
│   │   ├── useCamera.ts                 # 拍照/上傳/壓縮
│   │   ├── useConfig.ts                 # 動態設定
│   │   ├── useBreedSearch.ts            # 品種搜尋（含毛色解析）
│   │   └── useSeason.ts                 # 當前季節
│   ├── lib/
│   │   ├── api.ts                       # fetch wrapper
│   │   ├── analytics.ts                 # 前端 analytics
│   │   ├── product-normalizer.ts        # 產品名正規化
│   │   ├── breed-matcher.ts             # 品種比對 + 毛色解析
│   │   ├── tier-builder.ts              # 品種快選 → 三等級
│   │   ├── image-processor.ts           # 圖片壓縮/裁切
│   │   └── share.ts                     # 分享連結 / Canvas
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── LanguageSwitcher.tsx
│   │   ├── home/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── BrandSection.tsx         # 為什麼選 Davis
│   │   │   ├── CertSection.tsx          # 認證入口
│   │   │   └── ProductSection.tsx       # 產品圖鑑入口
│   │   ├── analyze/
│   │   │   ├── UploadPhase.tsx
│   │   │   ├── BreedSearch.tsx          # 搜尋框 + 帶毛色
│   │   │   ├── BreedChips.tsx
│   │   │   ├── AnalyzingPhase.tsx
│   │   │   ├── ResultPhase.tsx
│   │   │   ├── TierTabs.tsx
│   │   │   ├── TierPanel.tsx
│   │   │   ├── StepCard.tsx
│   │   │   ├── NoPetError.tsx
│   │   │   └── RetryError.tsx
│   │   ├── embed/
│   │   │   ├── EmbedInfoBar.tsx
│   │   │   └── EmbedConfirmBar.tsx
│   │   ├── share/
│   │   │   ├── ShareModal.tsx
│   │   │   └── ShareCanvas.tsx
│   │   ├── products/
│   │   │   ├── ProductGrid.tsx
│   │   │   └── ProductCard.tsx
│   │   └── groomers/
│   │       ├── GroomerList.tsx
│   │       ├── GroomerMap.tsx
│   │       └── GroomerBadge.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── AnalyzePage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── GroomersPage.tsx
│   │   ├── CertifyPage.tsx
│   │   ├── VerifyPage.tsx
│   │   └── ShareViewPage.tsx
│   ├── admin/
│   │   ├── AdminApp.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ProductManager.tsx
│   │   ├── BreedManager.tsx
│   │   ├── SettingsManager.tsx
│   │   ├── AnalyticsView.tsx
│   │   ├── UserManager.tsx
│   │   ├── AiAssistant.tsx
│   │   └── CertManager.tsx
│   └── styles/
│       └── globals.css
├── netlify/
│   └── functions/
│       ├── analyze.ts                   # AI 分析（Sonnet + 季節 + 正規化）
│       ├── admin.ts
│       ├── ai-assist.ts
│       ├── davis-config.ts
│       ├── share.ts
│       ├── log.ts
│       └── ping.ts
├── netlify.toml
└── supabase-migration-v2.sql
```

---

## 十三、與毛安住系統的協作分工

| 責任 | Davis APP | 毛安住系統 |
|------|-----------|-----------|
| 品種名轉換 | 接收標準名，直接比對 | 送出前轉成 Davis 標準名 |
| 產品名一致性 | Prompt 約束 + 後端正規化 | 收到後做 unmatched log |
| 價格計算 | 不管價格 | 依 recommended 等級查價格矩陣 |
| 庫存扣減 | 不管庫存 | 依 products[] 扣庫存 |
| AI 費用 | Davis 自己的 API Key 吸收 | 不消耗店家 AI 點數 |
| 語言 | 依 URL lang 參數 | 送出時帶 lang |
| iframe 嵌入 | 提供 embed 模式 | 在預約/到店檢查時開 iframe |

---

## 十四、注意事項

### 14.1 設計原則

- **行銷優先**：獨立模式是 Davis 品牌的門面，設計要專業、有說服力
- **深藍色調**：保持現有的深藍色系（#0B1E3D / #1A4A9E / #1A6FD4），這是 Davis 品牌色
- **Logo 必須醒目**：首頁 Hero 要有大 Logo，分析結果頁保留品牌元素
- **行動優先**：主要使用場景是手機，所有頁面 mobile-first
- **快速載入**：PWA + Service Worker + 離線品種快選
- **embed 時精簡但不寒酸**：保留 Davis 小 logo，讓用戶知道這是專業工具

### 14.2 合規用語

所有文案只描述清潔、保養、毛質表現，不宣稱療效。例如：
- ✅ 「幫助浮毛脫落，提升梳理效率」
- ❌ 「治療皮膚病」
- ✅ 「舒緩乾燥引起的搔癢」
- ❌ 「治療搔癢症」

### 14.3 AI 助手保留

Admin 後台的 AI 助手（貼培訓資料 → 提取品種配方）是重要功能，完整保留。
用途是讓 Davis 團隊快速從培訓講義中提取新品種/配方，匯入後台。
