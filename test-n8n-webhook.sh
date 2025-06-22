#!/bin/bash

# n8n CSDSワークフローのテストスクリプト

echo "🧪 n8n CSDS Webhook テスト開始"
echo "================================"

# エンドポイント設定
WEBHOOK_URL="http://localhost:5678/webhook-test/line-webhook-csds"

# テストケース配列
declare -a test_messages=(
    "こんにちは"
    "ナンパで緊張します"
    "女性との会話が続きません。どうすればいいですか？"
    "デートに誘うベストなタイミングは？"
    "振られてしまいました。立ち直れません"
)

declare -a test_descriptions=(
    "挨拶"
    "簡単な相談"
    "複雑な相談"
    "具体的な質問"
    "感情的な相談"
)

# 各テストケースを実行
for i in "${!test_messages[@]}"; do
    echo ""
    echo "📍 テストケース $((i+1)): ${test_descriptions[$i]}"
    echo "   メッセージ: \"${test_messages[$i]}\""
    echo ""
    
    # リクエスト送信
    response=$(curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"events\": [{
                \"type\": \"message\",
                \"message\": {
                    \"type\": \"text\",
                    \"text\": \"${test_messages[$i]}\"
                },
                \"replyToken\": \"test-reply-token-$i\",
                \"source\": {
                    \"userId\": \"test-user-id\"
                }
            }]
        }")
    
    # レスポンス確認
    if [ -z "$response" ]; then
        echo "   ✅ リクエスト成功（n8n UI で結果を確認してください）"
    else
        echo "   ⚠️ レスポンス: $response"
    fi
    
    # 次のリクエストまで少し待機
    sleep 2
done

echo ""
echo "================================"
echo "✅ テスト完了！"
echo ""
echo "📊 n8n UIで以下を確認してください："
echo "   1. 各ノードの実行結果"
echo "   2. Apply Chiba Styleノードのスコア"
echo "   3. 最終的な応答テキスト"
echo "   4. Log Metricsのパフォーマンス情報"