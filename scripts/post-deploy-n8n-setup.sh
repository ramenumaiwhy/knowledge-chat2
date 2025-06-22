#!/bin/bash

# n8nデプロイ後のセットアップガイド

echo "🚀 n8n デプロイ後セットアップ"
echo "=============================="
echo ""
echo "ビルドログ: https://railway.com/project/b76e8ddd-3f29-4f1c-9ab3-a770948a947d/service/7d5eabc6-36ad-44db-bc86-93e33506875e?id=0792ae5d-1271-4745-8139-069a7303524d&"
echo ""

# 待機
echo "⏳ デプロイ完了まで待機中（約1-2分）..."
sleep 60

echo ""
echo "📊 デプロイ状況確認:"
railway status

echo ""
echo "✅ デプロイ完了後の手順:"
echo "=============================="
echo ""
echo "1. 環境変数の更新（Railwayダッシュボードで）:"
echo "   - N8N_API_ENABLED=true"
echo "   - N8N_RUNNERS_ENABLED=true"
echo "   - N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false"
echo "   - GEMINI_API_KEY=実際のAPIキー"
echo "   - LINE_CHANNEL_ACCESS_TOKEN=実際のトークン"
echo "   - その他の環境変数も実際の値に更新"
echo ""
echo "2. n8nアクセス:"
echo "   URL: https://knowledge-chat2-production.up.railway.app"
echo "   ユーザー: admin"
echo "   パスワード: [設定したパスワード]"
echo ""
echo "3. MCPでワークフローインポート（ローカルから）:"
echo "   export N8N_URL=https://knowledge-chat2-production.up.railway.app"
echo "   export N8N_BASIC_AUTH_PASSWORD=[設定したパスワード]"
echo "   node scripts/n8n-mcp-workflow-import.js"
echo ""
echo "4. LINE Webhook設定:"
echo "   https://knowledge-chat2-production.up.railway.app/webhook/line-csds-full"
echo ""
echo "🔍 トラブルシューティング:"
echo "- まだクラッシュする場合 → webhook-server.jsの使用を検討"
echo "- APIインポートが失敗 → 手動でn8n UIからインポート"
echo "- 環境変数エラー → Railwayダッシュボードで再確認"