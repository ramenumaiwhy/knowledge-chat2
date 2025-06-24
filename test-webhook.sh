#!/bin/bash

# テスト用のWebhookリクエストを送信
echo "Testing n8n webhook directly..."

# ワークフローのExecute Workflow URLを使う
curl -X POST http://localhost:5678/webhook-test/5c788717-cbe5-4b0a-a3e3-7d984ed954a0 \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "events": [{
        "type": "message",
        "message": {
          "type": "text",
          "text": "ナンパ"
        },
        "replyToken": "test-reply-token-123"
      }]
    }
  }' -v