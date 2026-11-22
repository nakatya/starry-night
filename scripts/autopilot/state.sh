#!/usr/bin/env bash
# 自動進行の状態を判定する。必要なら「次の Issue の承認」までここで行う。
# 出力(GITHUB_OUTPUT): state = idle | blocked | started | waiting | cifail | judge, issue, pr, branch, sha
set -euo pipefail
out() { echo "$1=$2" >> "$GITHUB_OUTPUT"; echo "$1=$2"; }
REPO="$GITHUB_REPOSITORY"
REDISPATCH_AFTER_MIN=45

# 1. 人の判断待ちがあれば、何もしない
blocked=$(gh issue list -s open -l needs-human --json number -q 'map(.number)|join(",")')
if [ -n "$blocked" ]; then out state blocked; out issue "$blocked"; exit 0; fi

# 2. 対象の Issue(approved 付きで open の最小番号)。なければ次を承認する
target=$(gh issue list -s open -l site -l approved --limit 100 --json number -q 'map(.number)|sort|first // empty')
if [ -z "$target" ]; then
  next=$(gh issue list -s open -l site --limit 100 --json number,labels \
    -q '[.[]|select(([.labels[].name]|index("hold"))|not)|.number]|sort|first // empty')
  if [ -z "$next" ]; then out state idle; exit 0; fi
  gh issue edit "$next" --add-label approved
  gh workflow run claude.yml -f mode=implement -f issue="$next"
  gh issue comment "$next" --body "🤖 自動進行: 承認して実装を開始しました。"
  out state started; out issue "$next"; exit 0
fi
out issue "$target"

# Claude のワークフローが動いている間は待つ
running=$(gh run list -w claude.yml --limit 20 --json status -q '[.[]|select(.status!="completed")]|length')
if [ "$running" != "0" ]; then out state waiting; exit 0; fi

# 3. 対象 Issue の PR を探す
line=$(gh pr list -s open --limit 50 --json number,headRefName \
  -q "[.[]|select(.headRefName|startswith(\"claude/issue-$target-\"))] | first // empty | \"\(.number) \(.headRefName)\"")
if [ -z "$line" ]; then
  # PR がないまま止まっている → 一度だけ実装をやり直す。2回目は人を呼ぶ
  labeled=$(gh api "repos/$REPO/issues/$target/events" --paginate \
    -q '[.[]|select(.event=="labeled" and .label.name=="approved")]|last|.created_at // empty')
  age_min=$(( ( $(date +%s) - $(date -d "${labeled:-now}" +%s) ) / 60 ))
  if [ "$age_min" -lt "$REDISPATCH_AFTER_MIN" ]; then out state waiting; exit 0; fi
  tried=$(gh api "repos/$REPO/issues/$target/comments" --paginate -q '[.[]|select(.body|contains("<!-- autopilot:redispatch -->"))]|length')
  if [ "$tried" = "0" ]; then
    gh issue comment "$target" --body "🤖 自動進行: PR ができないまま止まっていたので、実装をやり直します。<!-- autopilot:redispatch -->"
    gh workflow run claude.yml -f mode=implement -f issue="$target"
    out state started; exit 0
  fi
  gh issue edit "$target" --add-label needs-human
  gh issue comment "$target" --body "🤖 自動進行: 2回試しても PR ができませんでした。Actions のログを確認してください。"
  out state blocked; exit 0
fi
read -r pr branch <<< "$line"
sha=$(gh pr view "$pr" --json headRefOid -q .headRefOid)
out pr "$pr"; out branch "$branch"; out sha "$sha"

# 4. この head をすでに判断済みなら、修正の push を待つ
judged=$(gh api "repos/$REPO/issues/$pr/comments" --paginate -q "[.[]|select(.body|contains(\"<!-- autopilot:judged:$sha -->\"))]|length")
if [ "$judged" != "0" ]; then out state waiting; exit 0; fi

# 5. CI と レビューの完了を待つ
run_state() { gh api "repos/$REPO/commits/$sha/check-runs" -q "[.check_runs[]|select(.name==\"$1\")]|first // {} | \"\(.status // \"none\")/\(.conclusion // \"none\")\""; }
ci=$(run_state check); rv=$(run_state review)
echo "check=$ci review=$rv"
case "$ci" in completed/*) ;; *) out state waiting; exit 0;; esac
case "$rv" in completed/*) ;; *) out state waiting; exit 0;; esac
if [ "$ci" != "completed/success" ]; then out state cifail; exit 0; fi
out state judge
