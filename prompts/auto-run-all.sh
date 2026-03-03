#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Davis Taiwan APP — 自動化遷移開發腳本
# 基於 MIGRATION-PLAN.md 的 6 個 Phase
# 在 Linode VPS 上用 Claude Code 執行
# ═══════════════════════════════════════════════════════════

set -euo pipefail
LOG=~/dev-log-davis-$(date +%Y%m%d-%H%M).txt
exec > >(tee -a "$LOG") 2>&1

cd ~/davis-taiwan-app

RULES='保護規則：
1. Davis 品牌色：navy=#0B1E3D blue=#1A4A9E accent=#1A6FD4 gold=#D4A843（不是毛安住暖色！）
2. 四語支援：繁中/簡中/英文/日文，UI 文字必須用 t() i18n
3. 不刪除任何已完成的骨架功能
4. 先讀現有檔案再修改
5. 用 @/ alias import
6. TypeScript strict mode，不准 any
7. 中文 UI + 四語 i18n key，英文 code
8. Netlify Functions 用 TypeScript
9. 舊版原始碼在 legacy/ 目錄，可參照但不要直接複製 JS
10. 安全修復是最高優先級（AUDIT_REPORT.md 7 項全部修）'

NOTIFY_URL="https://ntfy.sh/davis-taiwan-dev"

notify() {
  curl -s -d "$1" "$NOTIFY_URL" > /dev/null 2>&1 || true
}

check_build() {
  echo ">>> TypeScript 型別檢查..."
  npx tsc --noEmit 2>&1 | tail -10
  echo ">>> Build 測試..."
  npm run build 2>&1 | tail -5
}

safe_commit() {
  local msg="$1"
  git add -A
  if git diff --cached --quiet; then
    echo "⚠️ 沒有變更，跳過 commit"
  else
    git commit -m "$msg"
    git push origin main
    echo "✅ Committed: $msg"
  fi
}

echo "🚀 Davis Taiwan APP 自動化遷移開始"
echo "時間: $(date)"
echo "============================================"
notify "🚀 Davis 自動遷移開始 $(date +%H:%M)"

# ══════════════════════════════════════════════
# Phase 1: 資料遷移 (PRODUCTS / BREEDS)
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 1: 資料遷移 — PRODUCTS + BREEDS"
echo "============================================"

claude --print --max-turns 30 "$RULES

任務：從舊版 legacy/ 提取 PRODUCTS 和 BREEDS 資料，遷移到新版 TypeScript

1. 讀取 legacy/index.html，找到 const PRODUCTS = { ... } 物件（約 15 組產品）
   - 轉換為 TypeScript 格式，完整填入 src/data/products.ts
   - 每個產品需要：id, name_zh, name_en, name_ja, name_cn（簡中從繁中轉換）
   - category, tag_zh/en/ja/cn, reason_zh/en/ja/cn, note_zh/en/ja/cn
   - dilution, dwell_time
   - 同時建立完整的 PRODUCT_NAME_MAP（產品名正規化對照表）
   - 確保 type 匹配 src/types/index.ts 的 DavisProduct interface

2. 讀取 legacy/index.html，找到 const BREEDS = { ... } 物件（35+ 品種）
   - 轉換為 TypeScript 格式，完整填入 src/data/breeds.ts
   - 每個品種：id, name_zh, name_en, name_ja, name_cn
   - pet_type, coat_type, emoji, product_keys
   - 確保 type 匹配 src/types/index.ts 的 DavisBreed interface

3. 也檢查 legacy/index.html 中的 BREED_MAP（品種別名映射）
   - 整合到 breeds.ts 的 lookup maps 中
   - 不要只保留汪得福的映射，要做成通用的

4. 先讀取現有的 src/data/products.ts 和 src/data/breeds.ts 骨架，保留結構，填入完整資料

驗證：npx tsc --noEmit 通過"

echo ""
echo "=== Phase 1 完成，驗證 ==="
check_build
safe_commit "feat: migrate PRODUCTS (15) and BREEDS (35+) from legacy app"
notify "✅ Phase 1 完成: PRODUCTS + BREEDS 遷移"

# ══════════════════════════════════════════════
# Phase 2: Netlify Functions 重寫
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 2-1: analyze.ts 核心 AI 分析"
echo "============================================"

claude --print --max-turns 30 "$RULES

任務：完善 netlify/functions/analyze.ts 的 AI 分析功能

1. 讀取 legacy/netlify/functions/analyze.js（7,567 bytes）
   - 複製完整的 systemPrompt（包含產品資料庫、品種規則、推薦格式）
   - 搬到 netlify/functions/analyze.ts 的對應位置
   - 保留骨架中已有的 rate limiting 和 TypeScript 結構

2. 確認重點：
   - Model: claude-sonnet-4-5-20250929（不是 Opus！）
   - 加入季節邏輯（已在骨架中）
   - 產品名正規化 map 從舊版完整搬入
   - Rate limiting 保留
   - 回傳完整 products 陣列（embed 需要）
   - JSON 解析要 robust（strip markdown fences）

3. 也讀取 legacy/netlify/functions/analyze.js 中的 CORS 設定
   - 不用 Access-Control-Allow-Origin: *
   - 改為動態判斷 origin 是否在白名單中

先讀 legacy/netlify/functions/analyze.js，再讀現有的 netlify/functions/analyze.ts，保留骨架結構填入完整邏輯"

safe_commit "feat: analyze.ts — complete AI prompt + Sonnet model + security"

echo ""
echo "============================================"
echo "Phase 2-2: 其餘 Netlify Functions"
echo "============================================"

claude --print --max-turns 40 "$RULES

任務：重寫所有剩餘的 Netlify Functions（JS → TypeScript + 安全修復）

逐一處理（讀 legacy/ 對應檔案，重寫到 netlify/functions/）：

1. admin.ts ← legacy/netlify/functions/admin.js (14,687 bytes)
   🔴 關鍵修復：Token secret 改讀 process.env.DAVIS_TOKEN_SECRET
   - 不再硬編碼 'davis_token_secret' 字串
   - 加入 rate limiting
   - 所有 Supabase 查詢加 input validation
   - 保留全部 CRUD 功能（products/breeds/settings/users/analytics/certifications）

2. ai-assist.ts ← legacy/netlify/functions/ai-assist.js (6,300 bytes)
   - Token secret 同上修復
   - 保留貼文字 → 提取品種配方的 AI 功能

3. davis-config.ts ← legacy/netlify/functions/davis-config.js (2,337 bytes)
   🔴🔴🔴 最嚴重修復：移除 k: apiKey 欄位（API Key 暴露給前端！）
   - 只回傳 products, breeds, settings（不包含任何 key）

4. share.ts ← legacy/netlify/functions/share.js (4,327 bytes)
   - 加 rate limiting + input validation

5. certify.ts ← legacy/netlify/functions/certify.js (8,122 bytes)
   - 加 rate limiting + input validation
   - XSS 不用擔心（React 自動 escape）但後端仍要 sanitize

6. log.ts ← legacy/netlify/functions/log.js (2,268 bytes)
   - 加 rate limiting

7. ping.ts ← legacy/netlify/functions/ping.js (1,536 bytes)
   - 最簡單，直接轉 TS

每個 function 都要：
- import type { Handler } from '@netlify/functions'
- CORS headers（不用 * ）
- Rate limiting
- try/catch error handling
- TypeScript 型別

先讀所有 legacy/netlify/functions/*.js，再逐一重寫"

echo ""
echo "=== Phase 2 完成，驗證 ==="
check_build
safe_commit "feat: rewrite all Netlify Functions (JS→TS) with security fixes

- admin.ts: env-based token secret, input validation
- davis-config.ts: REMOVED API key exposure (critical fix)
- All functions: rate limiting, CORS whitelist, TypeScript"
notify "✅ Phase 2 完成: 7 Netlify Functions 重寫 + 安全修復"

# ══════════════════════════════════════════════
# Phase 3: 前端頁面完善
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 3-1: AnalyzePage 完善 + 拖曳上傳"
echo "============================================"

claude --print --max-turns 25 "$RULES

任務：完善 AnalyzePage（已有完整骨架）

1. 讀取現有 src/pages/AnalyzePage.tsx
2. 補完以下功能：
   - 拖曳上傳支援（drag & drop overlay）
   - 品種快選 chips 從 src/data/breeds.ts 動態生成（犬/貓分組）
   - 分享按鈕功能（先用 navigator.share API，fallback 複製連結）

3. 讀取 docs/davis-app-rewrite-spec-v2.md §3.2 確認 UI 規格

不要修改已經能用的流程（upload → analyze → result），只是補完細節"

safe_commit "feat: AnalyzePage — drag & drop, dynamic breed chips, share"

echo ""
echo "============================================"
echo "Phase 3-2: ProductsPage + ProductDetailPage"
echo "============================================"

claude --print --max-turns 25 "$RULES

任務：實作產品圖鑑頁面

1. ProductsPage (src/pages/ProductsPage.tsx):
   - 從 src/data/products.ts 載入所有產品
   - 分類篩選 tabs：全部 / 洗劑 / 護毛素 / SPA / 特殊護理
   - Grid 卡片展示（card-davis 風格）
   - 每張卡片：產品名（四語切換）、tag、稀釋比例、圖片（placeholder 如無）
   - 點擊跳轉 /products/:id
   - 四語支援用 i18n

2. ProductDetailPage (src/pages/ProductDetailPage.tsx):
   - 從 URL param 取 id，查 PRODUCTS 資料
   - 顯示完整資訊：名稱、說明、稀釋比例、使用步驟、建議用途
   - 返回按鈕
   - Davis 深藍色系設計

參考 docs/davis-app-rewrite-spec-v2.md 產品圖鑑相關規格"

safe_commit "feat: ProductsPage + ProductDetailPage — catalog with filter"

echo ""
echo "============================================"
echo "Phase 3-3: GroomersPage + CertifyPage + VerifyPage"
echo "============================================"

claude --print --max-turns 30 "$RULES

任務：實作認證美容師相關頁面

1. GroomersPage (src/pages/GroomersPage.tsx):
   - Tab 切換：列表 / 地圖
   - 列表模式：已認證美容師卡片（姓名、店名、城市、Davis 認證 Badge）
   - 地圖模式：用 Leaflet（CDN 載入）顯示有 lat/lng 的美容師
   - 資料來源：呼叫 /.netlify/functions/certify?list=approved
   - 點擊 → /groomers/:id

2. CertifyPage (src/pages/CertifyPage.tsx):
   - 認證申請表單（遷移自 legacy/certify.html）
   - 欄位：姓名、店名、城市、電話、Email、IG、FB、個人照片上傳
   - React 表單（不用 innerHTML！XSS 修復）
   - 提交到 /.netlify/functions/certify（POST）
   - 四語 i18n

3. VerifyPage (src/pages/VerifyPage.tsx):
   - 路由 /verify/:id
   - 查詢認證資料（/.netlify/functions/certify?badge=xxx）
   - React render（XSS 安全）
   - QR Badge 展示
   - URL sanitize（safeUrl 防 javascript: 注入）

4. ShareViewPage (src/pages/ShareViewPage.tsx):
   - 路由 /r/:id
   - 從 /.netlify/functions/share?id=xxx 載入分享資料
   - 顯示三等級結果（只讀）
   - CTA：自己也想試試？→ /analyze

參考 legacy/certify.html, legacy/verify.html, legacy/badge.html 的邏輯
但 UI 全部用 React + Tailwind 重寫"

echo ""
echo "=== Phase 3 完成，驗證 ==="
check_build
safe_commit "feat: all frontend pages — Products, Groomers, Certify, Verify, Share"
notify "✅ Phase 3 完成: 所有前端頁面"

# ══════════════════════════════════════════════
# Phase 4: Admin 後台遷移
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 4: Admin 後台完整遷移"
echo "============================================"

claude --print --max-turns 50 "$RULES

任務：遷移 Admin 後台（legacy/admin/index.html → React 元件）

舊版 admin 是 72,566 bytes 的單體 HTML，拆分為 React 元件寫入 src/admin/：

1. AdminApp.tsx — 路由 + 登入牆 + Sidebar 導覽
   - 登入用 /.netlify/functions/admin（POST login）
   - Token 存 sessionStorage
   - 左側 Sidebar 導覽 8 個管理頁面

2. Dashboard.tsx — 概覽
   - 今日分析次數、API 成本、最新認證申請
   - 快捷入口到各管理頁

3. ProductManager.tsx — 產品 CRUD
   - 表格列出所有產品
   - 點擊行 → 編輯 Modal（名稱四語、tag四語、稀釋比例等）
   - 新增/刪除

4. BreedManager.tsx — 品種 CRUD
   - 同上模式

5. SettingsManager.tsx — 系統設定
   - embed 白名單編輯
   - AI 定價（model + input/output per MTok）
   - 維護模式開關

6. AnalyticsView.tsx — 使用分析
   - 日/週/月分析次數折線圖（用 recharts 或簡單 table）
   - 品種分佈 + 等級分佈
   - Token 成本追蹤
   - 🔴 DEFAULT_PRICING 更新為 Sonnet：input $3/MTok, output $15/MTok

7. UserManager.tsx — Admin 使用者管理

8. AiAssistant.tsx — AI 助手
   - 貼文字 → 呼叫 /.netlify/functions/ai-assist → 提取品種配方
   - 結果可一鍵匯入產品/品種

9. CertManager.tsx — 認證審核
   - 待審列表
   - 一鍵通過/拒絕

讀取 legacy/admin/index.html 了解完整功能，用 React + Tailwind 重寫
Admin 用 Davis 深藍色系，不是毛安住暖色"

echo ""
echo "=== Phase 4 完成，驗證 ==="
check_build
safe_commit "feat: Admin panel — 9 management pages (React)

- Dashboard, Products, Breeds, Settings, Analytics
- Users, AI Assistant, Certification Manager
- Sonnet pricing in cost tracking"
notify "✅ Phase 4 完成: Admin 後台 9 頁"

# ══════════════════════════════════════════════
# Phase 5: Embed 模式 + 毛安住整合
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 5: Embed 模式完善 + 毛安住整合驗證"
echo "============================================"

claude --print --max-turns 20 "$RULES

任務：完善 embed 模式，確保毛安住整合規格完全符合

1. 讀取 docs/davis-app-integration-spec-v1.md 的完整 postMessage 格式（§2.3）

2. 確認 src/lib/embed-messaging.ts：
   - postMessage 回傳包含完整 products 陣列（phase/name/dilution/dwell_time）
   - targetOrigin 用白名單（不是 *）
   - hotel 參數正確傳遞

3. 確認 src/pages/AnalyzePage.tsx embed 模式：
   - URL 參數完整解析：embed/breed/weight/hotel/store_name/pet_name/lang/photo_url
   - 動態店名顯示（不是硬編碼汪得福）
   - embed info bar 顯示品種+體重+店名+寵物名
   - 確認按鈕 → postEmbedResult → postMessage

4. 確認 src/hooks/useEmbed.ts 解析所有參數

5. 建立一個測試用的 HTML 頁面 public/embed-test.html：
   - 用 iframe 嵌入 ?embed=true&breed=貴賓&weight=5&hotel=maoanzu&store_name=毛安住&pet_name=Lucky&lang=zh-TW
   - 監聽 postMessage 並顯示收到的結果
   - 用來驗證整合是否正確

驗證：postMessage 格式完全符合 integration-spec §2.3"

echo ""
echo "=== Phase 5 完成，驗證 ==="
check_build
safe_commit "feat: embed mode — full maoanzu integration + test page

- Complete products array in postMessage
- Origin whitelist security
- embed-test.html for integration testing"
notify "✅ Phase 5 完成: Embed 整合"

# ══════════════════════════════════════════════
# Phase 6: PWA + 最終清理
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 6: PWA + 最終清理 + Build 驗證"
echo "============================================"

claude --print --max-turns 20 "$RULES

任務：最終清理和 PWA 驗證

1. 確認 PWA 設定（vite.config.ts 已有 VitePWA plugin）：
   - manifest 正確（name, icons, theme_color）
   - Service Worker 快取策略包含品種資料（離線品種快選）

2. 掃描全專案的 TODO 標記，列出並修復所有遺漏

3. 清理：
   - 刪除所有 console.log（保留 console.error/warn）
   - 確認所有 import 都有使用
   - 確認四語 locale 檔案的 key 完全一致（不能有某語缺 key）

4. 最終驗證：
   - npx tsc --noEmit（零錯誤）
   - npm run build（成功）
   - 檢查 dist/ 目錄大小合理

5. 更新 README.md：
   - 專案簡介、技術棧、本地開發指令
   - 環境變數說明
   - 部署到 Netlify 的步驟
   - 與毛安住的整合說明"

echo ""
echo "=== Phase 6 完成，驗證 ==="
check_build
safe_commit "feat: PWA verified, cleanup, README — production ready"
notify "✅ Phase 6 完成: PWA + 清理 + README"

# ══════════════════════════════════════════════
# 遷移完成
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "🎉 Davis Taiwan APP 遷移完成！"
echo "============================================"
echo "完成時間: $(date)"
echo "Log: $LOG"

# 最終統計
echo ""
echo "=== 專案統計 ==="
echo "檔案數: $(find src netlify -type f | wc -l)"
echo "TypeScript: $(find src netlify -name '*.ts' -o -name '*.tsx' | wc -l) 個"
echo "Build 大小: $(du -sh dist/ 2>/dev/null || echo 'N/A')"
echo ""
echo "=== 安全修復 ==="
echo "✅ API Key 暴露 → 已移除"
echo "✅ XSS innerHTML → React escape"
echo "✅ Token 硬編碼 → env var"
echo "✅ postMessage * → 白名單"
echo "✅ 無 rate limit → 全部加入"
echo "✅ CORS * → 白名單"
echo "✅ Opus → Sonnet（省 80%）"

notify "🎉 Davis 遷移全部完成！$(find src netlify -type f | wc -l) 個檔案"
