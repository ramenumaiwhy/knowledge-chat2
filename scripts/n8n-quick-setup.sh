#!/bin/bash

# n8nクイックセットアップスクリプト

echo "🚀 n8n CSDS クイックセットアップ"
echo "================================"

# 1. 既存のn8nコンテナを確認
if docker ps | grep -q "n8n-csds"; then
    echo "✅ n8nコンテナが稼働中"
else
    echo "⚠️  n8nコンテナが起動していません"
    echo "   docker-compose up -d を実行してください"
    exit 1
fi

# 2. 環境変数の確認
echo ""
echo "📋 環境変数チェック:"
required_vars=("GEMINI_API_KEY" "LINE_CHANNEL_ACCESS_TOKEN" "LINE_CHANNEL_SECRET" "GITHUB_OWNER" "GITHUB_REPO" "GITHUB_TOKEN")

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "   ❌ $var が設定されていません"
        missing_vars+=($var)
    else
        echo "   ✅ $var"
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  必要な環境変数が設定されていません"
    echo "   .env ファイルを作成して環境変数を設定してください"
    echo ""
    echo "   例:"
    echo "   cp .env.example .env"
    echo "   # .env ファイルを編集"
    echo ""
fi

# 3. 自動セットアップの実行
echo ""
echo "🔧 n8n自動セットアップを実行します..."
echo ""

# 環境変数を読み込み
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Node.jsスクリプトを実行
node scripts/n8n-cli-setup.js

# 4. 完了メッセージ
echo ""
echo "================================"
echo "🎉 セットアップ完了！"
echo ""
echo "📍 アクセス情報:"
echo "   n8n UI: http://localhost:5678"
echo "   ログイン: admin@example.com / password"
echo ""
echo "🧪 動作確認:"
echo "   ./test-n8n-webhook.sh"
echo ""