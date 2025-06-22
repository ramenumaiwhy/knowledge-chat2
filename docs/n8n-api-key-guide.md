# n8n APIキー生成ガイド

## APIキーの生成手順

1. **n8n UIにアクセス**
   - URL: http://localhost:5678
   - ログイン: 作成したアカウントでログイン

2. **Settings画面へ移動**
   - 左サイドバーの一番下「Settings」をクリック
   - または直接: http://localhost:5678/settings/personal

3. **API Keysセクション**
   - 左メニューから「API Keys」を選択
   - または直接: http://localhost:5678/settings/api-keys

4. **新しいAPIキーを生成**
   - 「+ Add API Key」ボタンをクリック
   - キー名を入力（例: "CLI Import"）
   - 「Generate」をクリック

5. **APIキーをコピー**
   - 生成されたAPIキーが表示される
   - ⚠️ このキーは一度しか表示されません！
   - 安全な場所にコピー

## APIキーの使用

生成したAPIキーを以下の方法で使用できます：

### 方法1: スクリプトで入力
```bash
node scripts/n8n-api-import.js
# プロンプトでAPIキーを入力
```

### 方法2: 環境変数で設定
```bash
export N8N_API_KEY="your-api-key-here"
node scripts/n8n-api-import.js
```

### 方法3: .env.n8nファイルに保存
```bash
echo "N8N_API_KEY=your-api-key-here" > .env.n8n
node scripts/n8n-api-import.js
```

## セキュリティ注意事項

- APIキーは秘密情報です
- Gitにコミットしないよう注意（.gitignoreに追加済み）
- 本番環境では環境変数で管理

## トラブルシューティング

### API Keysメニューが表示されない
- n8nのバージョンが古い可能性
- Enterprise機能の可能性（Community版では利用可能）

### 代替方法：手動インポート
APIキーが利用できない場合は、n8n UIから直接インポート：
1. Workflows → Import from file
2. `n8n-workflow-csds.json` を選択