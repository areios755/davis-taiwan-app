# Davis Taiwan APP — 重寫遷移總計畫 v1

> 📅 2026-03-03
> 用途：給雲端機 Claude Code 逐步執行的遷移清單
> 原始碼：davis-taiwan-v3-ai.zip（解壓後參照）
> 規格文件：davis-app-rewrite-spec-v2.md + davis-app-integration-spec-v1.md

---

## 〇、前置作業（手動）

```bash
# 1. 在 GitHub 建立新 repo
gh repo create areios755/davis-taiwan-app --public --clone
cd davis-taiwan-app

# 2. 複製骨架檔案（從 zip 交付）
# 解壓 davis-rewrite-skeleton.zip 到 davis-taiwan-app/
unzip davis-rewrite-skeleton.zip -d .

# 3. 解壓舊版原始碼到 /tmp 供遷移參照
mkdir -p /tmp/davis-legacy
unzip davis-taiwan-v3-ai.zip -d /tmp/davis-legacy

# 4. 安裝依賴
npm install

# 5. 建立 .env（從 .env.example 複製，填入真實金鑰）
cp .env.example .env

# 6. 首次 commit
git add -A
git commit -m "feat: project skeleton — React + Vite + TypeScript + Tailwind"
git push origin main
```

---

## 一、Phase 1 — 資料遷移（PRODUCTS / BREEDS）

### 重要性：🔴 最高 — 所有功能都依賴這些資料

### 步驟

**1.1 遷移 PRODUCTS 資料**

從 `/tmp/davis-legacy/index.html` 提取 `const PRODUCTS = { ... }` 物件（約 15 組產品），轉換為 TypeScript 格式寫入 `src/data/products.ts`。

每個產品需要的欄位：
- id, name_zh, name_en, name_ja, name_cn（新增簡中）
- category: 'shampoo' | 'conditioner' | 'spa' | 'specialty'
- tag_zh/en/ja/cn, reason_zh/en/ja/cn, note_zh/en/ja/cn
- dilution, dwell_time
- image_url（如有）

同時遷移 `PRODUCT_NAME_MAP`（產品名正規化對照表）。

**1.2 遷移 BREEDS 資料**

從 `/tmp/davis-legacy/index.html` 提取 `const BREEDS = { ... }` 物件（35+ 品種），轉換為 TypeScript。

每個品種需要的欄位：
- id, name_zh, name_en, name_ja, name_cn（新增簡中）
- pet_type: '狗' | '貓'
- coat_type, emoji
- product_keys: string[]（對應 PRODUCTS 的 key）

**1.3 遷移品種映射（BREED_MAP）**

從原始碼提取 `BREED_MAP_FROM_WANGDEFU` 和通用品種別名表，整合到 breeds.ts 的 lookup maps。

### Claude Code Prompt

```
讀取 /tmp/davis-legacy/index.html，找到 const PRODUCTS 和 const BREEDS 兩個 JavaScript 物件。
將它們轉換為 TypeScript 格式，寫入：
- src/data/products.ts（填入完整產品資料，補上 name_cn/tag_cn/reason_cn/note_cn）
- src/data/breeds.ts（填入完整品種資料，補上 name_cn）
- 更新 src/data/products.ts 的 PRODUCT_NAME_MAP

簡中翻譯規則：直接從繁中轉簡中即可。
確保所有 TypeScript type 都正確匹配 src/types/index.ts 定義。
```

### 驗證
```bash
npx tsc --noEmit  # TypeScript 型別檢查通過
```

### Commit
```
feat: migrate PRODUCTS (15) and BREEDS (35+) data from legacy app
```

---

## 二、Phase 2 — Netlify Functions 重寫

### 重要性：🔴 最高 — 後端 API 是一切的基礎

### 2.1 analyze.ts（核心 AI 分析）

骨架已建好，需要：
1. 從 `/tmp/davis-legacy/netlify/functions/analyze.js` 複製完整的 AI prompt（systemPrompt）
2. 確認 model 改為 `claude-sonnet-4-5-20250929`
3. 確認 rate limiting 邏輯
4. 確認產品名正規化 map 完整
5. 加入 CORS whitelist（不用 `*`）

```
讀取 /tmp/davis-legacy/netlify/functions/analyze.js，
將完整的 systemPrompt（包含產品資料庫、品種規則、推薦格式）搬到
netlify/functions/analyze.ts 的對應位置。

同時：
- Model 確認是 claude-sonnet-4-5-20250929
- CORS origin 改為白名單
- Rate limit 保留（已在骨架中）
- 產品名正規化 map 從舊版搬入
```

### 2.2 admin.ts

```
讀取 /tmp/davis-legacy/netlify/functions/admin.js (14,687 bytes)，
重寫為 TypeScript 到 netlify/functions/admin.ts。

關鍵修復：
1. Token secret 改讀 process.env.DAVIS_TOKEN_SECRET（不再硬編碼）
2. 加入 rate limiting
3. 所有 Supabase 查詢加上 input validation
4. CORS 改為白名單
```

### 2.3 其餘 Functions

依序重寫：
- `ai-assist.ts` ← `/tmp/davis-legacy/netlify/functions/ai-assist.js` (6,300 bytes)
- `davis-config.ts` ← `/tmp/davis-legacy/netlify/functions/davis-config.js` (2,337 bytes)
  - 🔴 移除 API Key 回傳（k 欄位），這是最嚴重的安全漏洞
- `share.ts` ← `/tmp/davis-legacy/netlify/functions/share.js` (4,327 bytes)
- `certify.ts` ← `/tmp/davis-legacy/netlify/functions/certify.js` (8,122 bytes)
- `log.ts` ← `/tmp/davis-legacy/netlify/functions/log.js` (2,268 bytes)
- `ping.ts` ← `/tmp/davis-legacy/netlify/functions/ping.js` (1,536 bytes)

每個 function 都要：
1. JS → TypeScript
2. 加 rate limiting
3. 修復 AUDIT_REPORT.md 中列出的問題
4. Token secret 用環境變數

### Commit
```
feat: rewrite all Netlify Functions (JS→TS) with security fixes

- analyze.ts: Sonnet model, rate limiting, product normalization
- admin.ts: env-based token secret, input validation
- davis-config.ts: REMOVED API key exposure (critical fix)
- All: CORS whitelist, rate limiting, TypeScript
```

---

## 三、Phase 3 — 前端頁面完善

### 3.1 AnalyzePage（已有完整骨架）

需要補完：
1. 拖曳上傳支援（drag & drop）
2. 品種快選 chips 從 BREEDS 資料動態生成
3. 分享功能整合（ShareModal + Canvas）

### 3.2 ProductsPage + ProductDetailPage

```
實作產品圖鑑頁面：
- ProductsPage: Grid 展示所有 Davis 產品，支援分類篩選（洗劑/護毛素/SPA/特殊護理）
- ProductDetailPage: 單一產品詳情（名稱、說明、稀釋比例、使用步驟）
- 資料來源：src/data/products.ts + Supabase davis_products（動態優先）
- 四語支援：產品名/說明依當前語言切換
- 設計風格：card-davis 卡片式，Davis 深藍色系
```

### 3.3 GroomersPage + GroomerMap

```
實作認證美容師專區：
- 列表模式：GroomerList 顯示已認證美容師（姓名、店名、城市、Badge）
- 地圖模式：GroomerMap 用 Leaflet 顯示有 lat/lng 的美容師
- Tab 切換：列表 / 地圖
- 資料來源：Supabase davis_certifications WHERE status = 'approved'
- 點擊美容師 → 跳轉到 /groomers/:id（Badge 頁）
```

### 3.4 CertifyPage（認證申請）

```
實作認證申請表單，遷移自 /tmp/davis-legacy/certify.html：
- 表單欄位：姓名、店名、城市、電話、Email、IG、FB、個人照片
- 照片上傳 + 壓縮（用 image-processor.ts）
- 提交到 /.netlify/functions/certify
- React 表單，不用 innerHTML（修復 XSS 漏洞）
- 四語支援
```

### 3.5 VerifyPage（認證驗證）

```
實作認證驗證頁，遷移自 /tmp/davis-legacy/verify.html：
- 路由 /verify/:id
- 查詢 Supabase 顯示認證資訊（用 React render，不用 innerHTML）
- QR Code Badge 展示
- 所有使用者資料用 React 自動 escape（修復 XSS）
```

### 3.6 ShareViewPage

```
實作分享結果頁：
- 路由 /r/:id
- 從 Supabase davis_shares 載入分享資料
- 顯示三等級結果（只讀）
- 「自己也想試試？」CTA 按鈕連到 /analyze
```

### Commit
```
feat: implement all frontend pages

- ProductsPage: product catalog with category filter
- GroomersPage: certified groomers list + map (Leaflet)
- CertifyPage: certification application form (XSS-safe)
- VerifyPage: certification badge verification (XSS-safe)
- ShareViewPage: shared result viewer
```

---

## 四、Phase 4 — Admin 後台遷移

### 重要性：🟡 中 — 功能完整但用戶量小（只有 Davis 團隊）

```
遷移 Admin 後台，原始碼在 /tmp/davis-legacy/admin/index.html (72,566 bytes)。
拆分為 React 元件寫入 src/admin/：

1. AdminApp.tsx — 路由 + 登入牆 + Sidebar 導覽
2. Dashboard.tsx — 概覽（今日分析次數、API 成本、最新認證申請）
3. ProductManager.tsx — 產品 CRUD（表格 + 編輯 Modal）
4. BreedManager.tsx — 品種 CRUD
5. SettingsManager.tsx — 系統設定（embed 白名單、AI 定價、維護模式）
6. AnalyticsView.tsx — 使用分析圖表（日/週/月、品種分佈、等級分佈、Token 成本）
7. UserManager.tsx — Admin 使用者管理
8. AiAssistant.tsx — AI 助手（貼文字 → 提取品種配方）
9. CertManager.tsx — 認證審核（待審列表、一鍵通過/拒絕）

更新 DEFAULT_PRICING 為 Sonnet 定價（input: $3/MTok, output: $15/MTok）。
```

### Commit
```
feat: migrate Admin panel — 8 management pages (React)

- Dashboard, Products, Breeds, Settings, Analytics
- Users, AI Assistant, Certification Manager
- Updated cost tracking to Sonnet pricing
```

---

## 五、Phase 5 — Embed 模式 + 毛安住整合

### 重要性：🔴 高 — 毛安住整合的關鍵

```
完善 embed 模式（骨架已在 AnalyzePage 中）：

1. 確認 postMessage 回傳完整 products 陣列（修復 integration-spec 缺口 #1）
2. 確認動態店名顯示（修復缺口 #3）
3. 確認 embed_whitelist 包含毛安住 domain（修復缺口 #4）
4. postMessage targetOrigin 改為白名單（修復安全問題 #6）
5. 測試完整流程：
   - URL: ?embed=true&breed=貴賓&weight=5&hotel=maoanzu&store_name=毛安住&pet_name=Lucky&lang=zh-TW
   - 品種預填 → 分析 → 選等級 → 確認 → postMessage 回傳
   - 驗證回傳格式符合 integration-spec §2.3
```

### Commit
```
feat: embed mode — full maoanzu integration with secure postMessage

- Complete products array in postMessage payload
- Dynamic store_name display (not hardcoded)
- Origin whitelist for postMessage security
- Tested against integration-spec-v1 format
```

---

## 六、Phase 6 — PWA + 上線前清理

```
1. 驗證 PWA manifest + Service Worker（vite-plugin-pwa 已設定）
2. 離線品種快選（BREEDS 資料在 SW cache 中）
3. 確認所有 TODO 標記已處理
4. 跑 TypeScript 型別檢查：npx tsc --noEmit
5. 跑 build：npm run build
6. 本地預覽：npm run preview
7. 部署到 Netlify（連接 GitHub repo）
```

### Commit
```
feat: PWA support + production build ready

- Manifest with Davis branding
- Service Worker caching for offline breed select
- All TypeScript checks passing
- Production build verified
```

---

## 七、安全修復對照表

| AUDIT 問題 | 修復位置 | Phase |
|-----------|---------|-------|
| API Key 暴露前台 | davis-config.ts 移除 k 欄位 | Phase 2 |
| XSS innerHTML | React 自動 escape | Phase 3 |
| Token secret 硬編碼 | admin.ts 讀 env var | Phase 2 |
| postMessage `*` | embed-messaging.ts 白名單 | Phase 5 |
| 無 rate limit | 所有 functions 加 IP 計數 | Phase 2 |
| CORS `*` | 所有 functions 改白名單 | Phase 2 |
| AI Model 過貴 | analyze.ts 改 Sonnet | Phase 2 |

---

## 八、檔案大小對照（舊 → 新）

| 舊版 | 大小 | 新版對應 |
|------|------|---------|
| index.html (monolith) | 109,361 bytes | 拆分為 ~30 個 React 元件 |
| admin/index.html | 72,566 bytes | 拆分為 8 個 Admin 元件 |
| certify.html | 10,166 bytes | CertifyPage.tsx |
| verify.html | 6,923 bytes | VerifyPage.tsx |
| badge.html | 4,262 bytes | GroomerBadge.tsx |
| 7 JS functions | ~32,000 bytes | 7 TS functions + security |

---

## 九、DB Migration

在 Supabase SQL Editor 執行 `supabase-migration-v2.sql`，內容：
1. davis_products 加 tag_cn / reason_cn / note_cn
2. davis_breeds 加 name_cn
3. davis_certifications 加 lat / lng
4. davis_settings 更新 embed_whitelist（加毛安住）
5. davis_settings 更新 ai_pricing（Opus → Sonnet）

---

## 十、預估工時

| Phase | 內容 | 預估 Claude Code 輪次 |
|-------|------|---------------------|
| Phase 1 | 資料遷移 | 1-2 輪 |
| Phase 2 | Netlify Functions | 3-4 輪 |
| Phase 3 | 前端頁面 | 5-6 輪 |
| Phase 4 | Admin 後台 | 3-4 輪 |
| Phase 5 | Embed 整合 | 1-2 輪 |
| Phase 6 | PWA + 清理 | 1 輪 |
| **合計** | | **~15-20 輪** |

每個 Phase 完成後都要：
1. `npx tsc --noEmit` — 型別檢查
2. `npm run build` — 建置成功
3. Git commit + push
