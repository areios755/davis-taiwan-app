#!/bin/bash
# Davis Taiwan APP — 雲端機初始設定
set -euo pipefail

echo "=== Davis Taiwan APP 雲端機設定 ==="

cd ~
if [ ! -d davis-taiwan-app ]; then
  git clone https://github.com/areios755/davis-taiwan-app.git
fi

cd davis-taiwan-app
npm install

echo ""
echo "=== 確認舊版原始碼 ==="
if [ -d legacy ]; then
  echo "✅ legacy/ 目錄存在"
  ls legacy/index.html legacy/netlify/functions/ legacy/admin/ 2>/dev/null && echo "✅ 關鍵檔案都在"
else
  echo "❌ legacy/ 目錄不存在！請確認 git pull 有拉到"
fi

echo ""
echo "=== TypeScript 檢查 ==="
npx tsc --noEmit 2>&1 | tail -5

echo ""
echo "✅ 設定完成！可以跑 auto-run-all.sh 了"
echo "用法: bash ~/davis-taiwan-app/prompts/auto-run-all.sh"
