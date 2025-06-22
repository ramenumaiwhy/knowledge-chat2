# n8n CSDSワークフローセットアップガイド

## 1. n8n UIへのアクセス

1. ブラウザで http://localhost:5678 にアクセス
2. 初回セットアップ画面が表示されます

## 2. 初期設定

### アカウント作成
- Email: admin@example.com（任意）
- Password: password（docker-compose.ymlで設定済み）
- First name/Last name: 任意

### 基本設定
- Company size: Personal use
- Your role: Other

## 3. ワークフローのインポート

1. 左サイドバーの「Workflows」をクリック
2. 右上の「Add workflow」→「Import from File」を選択
3. `n8n-workflow-csds.json`をアップロード
4. ワークフロー名「LINE Chatbot with CSDS Enhanced」が追加される

## 4. カスタムノードの確認

1. ワークフローを開く
2. 「Apply Chiba Style」ノードが正しく表示されているか確認
3. ノードが赤く表示される場合は、カスタムノードが認識されていない

### トラブルシューティング
```bash
# カスタムノードの場所を確認
docker exec n8n-csds ls -la /home/node/.n8n/nodes/custom/

# n8nを再起動
docker-compose restart n8n
```

## 5. 環境変数の設定

n8n UI内で環境変数を設定：
1. 左サイドバーの「Settings」→「Variables」
2. 以下の変数を追加：
   - `GEMINI_API_KEY`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `GITHUB_TOKEN`
   - `SUPABASE_URL`（オプション）
   - `SUPABASE_SERVICE_KEY`（オプション）

## 6. ワークフローの有効化

1. ワークフロー編集画面で右上の「Inactive」をクリック
2. 「Active」に切り替える
3. Webhookエンドポイントが有効になる

## 7. Webhookエンドポイントの確認

有効化後、Webhookノードをクリックして以下を確認：
- Production URL: `http://localhost:5678/webhook/line-webhook-csds`
- Test URL: `http://localhost:5678/webhook-test/line-webhook-csds`

## 8. テスト実行

### n8n UI内でのテスト
1. 「Execute Workflow」ボタンをクリック
2. Webhookノードで「Listen For Test Event」をクリック
3. 別ターミナルでテストリクエスト送信：

```bash
curl -X POST http://localhost:5678/webhook-test/line-webhook-csds \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "message",
      "message": {
        "type": "text",
        "text": "こんにちは"
      },
      "replyToken": "test-reply-token"
    }]
  }'
```

### 期待される結果
- Analyze Query: クエリタイプ「greeting」を検出
- Generate with Gemini: 基本応答生成
- Apply Chiba Style: スタイル注入とスコア計算
- Check Quality Score: 50点以上で通過
- 最終応答にチバらしいスタイルが適用される

## 9. LINE連携

1. LINE Developers Consoleにログイン
2. Messaging API設定でWebhook URLを更新：
   - 開発環境: `https://your-domain.com/webhook/line-webhook-csds`
   - ローカルテスト: ngrokなどのトンネリングサービスを使用

## 10. パフォーマンスモニタリング

Log Metricsノードが以下の情報を記録：
- queryType: greeting/consultation/question/general
- chibaScore: スタイルスコア（目標60点以上）
- attempts: リトライ回数
- responseTime: 処理時間

## トラブルシューティング

### カスタムノードが見つからない
```bash
# n8nコンテナに入る
docker exec -it n8n-csds sh

# カスタムノードの確認
ls -la /home/node/.n8n/nodes/custom/
cat /home/node/.n8n/nodes/custom/ChibaStyleNode.js
```

### ワークフローエラー
- 各ノードの設定を確認
- 環境変数が正しく設定されているか確認
- docker-compose logsでエラーログを確認

### スコアが低い場合
- CSDSノードのstyleIntensityを0.8-0.9に上げる
- maxRetriesを5に増やす
- Few-shot例を改善