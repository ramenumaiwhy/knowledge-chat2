#!/bin/bash

# n8n Railway デプロイメントスクリプト

echo "🚂 n8n Railway デプロイメント"
echo "============================"
echo ""

# 環境変数の確認
echo "📋 現在の環境変数を確認中..."
echo ""

# 必要な環境変数
required_vars=(
    "LINE_CHANNEL_ACCESS_TOKEN"
    "LINE_CHANNEL_SECRET"
    "GEMINI_API_KEY"
    "GITHUB_OWNER"
    "GITHUB_REPO"
    "GITHUB_TOKEN"
    "N8N_BASIC_AUTH_PASSWORD"
    "N8N_ENCRYPTION_KEY"
)

echo "✅ 設定済み環境変数:"
for var in "${required_vars[@]}"; do
    if railway variables | grep -q "$var"; then
        echo "  - $var: 設定済み"
    else
        echo "  - $var: ⚠️  未設定"
    fi
done

echo ""
echo "🔨 デプロイ実行"
echo "============================"
echo ""

# デプロイ実行
echo "📦 n8nコンテナをデプロイします..."
echo "実行コマンド: railway up"
echo ""

# 確認プロンプト
echo "⚠️  注意事項:"
echo "- 現在のwebhook-serverが置き換えられます"
echo "- n8nコンテナが起動します"
echo "- 初回起動には数分かかる場合があります"
echo ""
echo "続行しますか？ (y/N): "
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "🚀 デプロイを開始します..."
    railway up
    
    echo ""
    echo "📊 デプロイ状況:"
    railway status
    
    echo ""
    echo "✅ デプロイが開始されました！"
    echo ""
    echo "📝 次のステップ:"
    echo "1. デプロイ完了を待つ（railway logs で確認）"
    echo "2. https://[your-app].railway.app にアクセス"
    echo "3. n8nにログイン（admin / 設定したパスワード）"
    echo "4. ワークフローをインポート（n8n-workflow-full.json）"
    echo "5. LINE Webhook URLを更新"
else
    echo "❌ デプロイをキャンセルしました"
fi