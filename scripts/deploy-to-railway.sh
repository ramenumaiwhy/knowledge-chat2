#!/bin/bash

# Railway デプロイメントスクリプト

echo "🚂 Railway デプロイメント準備"
echo "================================"

# 1. 環境確認
check_requirements() {
    echo "📋 必要なツールを確認中..."
    
    if ! command -v railway &> /dev/null; then
        echo "❌ Railway CLIがインストールされていません"
        echo "   インストール: brew install railway"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Dockerがインストールされていません"
        exit 1
    fi
    
    echo "✅ 必要なツールが揃っています"
}

# 2. Railway プロジェクト作成
create_railway_project() {
    echo ""
    echo "🔧 Railway プロジェクトを作成中..."
    
    # railway.toml を作成
    cat > railway.toml << EOF
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.n8n-simple"

[deploy]
numReplicas = 1
region = "us-west1"
healthcheckPath = "/"
healthcheckTimeout = 30

[environment]
PORT = 5678
N8N_PROTOCOL = "https"
WEBHOOK_URL = "https://\${{RAILWAY_STATIC_URL}}"
NODE_ENV = "production"
EOF
    
    echo "✅ railway.toml を作成しました"
}

# 3. 環境変数テンプレート作成
create_env_template() {
    echo ""
    echo "📝 環境変数テンプレートを作成中..."
    
    cat > .env.railway.example << EOF
# n8n設定
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
N8N_ENCRYPTION_KEY=your-32-character-encryption-key

# LINE API
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# GitHub（CSV取得用）
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_TOKEN=your-github-token

# Supabase（オプション）
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key

# カスタムノード
N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
EOF
    
    echo "✅ .env.railway.example を作成しました"
}

# 4. デプロイ手順の表示
show_deployment_steps() {
    echo ""
    echo "📚 Railway デプロイ手順"
    echo "================================"
    echo ""
    echo "1. Railway CLIでログイン:"
    echo "   railway login"
    echo ""
    echo "2. 新しいプロジェクトを作成:"
    echo "   railway init"
    echo ""
    echo "3. 環境変数を設定:"
    echo "   railway variables set N8N_BASIC_AUTH_PASSWORD=your-password"
    echo "   railway variables set LINE_CHANNEL_ACCESS_TOKEN=your-token"
    echo "   # その他の環境変数も同様に設定"
    echo ""
    echo "4. デプロイ実行:"
    echo "   railway up"
    echo ""
    echo "5. デプロイ状況確認:"
    echo "   railway logs"
    echo ""
    echo "6. URLを取得:"
    echo "   railway open"
    echo ""
    echo "7. LINE Webhook URLを更新:"
    echo "   https://your-app.railway.app/webhook/line-csds-code"
    echo ""
    echo "================================"
    echo ""
    echo "⚠️  重要な注意事項:"
    echo "- N8N_ENCRYPTION_KEYは32文字の安全な文字列を使用"
    echo "- パスワードは強力なものを設定"
    echo "- 本番環境では必ずHTTPSを使用"
    echo "- 初回デプロイ後、n8n UIでワークフローをインポート"
}

# 5. GitHub Actions 設定
create_github_actions() {
    echo ""
    echo "🔄 GitHub Actions 設定を作成中..."
    
    mkdir -p .github/workflows
    
    cat > .github/workflows/deploy-railway.yml << EOF
name: Deploy to Railway

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: \${{ secrets.RAILWAY_TOKEN }}
        run: railway up --service n8n-csds
EOF
    
    echo "✅ GitHub Actions 設定を作成しました"
}

# メイン実行
main() {
    echo "🚀 Railway デプロイメント準備を開始します"
    echo ""
    
    check_requirements
    create_railway_project
    create_env_template
    create_github_actions
    show_deployment_steps
    
    echo "✅ 準備完了！上記の手順に従ってデプロイを実行してください。"
}

main