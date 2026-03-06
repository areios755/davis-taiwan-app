#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Davis Taiwan APP — 自動化遷移開發腳本 v2
# 共用毛安住 Supabase（breed_groups 共享 + davis_* 專屬表）
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
10. 安全修復是最高優先級（AUDIT_REPORT.md 7 項全部修）
11. 【共用DB】Davis 與毛安住共用同一個 Supabase 專案（fur-angel, ref: npardxmvlvbhindvqtrd）
12. 【共用品種】品種資料從 breed_groups 表讀取（不是靜態 JSON），用 davis_breed_id 欄位關聯
13. 【Davis專屬表】davis_products / davis_shares / davis_certifications / davis_analytics / davis_settings 不綁 store_id
14. .env 中的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 指向毛安住同一個 Supabase'

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

echo "🚀 Davis Taiwan APP 自動化遷移開始（v2 共用DB架構）"
echo "時間: $(date)"
echo "============================================"
notify "🚀 Davis 自動遷移開始 $(date +%H:%M)"

# ══════════════════════════════════════════════
# Phase 0: 共用 DB 架構設定
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 0: 共用 Supabase 架構 — breed_groups 擴充 + davis_* 表"
echo "============================================"

claude --print --max-turns 25 --dangerously-skip-permissions "$RULES

任務：設定 Davis APP 與毛安住共用 Supabase 的資料庫架構

## 背景
毛安住已有 breed_groups 表（M14），結構如下：
CREATE TABLE breed_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species      TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  name         TEXT NOT NULL,
  name_en      TEXT,
  name_ja      TEXT,
  aliases      TEXT[] DEFAULT '{}',
  size_range   TEXT[],
  weight_range JSONB,
  coat_types   TEXT[] DEFAULT '{}',
  davis_breed_id TEXT,
  is_active    BOOLEAN DEFAULT true,
  sort_order   INT DEFAULT 0
);

## 任務清單

### 1. 建立 SQL migration: supabase-migration-shared-db.sql

#### A. 擴充 breed_groups（加 Davis 洗護欄位）
ALTER TABLE breed_groups ADD COLUMN IF NOT EXISTS name_cn TEXT;
ALTER TABLE breed_groups ADD COLUMN IF NOT EXISTS emoji TEXT;
ALTER TABLE breed_groups ADD COLUMN IF NOT EXISTS coat_characteristics TEXT;
ALTER TABLE breed_groups ADD COLUMN IF NOT EXISTS davis_product_keys TEXT[] DEFAULT '{}';
ALTER TABLE breed_groups ADD COLUMN IF NOT EXISTS grooming_tips JSONB DEFAULT '[]';
ALTER TABLE breed_groups ADD COLUMN IF NOT EXISTS seasonal_notes JSONB DEFAULT '{}';

#### B. 確認 davis_* 表存在（參考 legacy/supabase-migration.sql）
davis_products, davis_shares, davis_certifications, davis_analytics, davis_settings
不存在就 CREATE，已存在就 ALTER 補欄位

#### C. RLS Policies
breed_groups: 所有人可 SELECT
davis_products: 所有人可 SELECT
davis_shares: INSERT 不限, SELECT by id
davis_certifications: approved 可 SELECT
davis_analytics: 只有 service_role 可寫
davis_settings: 只有 service_role 可讀寫

### 2. 更新 .env.example
VITE_SUPABASE_URL=https://npardxmvlvbhindvqtrd.supabase.co
VITE_SUPABASE_ANON_KEY=
DAVIS_TOKEN_SECRET=
ANTHROPIC_API_KEY=

### 3. 建立 src/lib/supabase.ts
Supabase client 初始化

### 4. 修改 src/data/breeds.ts
靜態 BREEDS 改為 fetchBreeds() 從 breed_groups 表讀取，保留靜態 fallback

### 5. 修改 src/data/products.ts
新增 fetchProducts() 從 davis_products 表讀取，保留靜態 fallback

先讀 legacy/supabase-migration.sql 和現有骨架檔案"

echo ""
echo "=== Phase 0 完成 ==="
check_build
safe_commit "feat: shared Supabase architecture — breed_groups extension + davis_* tables"
notify "✅ Phase 0 完成: 共用 DB 架構"

# ══════════════════════════════════════════════
# Phase 1: 資料遷移
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 1: 資料遷移 — PRODUCTS + BREEDS seed"
echo "============================================"

claude --print --max-turns 30 --dangerously-skip-permissions "$RULES

任務：從 legacy/ 提取 PRODUCTS 和 BREEDS，轉為 DB seed SQL + 靜態 fallback

1. Products → INSERT INTO davis_products + 更新 src/data/products.ts
   讀 legacy/index.html const PRODUCTS（約15組）
   每產品：id, name_zh/en/cn/ja, category, series, tag, reason, note, dilution, dwell_time
   建立 PRODUCT_NAME_MAP

2. Breeds → UPDATE breed_groups + 更新 src/data/breeds.ts
   讀 legacy/index.html const BREEDS（35+品種）
   UPDATE breed_groups SET davis_breed_id, davis_product_keys, coat_characteristics WHERE name = ...
   不存在的品種 INSERT

3. 如果 knowledge-out/ 有提取的 JSON，合併進去

輸出：seed-davis-products.sql, seed-breed-updates.sql, 更新 src/data/

驗證：npx tsc --noEmit"

echo ""
echo "=== Phase 1 完成 ==="
check_build
safe_commit "feat: migrate PRODUCTS (15) and BREEDS (35+) — DB seed + static fallback"
notify "✅ Phase 1 完成: PRODUCTS + BREEDS"

# ══════════════════════════════════════════════
# Phase 2: Netlify Functions 重寫
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 2-1: analyze.ts（共用 DB）"
echo "============================================"

claude --print --max-turns 30 --dangerously-skip-permissions "$RULES

任務：完善 analyze.ts 的 AI 分析功能（共用 Supabase）

1. 讀 legacy/netlify/functions/analyze.js → 複製完整 systemPrompt
2. 產品從 davis_products 表讀取（fallback 靜態）
3. 品種從 breed_groups 表讀取
4. Model: claude-sonnet-4-5-20250929
5. 保留 rate limiting + CORS 白名單
6. 分析完成寫入 davis_analytics
7. 回傳完整 products 陣列

先讀 legacy 再讀骨架"

safe_commit "feat: analyze.ts — shared DB + Sonnet + security"

echo ""
echo "============================================"
echo "Phase 2-2: 其餘 Functions（共用 DB）"
echo "============================================"

claude --print --max-turns 40 --dangerously-skip-permissions "$RULES

任務：重寫剩餘 Netlify Functions

1. admin.ts ← legacy admin.js
   🔴 Token secret → env var
   CRUD → davis_products + breed_groups + davis_settings + davis_certifications

2. ai-assist.ts ← legacy ai-assist.js
   Token secret 修復

3. davis-config.ts ← legacy davis-config.js
   🔴🔴🔴 移除 API Key 暴露！只回傳公開資料

4. share.ts → davis_shares 表
5. certify.ts → davis_certifications 表
6. log.ts → davis_analytics 表
7. ping.ts → 直接轉 TS

每個：CORS 白名單 + rate limiting + TypeScript

先讀所有 legacy/netlify/functions/*.js"

echo ""
echo "=== Phase 2 完成 ==="
check_build
safe_commit "feat: rewrite all Netlify Functions — shared Supabase + security"
notify "✅ Phase 2 完成: Netlify Functions"

# ══════════════════════════════════════════════
# Phase 3: 前端頁面
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 3-1: AnalyzePage"
echo "============================================"

claude --print --max-turns 25 --dangerously-skip-permissions "$RULES

任務：完善 AnalyzePage
品種快選從 breed_groups 動態載入（fetchBreeds()）
犬/貓分組 tabs，用 davis_breed_id 作選擇值
補完拖曳上傳 + 分享按鈕"

safe_commit "feat: AnalyzePage — dynamic breeds from shared DB"

echo ""
echo "============================================"
echo "Phase 3-2: Products + Groomers + Certify + Verify + Share"
echo "============================================"

claude --print --max-turns 35 --dangerously-skip-permissions "$RULES

任務：實作所有剩餘前端頁面

1. ProductsPage + ProductDetailPage
   從 davis_products 或 fetchProducts() 載入，分類篩選，四語切換

2. GroomersPage：列表+地圖，從 davis_certifications
3. CertifyPage：申請表單 React
4. VerifyPage：/verify/:id
5. ShareViewPage：/r/:id

全部 React + Tailwind + Davis 深藍色系
參考 legacy/ 對應檔案"

echo ""
echo "=== Phase 3 完成 ==="
check_build
safe_commit "feat: all frontend pages — shared DB data sources"
notify "✅ Phase 3 完成: 前端頁面"

# ══════════════════════════════════════════════
# Phase 4: Admin 後台
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 4: Admin 後台（共用 DB CRUD）"
echo "============================================"

claude --print --max-turns 50 --dangerously-skip-permissions "$RULES

任務：遷移 Admin 後台（legacy/admin/index.html → React）

9 個元件寫入 src/admin/：

1. AdminApp.tsx — 路由+登入+Sidebar
2. Dashboard.tsx
3. ProductManager.tsx — davis_products CRUD
4. BreedManager.tsx — breed_groups（⚠️ 只改 Davis 欄位！）
   唯讀：name, species, size_range, weight_range（毛安住管理）
   可編輯：davis_breed_id, davis_product_keys, coat_characteristics, grooming_tips, seasonal_notes, emoji
5. SettingsManager.tsx — davis_settings
6. AnalyticsView.tsx — davis_analytics + Sonnet pricing
7. UserManager.tsx
8. AiAssistant.tsx
9. CertManager.tsx — davis_certifications 審核

讀 legacy/admin/index.html"

echo ""
echo "=== Phase 4 完成 ==="
check_build
safe_commit "feat: Admin panel — 9 pages, shared DB, breed read-only protection"
notify "✅ Phase 4 完成: Admin 後台"

# ══════════════════════════════════════════════
# Phase 5: Embed + 毛安住整合
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 5: Embed 模式（共用 breed_groups.id）"
echo "============================================"

claude --print --max-turns 20 --dangerously-skip-permissions "$RULES

任務：完善 embed 模式

1. breed 參數用 breed_groups.id（UUID）或 davis_breed_id
   毛安住傳 UUID → Davis 直接查 breed_groups，零映射
2. postMessage 包含 breed_group_id + 完整 products 陣列
3. targetOrigin 白名單
4. 動態 store_name
5. 建 public/embed-test.html
6. 確認 useEmbed.ts

讀 docs/davis-app-integration-spec-v1.md"

echo ""
echo "=== Phase 5 完成 ==="
check_build
safe_commit "feat: embed mode — shared breed_groups UUID, zero mapping"
notify "✅ Phase 5 完成: Embed"

# ══════════════════════════════════════════════
# Phase 6: PWA + 清理
# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "Phase 6: PWA + 清理 + README"
echo "============================================"

claude --print --max-turns 20 --dangerously-skip-permissions "$RULES

任務：最終清理

1. PWA manifest + Service Worker 品種快取
2. 掃描修復 TODO
3. 清理 console.log，檢查 imports
4. 四語 locale key 一致性
5. tsc --noEmit 零錯誤 + build 成功
6. README.md：技術棧、環境變數、共用 DB 架構說明、Netlify 部署、毛安住整合"

echo ""
echo "=== Phase 6 完成 ==="
check_build
safe_commit "feat: PWA, cleanup, README — production ready"
notify "✅ Phase 6 完成"

# ══════════════════════════════════════════════
echo ""
echo "============================================"
echo "🎉 Davis Taiwan APP 遷移完成！"
echo "============================================"
echo "時間: $(date)"
echo "Log: $LOG"
echo ""
echo "共用 DB: fur-angel (npardxmvlvbhindvqtrd)"
echo "共用表: breed_groups（零映射）"
echo "Davis 專屬: davis_products, davis_shares, davis_certifications, davis_analytics, davis_settings"
echo ""
echo "安全修復: API Key暴露✅ XSS✅ Token硬編碼✅ postMessage*✅ rate limit✅ CORS✅ Opus→Sonnet✅"
echo ""
echo "檔案數: $(find src netlify -type f | wc -l)"
echo "Build: $(du -sh dist/ 2>/dev/null || echo 'N/A')"

notify "🎉 Davis 遷移完成！共用 breed_groups，零映射。$(find src netlify -type f | wc -l) 檔案"
