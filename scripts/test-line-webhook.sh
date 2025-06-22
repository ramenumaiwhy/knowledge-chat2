#!/bin/bash

# LINE Webhook動作テストスクリプト

echo "🧪 LINE Webhook 動作テスト"
echo "========================="
echo ""

# Webhook URL
WEBHOOK_URL="https://knowledge-chat2-production.up.railway.app/webhook"

echo "📍 テスト対象URL: $WEBHOOK_URL"
echo ""

# テスト1: 簡単な挨拶
echo "テスト1: 挨拶メッセージ"
echo "------------------------"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: test" \
  -d '{
    "events": [{
      "type": "message",
      "replyToken": "test-token-1",
      "source": {
        "userId": "test-user",
        "type": "user"
      },
      "message": {
        "type": "text",
        "text": "こんにちは"
      }
    }]
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# テスト2: 相談メッセージ
echo "テスト2: 相談メッセージ"
echo "------------------------"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: test" \
  -d '{
    "events": [{
      "type": "message",
      "replyToken": "test-token-2",
      "source": {
        "userId": "test-user",
        "type": "user"
      },
      "message": {
        "type": "text",
        "text": "ナンパで緊張してしまいます。どうすればいいですか？"
      }
    }]
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo ""
echo "📝 テスト結果の見方:"
echo "==================="
echo "- HTTP Status 200: 正常に処理された"
echo "- HTTP Status 400: リクエスト形式エラー"
echo "- HTTP Status 401: 署名検証エラー（テストでは正常）"
echo "- HTTP Status 500: サーバーエラー"
echo ""
echo "⚠️  注意: 署名検証のため401エラーが返ることがありますが、"
echo "   実際のLINEアプリからは正常に動作します。"
echo ""
echo "🔍 次のステップ:"
echo "================"
echo "1. LINE Developers ConsoleでWebhook設定"
echo "2. Webhook URL: $WEBHOOK_URL"
echo "3. 「Verify」ボタンで検証"
echo "4. LINEアプリから実際にメッセージを送信"