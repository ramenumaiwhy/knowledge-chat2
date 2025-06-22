#!/bin/bash

# クイックトンネリングセットアップ

echo "🌐 LINE Bot トンネリング起動"
echo "============================"
echo ""

# ngrokの存在確認
if command -v ngrok &> /dev/null; then
    echo "✅ ngrokが見つかりました"
    echo ""
    echo "🚀 ngrokトンネルを起動します..."
    echo "   コマンド: ngrok http 5678"
    echo ""
    echo "起動後の手順:"
    echo "1. 表示される「Forwarding」のHTTPS URLをコピー"
    echo "2. LINE Developers ConsoleでWebhook URLを設定:"
    echo "   https://xxxxx.ngrok.io/webhook/line-csds-full"
    echo "3. 「Verify」ボタンで接続確認"
    echo "4. LINEアプリから話しかけてテスト"
    echo ""
    echo "📱 準備ができたらEnterキーを押してngrokを起動..."
    read
    
    ngrok http 5678
else
    echo "❌ ngrokがインストールされていません"
    echo ""
    echo "インストール方法:"
    echo "  Mac: brew install ngrok"
    echo "  または: https://ngrok.com/download"
    echo ""
    echo "代替方法 (localtunnel):"
    echo "  npm install -g localtunnel"
    echo "  lt --port 5678"
fi