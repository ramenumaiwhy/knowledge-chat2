# 環境変数更新チェックリスト

## 🔐 必要な環境変数と取得方法

### 1. **GEMINI_API_KEY**
- **取得URL**: https://makersuite.google.com/app/apikey
- **手順**:
  1. Googleアカウントでログイン
  2. 「Create API Key」をクリック
  3. 生成されたAPIキーをコピー
- **例**: `AIzaSyD-xxxxxxxxxxxxxxxxxxxxxx`

### 2. **LINE_CHANNEL_ACCESS_TOKEN**
- **取得URL**: https://developers.line.biz/console/
- **手順**:
  1. プロバイダー → チャネルを選択
  2. 「Messaging API」タブを開く
  3. 「Channel access token」セクション
  4. 「Issue」または「Reissue」をクリック
- **例**: `Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...`（長い文字列）

### 3. **LINE_CHANNEL_SECRET**
- **取得場所**: LINE Developers Console
- **手順**:
  1. 同じチャネルの「Basic settings」タブ
  2. 「Channel secret」をコピー
- **例**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`（32文字）

### 4. **GITHUB_TOKEN**
- **取得URL**: https://github.com/settings/tokens
- **手順**:
  1. 「Generate new token (classic)」をクリック
  2. Note: `knowledge-chat2`
  3. Expiration: 90 days（推奨）
  4. Scopes: ✅ repo（必須）
  5. 「Generate token」をクリック
- **例**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 5. **GITHUB_OWNER**
- **確認方法**: GitHubプロフィールURL
- **例**: `aiharataketo`（@マークは不要）

## 📝 Railwayでの更新手順

1. **Railwayダッシュボードにアクセス**
   - https://railway.app/dashboard

2. **プロジェクトを選択**
   - `pure-analysis` をクリック

3. **サービスを選択**
   - `knowledge-chat2` をクリック

4. **Variablesタブを開く**

5. **各変数を更新**
   - 変数名をクリック
   - 実際の値を貼り付け
   - Enterで保存

6. **自動再デプロイを待つ**
   - 通常1-2分で完了

## ✅ 更新確認チェックリスト

- [ ] GEMINI_API_KEY を実際の値に更新
- [ ] LINE_CHANNEL_ACCESS_TOKEN を実際の値に更新
- [ ] LINE_CHANNEL_SECRET を実際の値に更新
- [ ] GITHUB_TOKEN を実際の値に更新
- [ ] GITHUB_OWNER を自分のユーザー名に更新
- [ ] Railwayで再デプロイが開始されたことを確認
- [ ] ヘルスチェックが正常に通ることを確認

## 🚨 注意事項

- トークンやシークレットは**絶対に**公開しない
- GitHubトークンは定期的に更新する
- LINE Channel Secretは変更すると既存のWebhookが無効になる
- 環境変数更新後は必ず動作テストを実施する