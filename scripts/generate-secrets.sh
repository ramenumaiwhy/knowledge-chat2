#!/bin/bash

echo "🔐 n8n用のセキュリティキーを生成します..."
echo ""
echo "以下の値をRailwayの環境変数にコピペしてください:"
echo "================================================"
echo ""
echo "N8N_BASIC_AUTH_PASSWORD=$(openssl rand -base64 20)"
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo ""
echo "================================================"
echo ""
echo "✅ 生成完了！上記の2行をそのままコピーしてください。"