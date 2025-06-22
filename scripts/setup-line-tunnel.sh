#!/bin/bash

# LINE Bot ローカルテスト用トンネリングセットアップ

echo "🌐 LINE Bot トンネリングセットアップ"
echo "================================"

# トンネリングオプションの表示
show_options() {
    echo ""
    echo "利用可能なトンネリングサービス:"
    echo ""
    echo "1. ngrok (推奨)"
    echo "   - 簡単セットアップ"
    echo "   - 無料プランあり"
    echo "   - 一時的なURL"
    echo ""
    echo "2. Cloudflare Tunnel"
    echo "   - 安定性が高い"
    echo "   - カスタムドメイン可能"
    echo "   - 設定がやや複雑"
    echo ""
    echo "3. localtunnel"
    echo "   - 完全無料"
    echo "   - npmで簡単インストール"
    echo "   - 安定性は中程度"
}

# ngrokセットアップ
setup_ngrok() {
    echo ""
    echo "📦 ngrokセットアップ"
    echo "================================"
    
    if ! command -v ngrok &> /dev/null; then
        echo "❌ ngrokがインストールされていません"
        echo ""
        echo "インストール方法:"
        echo "  Mac: brew install ngrok"
        echo "  または: https://ngrok.com/download"
        echo ""
        return 1
    fi
    
    echo "✅ ngrokがインストールされています"
    echo ""
    echo "🚀 ngrokトンネルを起動:"
    echo "   ngrok http 5678"
    echo ""
    echo "起動後の手順:"
    echo "1. 表示されるHTTPSのURLをコピー"
    echo "2. LINE Developers ConsoleでWebhook URLを設定:"
    echo "   https://xxxxx.ngrok.io/webhook/line-csds-code"
    echo ""
    echo "⚠️  注意: 無料プランではURLが変わるため、再起動時は再設定が必要"
}

# Cloudflare Tunnelセットアップ
setup_cloudflare() {
    echo ""
    echo "☁️  Cloudflare Tunnelセットアップ"
    echo "================================"
    
    if ! command -v cloudflared &> /dev/null; then
        echo "❌ cloudflaredがインストールされていません"
        echo ""
        echo "インストール方法:"
        echo "  Mac: brew install cloudflared"
        echo "  または: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
        echo ""
        return 1
    fi
    
    echo "✅ cloudflaredがインストールされています"
    echo ""
    echo "🚀 Cloudflareトンネルを起動:"
    echo "   cloudflared tunnel --url http://localhost:5678"
    echo ""
    echo "または永続的なトンネル設定:"
    echo "1. cloudflared tunnel login"
    echo "2. cloudflared tunnel create n8n-csds"
    echo "3. cloudflared tunnel route dns n8n-csds your-domain.com"
    echo "4. cloudflared tunnel run n8n-csds"
}

# localtunnelセットアップ
setup_localtunnel() {
    echo ""
    echo "🚇 localtunnelセットアップ"
    echo "================================"
    
    if ! command -v lt &> /dev/null; then
        echo "❌ localtunnelがインストールされていません"
        echo ""
        echo "インストール方法:"
        echo "  npm install -g localtunnel"
        echo ""
        return 1
    fi
    
    echo "✅ localtunnelがインストールされています"
    echo ""
    echo "🚀 localtunnelを起動:"
    echo "   lt --port 5678 --subdomain n8n-csds"
    echo ""
    echo "URLは以下のようになります:"
    echo "   https://n8n-csds.loca.lt"
}

# 自動起動スクリプト作成
create_start_script() {
    echo ""
    echo "📝 自動起動スクリプトを作成中..."
    
    cat > start-with-tunnel.sh << 'EOF'
#!/bin/bash

# n8nとトンネリングを同時に起動

echo "🚀 n8n + トンネリング起動"
echo "========================"

# n8nコンテナ起動
echo "📦 n8nコンテナを起動中..."
docker-compose up -d

# n8n起動待機
echo "⏳ n8nの起動を待機中..."
sleep 10

# トンネリング起動
echo "🌐 トンネリングを起動中..."
echo ""
echo "以下のコマンドのいずれかを実行:"
echo ""
echo "1. ngrok:"
echo "   ngrok http 5678"
echo ""
echo "2. Cloudflare:"
echo "   cloudflared tunnel --url http://localhost:5678"
echo ""
echo "3. localtunnel:"
echo "   lt --port 5678"
echo ""
echo "========================"
echo ""
echo "📍 トンネルURL取得後の手順:"
echo "1. LINE Developers ConsoleでWebhook URLを更新"
echo "2. Webhook URLの形式: https://your-tunnel-url/webhook/line-csds-code"
echo "3. Webhook検証をテスト"
echo ""
echo "🧪 動作確認:"
echo "   ./test-n8n-detailed.sh"
EOF
    
    chmod +x start-with-tunnel.sh
    echo "✅ start-with-tunnel.sh を作成しました"
}

# LINE設定ガイド
show_line_setup() {
    echo ""
    echo "📱 LINE Developers Console設定"
    echo "================================"
    echo ""
    echo "1. https://developers.line.biz/console/ にアクセス"
    echo ""
    echo "2. チャネル設定 → Messaging API設定"
    echo ""
    echo "3. Webhook設定:"
    echo "   - Webhook URL: https://your-tunnel-url/webhook/line-csds-code"
    echo "   - Webhookの利用: オン"
    echo "   - Webhook検証: 実行してSuccess確認"
    echo ""
    echo "4. 応答設定:"
    echo "   - 応答メッセージ: オフ"
    echo "   - あいさつメッセージ: オフ（任意）"
    echo ""
    echo "5. その他の設定:"
    echo "   - チャネルアクセストークン: 発行済みであることを確認"
    echo "   - チャネルシークレット: 控えておく"
}

# メイン実行
main() {
    show_options
    
    echo ""
    echo "どのトンネリングサービスを使用しますか？"
    echo -n "選択 (1-3): "
    read choice
    
    case $choice in
        1)
            setup_ngrok
            ;;
        2)
            setup_cloudflare
            ;;
        3)
            setup_localtunnel
            ;;
        *)
            echo "無効な選択です"
            exit 1
            ;;
    esac
    
    create_start_script
    show_line_setup
    
    echo ""
    echo "✅ セットアップ完了！"
    echo ""
    echo "次のステップ:"
    echo "1. ./start-with-tunnel.sh を実行"
    echo "2. トンネリングサービスを起動"
    echo "3. LINE Webhook URLを設定"
}

main