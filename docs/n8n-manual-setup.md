# n8n手動セットアップガイド

n8n APIアクセスには初期設定が必要です。以下の手順で設定してください。

## 1. n8n UIでの初期設定

1. ブラウザで http://localhost:5678 にアクセス
2. 初回アクセス時の設定:
   - Email: `admin@example.com`
   - Password: `password`
   - First name: `Admin`
   - Last name: `User`

## 2. ワークフローのインポート

### 方法1: UI経由でインポート
1. 左サイドバーの「Workflows」をクリック
2. 右上の「+」ボタン → 「Import from file」
3. `n8n-workflow-csds.json` を選択してアップロード

### 方法2: コピー＆ペースト
1. 新規ワークフローを作成
2. 右上の「...」メニュー → 「Import from JSON」
3. `n8n-workflow-csds.json` の内容をペースト

## 3. カスタムノードの確認

「Apply Chiba Style」ノードがエラー表示される場合：

```bash
# カスタムノードの存在確認
docker exec n8n-csds ls -la /home/node/.n8n/nodes/custom/

# 期待される出力:
# -rw-r--r-- 1 node node 6197 Jun 22 11:20 ChibaStyleNode.js
```

エラーの場合は、コンテナを再起動:
```bash
docker-compose restart n8n
```

## 4. 環境変数の設定

### docker-compose.yml で設定済みの変数
- `NODE_ENV=development`
- `N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom`

### .envファイルで設定が必要な変数
```bash
# .env.example をコピー
cp .env.example .env

# 以下の変数を設定
GEMINI_API_KEY=your-actual-api-key
LINE_CHANNEL_ACCESS_TOKEN=your-actual-token
LINE_CHANNEL_SECRET=your-actual-secret
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_TOKEN=your-github-token
```

## 5. ワークフローの有効化

1. インポートしたワークフローを開く
2. 右上の「Inactive」スイッチをクリック
3. 「Active」に変更

## 6. Webhookエンドポイントの確認

有効化後、「LINE Webhook」ノードをクリック:
- Production URL: `http://localhost:5678/webhook/line-webhook-csds`
- Test URL: `http://localhost:5678/webhook-test/line-webhook-csds`

## 7. 動作テスト

### テストモードで実行
1. ワークフロー編集画面で「Execute Workflow」をクリック
2. 「LINE Webhook」ノードをクリック
3. 「Listen for Test Event」をクリック
4. 別ターミナルで以下を実行:

```bash
curl -X POST http://localhost:5678/webhook-test/line-webhook-csds \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "message",
      "message": {
        "type": "text",
        "text": "ナンパのコツを教えて"
      },
      "replyToken": "test-reply-token"
    }]
  }'
```

### 期待される動作
1. **Analyze Query**: クエリタイプを判定
2. **Supabase/CSV Search**: 関連情報を検索
3. **Generate with Gemini**: 基本応答を生成
4. **Apply Chiba Style**: チバスタイルを適用
5. **Check Quality Score**: スコアをチェック（50点以上で通過）

## 8. トラブルシューティング

### カスタムノードが認識されない
```bash
# コンテナに入って確認
docker exec -it n8n-csds sh
cd /home/node/.n8n/nodes/custom
ls -la

# パスが正しいか確認
echo $N8N_CUSTOM_EXTENSIONS
```

### ワークフローがエラーになる
- 各ノードをクリックして設定を確認
- 特に環境変数参照（`{{$env.VARIABLE_NAME}}`）が正しいか確認
- エラーログを確認: `docker logs n8n-csds`

### Webhookが応答しない
- ワークフローが「Active」になっているか確認
- ポート5678が他のプロセスで使用されていないか確認
- `docker-compose ps` でコンテナが正常に起動しているか確認

## 完了チェックリスト

- [ ] n8n UIにアクセスできる
- [ ] 初期ユーザーを作成した
- [ ] ワークフローをインポートした
- [ ] カスタムノードが認識されている
- [ ] 環境変数を設定した
- [ ] ワークフローを有効化した
- [ ] Webhookテストが成功した
- [ ] CSDSスコアが50点以上出る