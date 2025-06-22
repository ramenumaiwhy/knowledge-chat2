#!/bin/bash

# webhook-serverへの切り替えスクリプト

echo "🔄 webhook-server（CSDS統合版）への切り替え"
echo "==========================================="
echo ""

# 現在の状況
echo "📊 現在の状況:"
echo "- n8nデプロイは権限問題で不安定"
echo "- webhook-serverは既にCSDSが統合済み"
echo "- webhook-serverの方が安定して動作する"
echo ""

# railway.jsonを更新
echo "📝 railway.jsonを更新中..."
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

echo "✅ railway.json更新完了"
echo ""

# package.jsonの確認
echo "📦 package.jsonの起動コマンド確認:"
grep -A2 '"scripts"' package.json | grep '"start"'

echo ""
echo "🚀 webhook-serverをデプロイ:"
echo "================================"
echo ""
echo "1. 以下のコマンドを実行:"
echo "   railway up"
echo ""
echo "2. デプロイ完了後:"
echo "   - URL: https://knowledge-chat2-production.up.railway.app"
echo "   - ヘルスチェック: https://knowledge-chat2-production.up.railway.app/health"
echo ""
echo "3. LINE Webhook設定:"
echo "   - URL: https://knowledge-chat2-production.up.railway.app/webhook"
echo "   - Webhook検証を実行"
echo ""
echo "4. 動作確認:"
echo "   - LINEアプリからメッセージ送信"
echo "   - 「こんにちは」「ナンパで緊張します」など"
echo ""
echo "✨ webhook-serverの特徴:"
echo "- CSDSスタイル注入機能搭載"
echo "- 日本語NLP（kuromoji）統合"
echo "- シンプルで安定した動作"
echo "- スコア60点以上のチバスタイル回答"