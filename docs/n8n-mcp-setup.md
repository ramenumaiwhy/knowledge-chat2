# n8n MCP Server セットアップガイド

## 🚀 クイックスタート

### 方法1: n8n MCP Server Trigger を使う（推奨）

1. **n8nを最新版にアップデート**
   ```bash
   # n8n v1.88.0以上が必要
   npm update -g n8n
   ```

2. **n8nでワークフローを作成**
   - n8n（http://localhost:5678）を開く
   - 新規ワークフローを作成
   - 「MCP Server Trigger」ノードを追加

3. **MCP Server Triggerの設定**
   - Production URLをコピー
   - Authenticationで「Bearer Auth」を選択
   - 新しいクレデンシャルを作成

### 方法2: n8n-mcp-server npmパッケージを使う

#### オプションA: @ahmad.soliman/mcp-n8n-server

```bash
# Claude Desktopの設定ファイルを開く
# Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
# Windows: %APPDATA%\Claude\claude_desktop_config.json
```

設定ファイルに追加：
```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "@ahmad.soliman/mcp-n8n-server"],
      "env": {
        "N8N_HOST_URL": "http://localhost:5678",
        "PROJECT_ID": "your-project-id",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

#### オプションB: ローカルインストール

```bash
# プロジェクトディレクトリで実行
npm install @ahmad.soliman/mcp-n8n-server
```

設定ファイル：
```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["./node_modules/@ahmad.soliman/mcp-n8n-server/build/index.js"],
      "env": {
        "N8N_HOST_URL": "http://localhost:5678",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 🔑 n8n APIキーの取得方法

1. n8nにログイン
2. 右上のユーザーアイコン → Settings
3. API Keys → Generate new API key
4. キーをコピーして保存

## ✅ 動作確認

1. Claude Desktopを再起動
2. 新しい会話を開始
3. 「@n8n」と入力してMCPサーバーが表示されるか確認

## 🛠️ トラブルシューティング

### エラー: "command error"
- Node.jsがインストールされているか確認
  ```bash
  node --version  # v18以上推奨
  ```

### MCPサーバーが表示されない
- 設定ファイルのパスが正しいか確認
- JSONの構文エラーがないか確認
- Claude Desktopを完全に再起動

### 接続エラー
- n8nが起動しているか確認
- URLとAPIキーが正しいか確認
- ファイアウォールの設定を確認

## 📚 使い方の例

Claude Desktopで：
```
@n8n ワークフローを実行してください
@n8n 新しいワークフローを作成
@n8n webhookを起動して
```