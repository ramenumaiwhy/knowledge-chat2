# 🚀 かんたんセットアップガイド

## やることリスト（所要時間：約30分）

### 1️⃣ GitHub Token作成（3分）
1. このリンクを開く: https://github.com/settings/tokens/new
2. 以下を入力:
   - **Note**: `knowledge-chat2`
   - **Expiration**: `90 days`
   - **権限**: ✅ `repo` にチェック
3. 「Generate token」をクリック
4. **表示されたトークンをコピー** (ghp_xxxxx...)
5. `.env`ファイルの`GITHUB_TOKEN=`の後に貼り付け

### 2️⃣ Railway アカウント作成（5分）
1. https://railway.app にアクセス
2. 「Start a New Project」→「Deploy from GitHub repo」
3. GitHubでログイン
4. `knowledge-chat2`リポジトリを選択
5. 「Deploy Now」をクリック

### 3️⃣ Railway 環境変数設定（5分）
1. Railwayダッシュボードで作成したプロジェクトを開く
2. 「Variables」タブをクリック
3. 「Raw Editor」をクリック
4. 以下をコピペ（.envの内容をそのまま）:

```
LINE_CHANNEL_ACCESS_TOKEN=（.envファイルからコピー）
LINE_CHANNEL_SECRET=（.envファイルからコピー）
GEMINI_API_KEY=（.envファイルからコピー）
GITHUB_TOKEN=（ここに1️⃣でコピーしたトークンを貼る）
GITHUB_OWNER=ramenumaiwhy
GITHUB_REPO=knowledge-chat2
N8N_BASIC_AUTH_PASSWORD=（任意の強力なパスワードを設定）
N8N_ENCRYPTION_KEY=（下記コマンドで生成した値を貼る）
```

**N8N_ENCRYPTION_KEY の生成方法:**
ターミナルで以下を実行:
```bash
openssl rand -hex 32
```

5. 「Update Variables」をクリック

### 4️⃣ Railway URL取得（2分）
1. Railwayダッシュボードで「Settings」タブ
2. 「Domains」セクションで「Generate Domain」をクリック
3. 表示されたURL（例: `xxx.up.railway.app`）をメモ

### 5️⃣ n8n初期設定（5分）
1. ブラウザで `https://あなたのURL.up.railway.app` を開く
2. ログイン画面:
   - Username: `admin`
   - Password: `mypassword123`
3. n8nダッシュボードが開いたら「Workflows」→「Import from File」
4. `n8n-workflow.json`をアップロード
5. ワークフローが表示されたら「Save」をクリック
6. 「Active」トグルをONにする

### 6️⃣ LINE Webhook設定（3分）
1. https://developers.line.biz/console/ を開く
2. あなたのチャンネルを選択
3. 「Messaging API」タブ
4. 「Webhook URL」に以下を入力:
   ```
   https://あなたのURL.up.railway.app/webhook/line-webhook
   ```
5. 「Verify」をクリック（Successが出ればOK）
6. 「Use webhook」をONにする

### 7️⃣ 動作確認（2分）
1. LINEアプリであなたのBotを友だち追加
2. 「こんにちは」と送ってみる
3. 返信が来たら成功！🎉

---

## ❓ トラブルシューティング

### 返信が来ない場合
1. Railwayのログを確認:
   - Railwayダッシュボード → 「Logs」タブ
2. n8nの実行履歴を確認:
   - n8n画面 → 左メニュー「Executions」

### よくあるエラー
- **401 Unauthorized**: LINE トークンが間違っている
- **500 Error**: Gemini APIキーが間違っている
- **404 Not Found**: Webhook URLが間違っている

### 質問の追加方法
1. `data/updates.csv`に新しい行を追加
2. GitHubにプッシュすると自動でマージされる

---

## 📞 困ったら

具体的なエラーメッセージと一緒に聞いてください！
「Railwayのログに〇〇というエラーが出ています」など。