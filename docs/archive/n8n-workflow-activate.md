# n8nワークフロー有効化ガイド

## ワークフローインポート成功！

APIを使用してワークフローのインポートに成功しました。
- ワークフローID: `wPouBuoDixNiJo1L`
- ワークフロー名: LINE Chatbot with CSDS Enhanced

## 手動での有効化手順

n8n APIでは現在ワークフローの有効化がサポートされていないため、UIから有効化する必要があります。

### 1. n8n UIにアクセス
http://localhost:5678

### 2. ワークフローを開く
- 左サイドバーの「Workflows」をクリック
- 「LINE Chatbot with CSDS Enhanced」を選択

### 3. ワークフローを有効化
- 右上の「Inactive」スイッチをクリック
- 「Active」に変更

### 4. Webhook URLの確認
有効化後、「LINE Webhook」ノードをクリックして確認：
- Production URL: `http://localhost:5678/webhook/line-webhook-csds`
- Test URL: `http://localhost:5678/webhook-test/line-webhook-csds`

## テスト実行

ワークフロー有効化後、以下でテスト可能：

```bash
# 簡単なテスト
curl -X POST http://localhost:5678/webhook/line-webhook-csds \
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

# 包括的なテスト
./test-n8n-webhook.sh
```

## 注意点

### カスタムノードのエラー
「Apply Chiba Style」ノードがエラー表示される場合：

1. n8nを再起動
```bash
docker-compose restart n8n
```

2. 再度ワークフローを開いて確認

### 環境変数の確認
ワークフロー内で使用している環境変数：
- GEMINI_API_KEY
- LINE_CHANNEL_ACCESS_TOKEN
- LINE_CHANNEL_SECRET
- GITHUB_OWNER
- GITHUB_REPO
- GITHUB_TOKEN

これらがdocker-compose.ymlまたは.envファイルで設定されていることを確認してください。