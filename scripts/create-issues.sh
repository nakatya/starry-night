#!/usr/bin/env bash
# docs/issues/*.md から GitHub の Issue とラベルを作る。gh CLI でログイン済みであること。
set -euo pipefail
cd "$(dirname "$0")/.."

gh label create approved    --color 0e8a16 --description "人が承認済み。Claude が実装を始める" --force
gh label create needs-human --color d93f0b --description "Claude が判断を求めて停止中" --force
gh label create site        --color 1d3f8c --description "サイト本体" --force
gh label create auto        --color c5def5 --description "自動進行が作った Issue" --force
gh label create hold        --color fbca04 --description "自動進行で飛ばす" --force

titles=(
  "雛形: 星月夜を画面いっぱいに静止画で表示する"
  "空のマスクをコードで生成する"
  "空のうねりをフローマップで動かす"
  "星と月の光輪をゆっくり脈打たせる"
  "仕上げ: 配慮・性能・ページの体裁"
)
files=(docs/issues/0*.md)

for i in "${!files[@]}"; do
  gh issue create --title "${titles[$i]}" --body-file "${files[$i]}" --label site
done
echo "完了。"
