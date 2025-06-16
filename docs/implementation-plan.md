# KnowledgeLink 最小構成実装プラン

## 推奨構成: Railway + n8n + GitHub + Gemini API

### アーキテクチャ
```
[LINE User] 
    ↓
[LINE Messaging API]
    ↓
[n8n on Railway]
    ├── Webhook受信
    ├── CSVデータ検索
    ├── Gemini API呼び出し
    └── LINE返信
    
[GitHub Repository]
    └── CSVファイル管理
    
[NotebookLM]
    └── 手動で知識ベース作成（初期セットアップ時）
```

### コスト内訳
- Railway: $5/月（Hobby Plan）
- GitHub: 無料
- Gemini API: 無料枠（60 QPM）
- LINE Messaging API: 無料
- NotebookLM: 無料

**合計: 月額$5**

### 実装手順

#### 1. LINE Bot作成
```bash
# LINE Developersで作成
# - Messaging API チャンネル作成
# - Webhook URL設定（後でn8nのURLを設定）
# - チャンネルアクセストークン取得
```

#### 2. GitHub リポジトリ準備
```
knowledge-chat2/
├── data/
│   ├── knowledge.csv      # メイン知識ベース
│   ├── faq.csv           # FAQ用
│   └── updates.csv       # 追加データ用
├── scripts/
│   └── csv-merger.js     # CSV統合スクリプト
└── README.md
```

#### 3. n8n ワークフロー設計

##### メインワークフロー
1. **LINE Webhook受信**
   - Webhook Node
   - メッセージ解析

2. **CSV検索処理**
   - GitHub APIでCSV取得
   - キーワード検索
   - 関連データ抽出

3. **Gemini API処理**
   - プロンプト生成
   - 回答生成

4. **LINE返信**
   - 返信メッセージ送信

#### 4. Railway デプロイ設定
```yaml
# railway.json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 5. n8n Dockerfile
```dockerfile
FROM n8nio/n8n:latest

USER root
RUN apk add --no-cache python3 py3-pip
USER node

ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=$N8N_PASSWORD
ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=5678
ENV N8N_PROTOCOL=https
ENV WEBHOOK_URL=https://$RAILWAY_STATIC_URL

EXPOSE 5678
```

### CSVデータ構造

#### knowledge.csv
```csv
id,category,question,answer,keywords,source,updated_at
1,"製品情報","料金プランは？","基本プラン: 月額1000円...","料金,プラン,価格","公式サイト","2024-01-01"
2,"使い方","ログイン方法","1. トップページから...","ログイン,サインイン","マニュアル","2024-01-01"
```

### n8n ワークフロー実装例

```javascript
// CSV検索ノードの Function Item
const userMessage = $input.first().json.message.text;
const csvData = $input.first().json.csvContent;

// CSVをパース
const rows = csvData.split('\n').map(row => row.split(','));
const headers = rows[0];
const data = rows.slice(1);

// キーワード検索
const results = data.filter(row => {
  const keywords = row[4]; // keywords列
  const question = row[2]; // question列
  return keywords.includes(userMessage) || question.includes(userMessage);
});

return results.map(row => ({
  json: {
    category: row[1],
    question: row[2],
    answer: row[3],
    source: row[5]
  }
}));
```

### Gemini API プロンプトテンプレート

```javascript
const prompt = `
あなたは親切なカスタマーサポートです。
以下の情報を基に、ユーザーの質問に答えてください。

ユーザーの質問: ${userMessage}

関連情報:
${searchResults.map(r => `- ${r.question}: ${r.answer}`).join('\n')}

回答は簡潔で分かりやすく、敬語で答えてください。
関連情報にない場合は「申し訳ございません、その情報は見つかりませんでした」と答えてください。
`;
```

### CSV追加・更新の仕組み

1. **GitHub Actions自動化**
```yaml
name: Merge CSV Files
on:
  push:
    paths:
      - 'data/*.csv'

jobs:
  merge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: |
          cd data
          cat knowledge.csv updates.csv > merged.csv
          mv merged.csv knowledge.csv
          rm updates.csv
          touch updates.csv
      - uses: EndBug/add-and-commit@v7
        with:
          message: 'Auto-merge CSV files'
```

2. **NotebookLM更新フロー**
- 月1回、merged CSVをNotebookLMにアップロード
- NotebookLMで要約・構造化
- 重要な洞察をCSVに追記

### セキュリティ設定

```javascript
// 環境変数
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx
GEMINI_API_KEY=xxx
GITHUB_TOKEN=xxx
N8N_BASIC_AUTH_PASSWORD=xxx
```

### 監視・ログ

- Railway: 標準ログ機能
- n8n: 実行履歴（7日間保持）
- エラー通知: n8nのError Triggerでメール通知

### 拡張可能性

1. **画像対応**: Gemini Visionを使用
2. **多言語対応**: CSVに言語列追加
3. **分析機能**: BigQueryへのログ連携（月$0〜）
4. **高速化**: Cloudflare R2でCSVキャッシュ（月$0〜）

この構成なら月額$5で運用でき、必要に応じて機能拡張も可能です。