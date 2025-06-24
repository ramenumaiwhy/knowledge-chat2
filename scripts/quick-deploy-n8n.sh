#!/bin/bash

# n8n Advanced Workflow クイックデプロイスクリプト

echo "🚀 n8n Advanced Workflow デプロイを開始します"
echo ""

# 環境変数チェック
echo "📋 環境変数をチェック中..."
required_vars=(
    "LINE_CHANNEL_ACCESS_TOKEN"
    "LINE_CHANNEL_SECRET"
    "GEMINI_API_KEY"
    "GITHUB_TOKEN"
    "GITHUB_OWNER"
    "GITHUB_REPO"
    "SUPABASE_URL"
    "SUPABASE_SERVICE_KEY"
    "N8N_BASIC_AUTH_PASSWORD"
    "N8N_ENCRYPTION_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
        echo "❌ $var: 未設定"
    else
        echo "✅ $var: 設定済み"
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo ""
    echo "❌ 以下の環境変数が設定されていません:"
    printf '%s\n' "${missing_vars[@]}"
    echo ""
    echo "Railway CLIで設定してください:"
    echo "railway variables set KEY=value"
    exit 1
fi

echo ""
echo "✅ すべての環境変数が設定されています"

# Railway デプロイ
echo ""
echo "🚂 Railwayにデプロイ中..."
railway up --detach

# デプロイ状態確認
echo ""
echo "⏳ デプロイ状態を確認中..."
sleep 10

# URLを取得
echo ""
echo "🔍 デプロイされたURLを確認中..."
railway status

# n8nワークフローのデプロイ
echo ""
echo "📤 n8nワークフローをデプロイ中..."
node scripts/deploy-n8n-advanced.js

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "📌 次のステップ:"
echo "1. n8n管理画面にアクセスして認証情報を設定"
echo "2. LINE Developers ConsoleでWebhook URLを設定"
echo "3. LINEでテストメッセージを送信"