#!/usr/bin/env bash
# 判断結果(.autopilot/decision.json)または CI 失敗を受けて、マージ・修正依頼・人を呼ぶ のどれかを行う
set -euo pipefail
REPO="$GITHUB_REPOSITORY"; MODE="$1"; PR="$2"; ISSUE="$3"; BRANCH="$4"; SHA="$5"
MAX_FIX=2

human() {
  gh issue edit "$ISSUE" --add-label needs-human
  gh issue comment "$ISSUE" --body "🤖 自動進行を止めました(PR #$PR): $1"
}
request_fix() {
  fixes=$(gh api "repos/$REPO/issues/$PR/comments" --paginate -q '[.[]|select(.body|contains("<!-- autopilot:fix -->"))]|length')
  if [ "$fixes" -ge "$MAX_FIX" ]; then human "同じ PR で $MAX_FIX 回修正しても解決しませんでした。最後の指摘: $1"; return; fi
  printf '🤖 自動進行: 次の点を直します(%s 回目)。\n\n%s\n\n<!-- autopilot:fix --><!-- autopilot:judged:%s -->' "$((fixes+1))" "$1" "$SHA" > /tmp/fix.md
  gh pr comment "$PR" --body-file /tmp/fix.md
  gh workflow run claude.yml -f mode=fix -f pr="$PR" -f branch="$BRANCH" -f instructions="$1"
}

if [ "$MODE" = "cifail" ]; then
  request_fix "CI(check)が失敗しています。gh run list と gh run view --log-failed で原因を確認して直してください。テストを消したり無効化したりしないこと。"
  exit 0
fi

f=.autopilot/decision.json
if [ ! -f "$f" ]; then human "判断結果が作られませんでした。Actions のログを確認してください。"; exit 0; fi
action=$(jq -r '.action // "human"' "$f")
reason=$(jq -r '.reason // ""' "$f")
instructions=$(jq -r '.instructions // ""' "$f")
echo "action=$action reason=$reason"

case "$action" in
  merge)
    gh pr review "$PR" --approve --body "🤖 自動進行: CI 成功、致命的な指摘なしのため承認。$reason"
    if gh pr merge "$PR" --squash --delete-branch; then
      # Closes #N でも Issue が閉じない場合があるため、明示的に閉じる
      gh issue close "$ISSUE" --reason completed || true
      gh workflow run deploy.yml
      gh issue comment "$ISSUE" --body "🤖 自動進行: PR #$PR をマージして公開しました。$reason" || true
      gh workflow run orchestrator.yml   # すぐ次へ進む
    else
      human "マージできませんでした。Code Owners のレビューが必要な変更(.github/、CLAUDE.md、DESIGN.md、package.json など)の可能性があります。PR を確認してマージしてください。"
    fi
    ;;
  fix) request_fix "$instructions" ;;
  *)   human "${reason:-人の判断が必要です。}" ;;
esac
