#!/bin/bash

# Railway デプロイメント状態チェック

echo "🚂 Railway デプロイメント状態チェック"
echo "===================================="
echo ""

# 1. プロジェクト情報
echo "📊 プロジェクト情報:"
railway status

echo ""
echo "📋 環境変数設定状況:"
railway variables | grep -E "(LINE_|GEMINI_|GITHUB_|N8N_|SUPABASE_)" | head -20

echo ""
echo "🔍 デプロイメントURL取得中..."
# Railway URLを取得する試み
railway service || echo "サービス情報を取得できません"

echo ""
echo "💡 現在の状況:"
echo "- プロジェクト: pure-analysis"
echo "- 環境: production"
echo "- サービス: knowledge-chat2"
echo ""
echo "⚠️  注意事項:"
echo "- 現在webhook-server.jsがデプロイされています"
echo "- n8nコンテナはまだデプロイされていません"
echo "- 環境変数は基本的なものが設定済みです"
echo ""
echo "📝 次のステップの提案:"
echo "1. 現在のwebhook-serverを停止"
echo "2. n8nコンテナをデプロイ"
echo "3. n8nワークフローをインポート"
echo "4. LINE Webhook URLを更新"

# 現在のファイル構成確認
echo ""
echo "📁 デプロイ可能なファイル:"
if [ -f "Dockerfile.n8n-simple" ]; then
    echo "✅ Dockerfile.n8n-simple が存在"
else
    echo "❌ Dockerfile.n8n-simple が見つかりません"
fi

if [ -f "railway.toml" ]; then
    echo "✅ railway.toml が存在"
    echo "   現在の設定:"
    cat railway.toml | grep -E "(builder|dockerfilePath)" | head -5
else
    echo "❌ railway.toml が見つかりません"
fi