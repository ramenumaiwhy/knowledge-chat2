#!/bin/bash

# n8nデプロイ完了待機スクリプト

echo "⏳ n8n デプロイ完了待機中..."
echo "=============================="
echo ""
echo "ビルドログ: https://railway.com/project/b76e8ddd-3f29-4f1c-9ab3-a770948a947d/service/7d5eabc6-36ad-44db-bc86-93e33506875e?id=79ae9fd6-078e-4852-98a6-67972e3f88c0&"
echo ""
echo "デプロイ完了まで数分かかる場合があります..."
echo ""

# 30秒待機
sleep 30

echo "📊 デプロイ状況確認:"
railway status

echo ""
echo "✅ デプロイが完了したら以下を実行:"
echo ""
echo "1. Railwayダッシュボードで公開URLを確認"
echo "   https://railway.app/dashboard"
echo ""
echo "2. 環境変数を実際の値に更新（まだの場合）:"
echo "   railway variables set GEMINI_API_KEY=実際のAPIキー"
echo "   railway variables set LINE_CHANNEL_ACCESS_TOKEN=実際のトークン"
echo "   railway variables set LINE_CHANNEL_SECRET=実際のシークレット"
echo "   railway variables set GITHUB_TOKEN=実際のトークン"
echo "   railway variables set GITHUB_OWNER=GitHubユーザー名"
echo ""
echo "3. n8nにアクセス:"
echo "   https://[your-app].railway.app"
echo "   ユーザー名: admin"
echo "   パスワード: [設定したパスワード]"
echo ""
echo "4. ワークフローインポート:"
echo "   - Workflows → Import from File"
echo "   - n8n-workflow-full.json を選択"
echo "   - ワークフローをActiveに変更"
echo ""
echo "5. LINE Webhook設定:"
echo "   - LINE Developers Consoleで"
echo "   - Webhook URL: https://[your-app].railway.app/webhook/line-csds-full"
echo ""
echo "🔍 トラブルシューティング:"
echo "- n8nにアクセスできない → 数分待ってから再試行"
echo "- ログイン失敗 → N8N_BASIC_AUTH_PASSWORD環境変数を確認"
echo "- ワークフロー実行エラー → 環境変数が正しく設定されているか確認"