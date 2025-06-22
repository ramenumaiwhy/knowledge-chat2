#!/bin/bash

# n8nデプロイメント確認スクリプト

echo "🔍 n8n デプロイメント状態確認"
echo "=============================="
echo ""

# 1. デプロイ状態
echo "📊 Railway プロジェクト状態:"
railway status

# 2. ビルドログURL
echo ""
echo "🔗 最新のビルドログ:"
echo "https://railway.com/project/b76e8ddd-3f29-4f1c-9ab3-a770948a947d/service/7d5eabc6-36ad-44db-bc86-93e33506875e?id=3fdfc0f1-c3b5-4e29-aa23-75b9ac52f567&"

# 3. 環境変数確認
echo ""
echo "🔐 重要な環境変数の確認:"
echo "（実際の値に更新が必要な項目）"
echo ""
railway variables | grep -E "(GEMINI_API_KEY|LINE_CHANNEL|GITHUB_TOKEN)" | head -10

# 4. 推奨アクション
echo ""
echo "📝 推奨アクション:"
echo "=============================="
echo ""
echo "1. ビルドログでデプロイ完了を確認"
echo ""
echo "2. 環境変数を実際の値に更新:"
echo "   railway variables set GEMINI_API_KEY=あなたの実際のAPIキー"
echo "   railway variables set LINE_CHANNEL_ACCESS_TOKEN=あなたの実際のトークン"
echo "   railway variables set LINE_CHANNEL_SECRET=あなたの実際のシークレット"
echo "   railway variables set GITHUB_TOKEN=あなたの実際のGitHubトークン"
echo "   railway variables set GITHUB_OWNER=あなたのGitHubユーザー名"
echo ""
echo "3. デプロイ成功後:"
echo "   - RailwayダッシュボードでPublic URLを確認"
echo "   - https://[your-app].railway.app にアクセス"
echo "   - admin / [設定したパスワード] でログイン"
echo ""
echo "4. n8nワークフローセットアップ:"
echo "   - n8n-workflow-full.json をインポート"
echo "   - ワークフローをActiveに変更"
echo ""
echo "5. LINE Webhook設定:"
echo "   - URL: https://[your-app].railway.app/webhook/line-csds-full"
echo "   - Webhook検証を実行"