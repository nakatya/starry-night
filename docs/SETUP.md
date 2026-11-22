# セットアップと開発の流れ

## 1. 最初に一度だけやること(人の作業・約30分)

### リポジトリを作る
1. GitHub で新しいリポジトリを作る(例: `starry-night`)。公開リポジトリにすると、Actions とブランチ保護が無料で使えます。
2. このフォルダの中身をすべて push する。

> 注: Issue #1 がマージされるまで `package.json` がないため、main の CI と Deploy は失敗します。問題ありません。

### Claude を接続する
1. 手元に Claude Code を入れ、リポジトリのフォルダで `claude` を起動して `/install-github-app` を実行する。
   Claude GitHub App のインストールと、シークレットの登録が案内されます。
2. 認証はサブスク(Pro / Max)の定額枠を使う方式にします。シークレット名は `CLAUDE_CODE_OAUTH_TOKEN` にしてください(ワークフローがこの名前を参照します)。
   API キー方式にする場合は、ワークフローの `claude_code_oauth_token:` を `anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}` に書き換え、API コンソールで月の上限額を必ず設定します。

### ストッパーを設定する(Settings → Branches → main にルールを追加)
- Require a pull request before merging: オン
  - Require approvals: 1
  - Require review from Code Owners: オン
- Require status checks to pass: オン(`check` を選択。Issue #1 の PR で一度 CI が走ると選べるようになります)
- Do not allow bypassing the above settings: 好みで(オンにすると自分も直 push できなくなります)

個人リポジトリでは、自分の PR を自分で「Approve」できません。Claude が作った PR は作成者が Claude(bot)なので、自分が承認できます。

### 公開の設定
Settings → Pages → Source を「GitHub Actions」にする。

### Issue を登録する
```
gh auth login        # 未ログインなら
./scripts/create-issues.sh
```

## 2. ふだんの流れ

```
Issue を読む → 「approved」ラベルを付ける            ← 人(ストッパー①)
  → Claude が実装し PR を作る                        ← 自動
  → Claude Review がレビュー、CI がテスト             ← 自動
  → 指摘があれば PR に「@claude 指摘を直して」         ← 人(一言だけ)
  → プレビューを触って確認し、Approve → マージ          ← 人(ストッパー②)
  → GitHub Pages に自動公開                          ← 自動
```

- 見て確認するときは、PR のブランチを手元で `npm run dev` するか、マージ後の公開ページで確認します。
- Claude が `needs-human` ラベルを付けたら、質問に答えてから `@claude 回答しました。続けてください` とコメントします。

## 3. 進め方のコツ
- 最初は Issue #1 だけに `approved` を付け、結果を見てから次に進む。並行して何本も走らせない。
- #3(うねり)は見た目の要なので、必ず自分の目で見てからマージする。
- 慣れたら、Claude Code のクラウドのスケジュール実行(Routines)で「毎朝、承認済みで未着手の Issue を1本進める」ようにすると、PC を開かずに進みます。

## 4. 自動進行(Autopilot)

`.github/workflows/orchestrator.yml` が、PC を開いていなくても GitHub 上で開発を進めます。

- 15分おき、または CI・レビュー・Claude のワークフローが終わるたびに動きます
- `site` ラベルの open な Issue を番号順に1本ずつ、承認 → 実装 → CI とレビュー → 判断 → 承認してマージ、まで進めます
- 判断は Claude が行います。致命的な指摘があれば同じ PR で直させ(2回まで)、後で直すべき指摘は `auto` ラベルの Issue にします(通算 8 本まで)
- 人を呼ぶとき: Issue に `needs-human` ラベルとコメントが付きます(GitHub の通知が届きます)。答えたら `needs-human` を外すと再開します
- `.github/`、`CLAUDE.md`、`docs/DESIGN.md`、`package.json`、`scripts/` を変える PR は自動ではマージできず、人を呼びます

止め方:
- 一時停止: Settings → Secrets and variables → Actions → Variables に `AUTOPILOT` = `off` を作る(`on` に戻すか削除で再開)
- 特定の Issue を飛ばす: `hold` ラベルを付ける
- 完全停止: Actions タブ → Autopilot → Disable workflow

必要な設定: Settings → Actions → General → Workflow permissions の「Allow GitHub Actions to create and approve pull requests」をオン
