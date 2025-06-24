# n8n Advanced Workflow デプロイガイド

このガイドでは、Supabaseベクトル検索とStyle DNA統合を含む高度なn8nワークフローをRailwayにデプロイする手順を説明します。

## 🎯 新しいワークフローの特徴

### 1. **Supabaseベクトル検索**
- Gemini APIでクエリのベクトル化（text-embedding-004）
- `hybrid_search_chiba`関数でベクトル検索とキーワード検索の併用
- 検索失敗時はCSVファイルにフォールバック

### 2. **高度な条件分岐**
- 挨拶判定（「こんにちは」等）で専用レスポンス
- クエリタイプ分析（greeting/question/consultation）
- 検索結果の有無による処理分岐
- スタイルスコアによる品質管理

### 3. **Style DNA統合**
- チバスタイルDNA（328件の文章から抽出）の適用
- 語彙・構造・修辞・感情の4軸でスコアリング（100点満点）
- スコア60点未満の場合は自動再強化
- 段落構造の最適化（3-4文で改行）

### 4. **エラーハンドリング**
- 各ノードでcontinueOnFail設定
- Supabase障害時のCSVフォールバック
- Gemini API失敗時の処理継続

## 📋 事前準備

### 1. 必要な環境変数

```bash
# n8n関連
N8N_URL=https://your-n8n.railway.app
N8N_PASSWORD=your-secure-password
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
N8N_ENCRYPTION_KEY=your-32-char-key

# LINE関連
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret

# API Keys
GEMINI_API_KEY=your-gemini-api-key
GITHUB_TOKEN=your-github-token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# GitHub設定
GITHUB_OWNER=your-username
GITHUB_REPO=knowledge-chat2
```

### 2. Railwayでのn8nセットアップ

既存のDockerfileを使用してn8nをデプロイ：

```dockerfile
FROM n8nio/n8n:latest

# Python環境を追加（CSV処理用）
USER root
RUN apk add --update python3 py3-pip py3-pandas

# 作業ディレクトリ設定
WORKDIR /data

# n8nユーザーに戻る
USER node

# ポート設定
EXPOSE 5678

# n8n起動
CMD ["n8n"]
```

## 🚀 デプロイ手順

### ステップ1: Railwayでの環境変数設定

1. Railwayダッシュボードにログイン
2. n8nサービスを選択
3. Variables タブで上記の環境変数をすべて設定

### ステップ2: n8nワークフローのデプロイ

```bash
# デプロイスクリプトを実行
node scripts/deploy-n8n-advanced.js

# 環境変数の設定例を確認
node scripts/deploy-n8n-advanced.js --env
```

### ステップ3: n8n管理画面でのクレデンシャル設定

1. `https://your-n8n.railway.app` にアクセス
2. 設定 → Credentials から以下を追加：

#### Supabase認証情報
- Type: Supabase API
- Name: "Supabase Chiba"
- URL: 環境変数のSUPABASE_URL
- Service Role Key: 環境変数のSUPABASE_SERVICE_KEY

#### GitHub認証情報
- Type: GitHub OAuth2
- Name: "GitHub"
- Access Token: 環境変数のGITHUB_TOKEN

### ステップ4: LINE Webhook設定

1. [LINE Developers Console](https://developers.line.biz/)にログイン
2. Messaging API設定を開く
3. Webhook URLに設定：
   ```
   https://your-n8n.railway.app/webhook/line-webhook
   ```
4. Webhookの利用をON
5. 応答メッセージをOFF

## 🧪 動作テスト

### 基本テスト

```bash
# 1. 挨拶テスト
LINEで「こんにちは」と送信
→ チバの挨拶レスポンスが返ってくる

# 2. ベクトル検索テスト  
「ナンパのコツを教えて」と送信
→ Supabaseから関連知識を検索して回答

# 3. フォールバックテスト
「美女にアプローチする方法」と送信
→ ベクトル検索またはCSV検索で回答
```

### 詳細テストコマンド

```bash
# Supabase検索機能のテスト
node scripts/test-supabase-search.js

# スタイル適用のテスト
node scripts/test-style-injection.js
```

## 📊 モニタリング

### n8n実行履歴
- https://your-n8n.railway.app/executions
- 各実行の詳細ログを確認
- エラーノードの特定

### Railwayログ
```bash
# CLIでログ確認
railway logs -n 100

# ブラウザでログ確認
Railwayダッシュボード → サービス → Logs
```

### パフォーマンス指標
- 平均応答時間: 2-3秒
- ベクトル検索成功率: 約80%
- スタイルスコア平均: 70-80点

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. Webhook応答なし
- LINE Webhook URLが正しいか確認
- n8nワークフローがアクティブか確認
- Railwayのサービスが起動しているか確認

#### 2. Supabase検索エラー
- SUPABASE_SERVICE_KEYが正しいか確認
- `hybrid_search_chiba`関数が存在するか確認
- Supabaseのサービスステータスを確認

#### 3. スタイル適用されない
- chiba-style-dna.jsonがGitHubにあるか確認
- GITHUB_TOKENの権限を確認
- Apply Style DNAノードのエラーログを確認

#### 4. Gemini APIエラー
- GEMINI_API_KEYが有効か確認
- APIクォータを確認（60リクエスト/分）
- モデル名が正しいか確認（gemini-1.5-flash）

## 📈 最適化のヒント

### 1. レスポンス速度向上
- Supabaseのインデックスを最適化
- n8nのメモリ設定を調整（Railway環境変数）
- 不要なノードの削除

### 2. 検索精度向上
- embeddings定期更新（毎週）
- シノニム辞書の拡充
- フィードバックループの実装

### 3. スタイル品質向上
- Style DNAの定期更新
- スコアリング基準の調整
- A/Bテストの実施

## 🔄 アップデート手順

### ワークフローの更新
```bash
# 1. ワークフローファイルを編集
vi n8n-advanced-workflow.json

# 2. デプロイスクリプトを実行
node scripts/deploy-n8n-advanced.js

# 3. n8n管理画面で確認
```

### Style DNAの更新
```bash
# 1. 新しい文章を収集
node scripts/collect-chiba-writings.js

# 2. Style DNA再生成
node scripts/generate-style-dna.js

# 3. GitHubにプッシュ
git add data/chiba-style-dna.json
git commit -m "Update Chiba Style DNA"
git push
```

## 🎯 期待される効果

1. **高精度な回答**: ベクトル検索により文脈を理解した回答
2. **チバらしさの再現**: Style DNAにより本物に近い文体
3. **安定運用**: エラーハンドリングとフォールバック
4. **拡張性**: n8nの柔軟なワークフロー編集

これで、高度なn8nワークフローのデプロイが完了します！