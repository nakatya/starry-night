#!/usr/bin/env bash
# Claude が判断に使う材料を .autopilot/ に集める
set -euo pipefail
REPO="$GITHUB_REPOSITORY"; PR="$1"; ISSUE="$2"
mkdir -p .autopilot
{
  echo "# Issue #$ISSUE"; gh issue view "$ISSUE" --json title,body -q '"## \(.title)\n\n\(.body)"'
  echo; echo "# PR #$PR"; gh pr view "$PR" --json title,body -q '"## \(.title)\n\n\(.body)"'
  echo; echo "# 変更ファイル"; gh pr view "$PR" --json files -q '.files[]|"- \(.path) (+\(.additions)/-\(.deletions))"'
  echo; echo "# レビューのまとめ(claude[bot])"
  gh api "repos/$REPO/issues/$PR/comments" --paginate -q '.[]|select(.user.login=="claude[bot]")|.body'
  echo; echo "# インラインの指摘"
  gh api "repos/$REPO/pulls/$PR/comments" --paginate -q '.[]|"- [\(.path):\(.line // .original_line)] \(.body)"'
  echo; echo "# これまでの自動修正の回数"
  gh api "repos/$REPO/issues/$PR/comments" --paginate -q '[.[]|select(.body|contains("<!-- autopilot:fix -->"))]|length'
  echo; echo "# 自動で作った Issue(auto ラベル、作成済みの本数と一覧)"
  gh issue list -s all -l auto --limit 100 --json number,title,state -q 'length as $n | "本数: \($n)", (.[]|"- #\(.number) [\(.state)] \(.title)")'
} > .autopilot/context.md
echo "context: $(wc -c < .autopilot/context.md) bytes"
