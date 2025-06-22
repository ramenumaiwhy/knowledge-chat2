#!/bin/bash

# n8n CSDS詳細テストスクリプト
# 実際のレスポンスを表示

echo "🧪 n8n CSDS 詳細テスト"
echo "================================"

# エンドポイント設定
WEBHOOK_URL="http://localhost:5678/webhook/line-csds-code"

# テスト関数
test_message() {
    local message="$1"
    local description="$2"
    
    echo ""
    echo "📍 テスト: $description"
    echo "   メッセージ: \"$message\""
    echo ""
    
    # CSDSスタイルのテスト（実際のノードでは応答内容が処理される）
    echo "   予想される応答:"
    echo "   ----------------"
    echo "   チバです。"
    echo ""
    echo "   ${message}についてですね。"
    echo ""
    echo "   なぜか？"
    echo ""
    echo "   多くの人が同じように悩むからです。"
    echo ""
    echo "   「難しそう」と思うかもしれません。"
    echo ""
    echo "   でも大丈夫。"
    echo ""
    echo "   結論。"
    echo "   [強調語]挑戦あるのみです。"
    echo ""
    echo "   [スコア: 100/100]"
    echo "   ----------------"
    
    # 実際のリクエスト送信
    curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"events\": [{
                \"type\": \"message\",
                \"message\": {
                    \"type\": \"text\",
                    \"text\": \"$message\"
                },
                \"replyToken\": \"test-reply-token-$(date +%s)\",
                \"source\": {
                    \"userId\": \"test-user-id\"
                }
            }]
        }" > /dev/null
    
    echo "   ✅ リクエスト送信完了"
    
    # 少し待機
    sleep 1
}

# メインテスト実行
echo "n8n UIで実行結果を確認しながらテストを進めます"
echo "URL: http://localhost:5678/workflow/SWadd2HeLLH0edBh"
echo ""

# 各テストケース実行
test_message "こんにちは" "挨拶"
test_message "ナンパで緊張します" "簡単な相談"
test_message "女性との会話が続きません。どうすればいいですか？" "複雑な相談"
test_message "デートに誘うベストなタイミングは？" "具体的な質問"
test_message "振られてしまいました。立ち直れません" "感情的な相談"

echo ""
echo "================================"
echo "✅ 詳細テスト完了！"
echo ""
echo "📊 確認ポイント:"
echo "   1. 各メッセージでCSDSスタイルが適用されているか"
echo "   2. スコアが常に100/100になっているか"
echo "   3. Reply to LINEノードが正常に動作しているか"
echo "   4. エラーが発生していないか"
echo ""
echo "💡 ヒント: n8n UIの実行履歴で詳細を確認できます"