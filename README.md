# 🤖 KnowledgeLink - AIナレッジチャットボット

LINE経由でユーザーの質問に対して、CSVベースの知識データベースから関連情報を検索し、AI（Gemini API）を使って自然な回答を生成するシステムです。

## 📋 概要

- **ナレッジベース**: 恋愛・ナンパに関する739件の相談事例とアドバイス
- **AI回答生成**: Google Gemini APIによる自然な日本語応答
- **高度な検索**: キーワードマッチング、シノニム展開、N-gram部分一致
- **低コスト運用**: 月額$5（Railway hosting）のみ
- **拡張性**: 将来的なSupabaseベクトル検索に対応

## 🏗️ アーキテクチャ

```
LINE User 
    ↓
LINE Messaging API
    ↓
webhook-server.js (Express)
    ↓
CSV Knowledge Base ← GitHub
    ↓
Gemini API (gemini-1.5-flash)
    ↓
Natural Response
    ↓
LINE User
```

### コンポーネント

1. **webhook-server.js**: LINE webhookを処理するExpressサーバー
2. **CSVデータベース**: 
   - `data/knowledge.csv`: Q&A形式の簡易データ
   - `data/processed_knowledge.csv`: 詳細な全文データ
3. **日本語NLP**: kuromoji による形態素解析とシノニム展開
4. **Railway**: Dockerコンテナホスティング（自動デプロイ）

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- LINE Developers アカウント
- Google AI Studio アカウント（Gemini API key）
- Railway アカウント（デプロイ用）

### ローカル開発

1. **リポジトリをクローン**
```bash
git clone https://github.com/yourusername/knowledge-chat2.git
cd knowledge-chat2
```

2. **依存関係をインストール**
```bash
npm install
```

3. **環境変数を設定**
```bash
cp .env.example .env
# .envファイルを編集して必要な情報を入力
```

4. **開発サーバーを起動**
```bash
npm run dev
```

5. **ngrokでトンネリング**（LINE webhookテスト用）
```bash
ngrok http 3000
```

### 本番デプロイ（Railway）

1. GitHubリポジトリをRailwayに接続
2. 環境変数を設定（Railway管理画面）
3. pushすると自動デプロイ

## 📊 データ管理

### CSVデータの構造

**knowledge.csv** (Q&A形式)
```csv
id,category,question,answer,keywords,source,updated_at
1,恋愛相談,デートに誘うタイミングは？,初対面から3回目までに誘うのがベスト...,デート;誘い方;タイミング,メール,2024-01-01
```

**processed_knowledge.csv** (詳細版)
```csv
id,title,content,summary,category,content_type,keywords,date,target_group,occupation,original_length,processed_at
1,デートの誘い方,[全文],"要約...",恋愛相談,email,デート;誘い方,2024-01-01,初心者,サラリーマン,5000,2024-01-01T10:00:00Z
```

### 新しいデータの追加

#### 方法1: 簡単な追加
```bash
# 1. data/updates.csv に新規データを追加
# 2. マージコマンドを実行
npm run merge-csv
# 3. 自動デプロイ
git add . && git commit -m "Add new knowledge" && git push
```

#### 方法2: EMLファイルからのインポート
```bash
# 1. EMLファイルを指定フォルダに配置
# 2. 処理スクリプトを実行
node scripts/eml-processor.js
# 3. マージ
node scripts/merge-new-emails.js
# 4. デプロイ
git push
```

## 🔧 開発

### 利用可能なスクリプト

```bash
npm start              # 本番サーバー起動
npm run dev           # 開発サーバー起動（nodemon）
npm run merge-csv     # CSVマージ
npm run test-webhook  # ローカルwebhookテスト
```

### 主要なスクリプト

- `scripts/csv-merger.js`: CSVファイルのマージ
- `scripts/eml-processor.js`: EMLファイルの処理
- `scripts/generate-embeddings-metadata.js`: エンベディング用メタデータ生成
- `scripts/import-to-supabase.js`: Supabase投入（オプション）

### プロジェクト構成

```
knowledge-chat2/
├── webhook-server.js      # メインサーバー
├── data/
│   ├── knowledge.csv     # Q&Aデータ
│   ├── processed_knowledge.csv  # 詳細データ
│   └── embeddings/       # エンベディングメタデータ
├── scripts/              # 各種ユーティリティ
├── docs/                 # ドキュメント
├── Dockerfile           # Railway用
└── package.json
```

## 🧪 テスト

### ローカルテスト
```bash
# サーバー起動
npm run dev

# 別ターミナルでテスト
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "x-line-signature: test" \
  -d '{
    "events": [{
      "type": "message",
      "message": {"type": "text", "text": "テスト質問"},
      "replyToken": "test-token"
    }]
  }'
```

### ヘルスチェック
```bash
curl http://localhost:3000/health
```

## 🐛 トラブルシューティング

### よくある問題

1. **LINE署名検証エラー**
   - 環境変数 `LINE_CHANNEL_SECRET` を確認
   - ngrokのURLが正しく設定されているか確認

2. **CSV読み込みエラー**
   - 文字コードがUTF-8か確認
   - CSVフォーマットが正しいか確認

3. **Gemini APIエラー**
   - APIキーが有効か確認
   - レート制限（60 requests/minute）に注意

4. **Railway デプロイエラー**
   - Dockerfileが正しいか確認
   - 環境変数がすべて設定されているか確認

## 🔒 セキュリティ

- APIキーは環境変数で管理
- LINE署名検証を実装
- プライバシー保護（個人情報の自動削除）

## 📈 将来の拡張

### Supabaseベクトル検索（オプション）

現在のCSVベースは十分高速ですが、データが1万件を超える場合：

1. Supabaseをセットアップ
2. `npm install @supabase/supabase-js`
3. エンベディング生成
4. ベクトル検索を有効化

## 🤝 コントリビューション

1. Forkする
2. Feature branchを作成 (`git checkout -b feature/amazing-feature`)
3. Commitする (`git commit -m 'Add amazing feature'`)
4. Pushする (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

## 📝 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)を参照

## 🙏 謝辞

- LINE Messaging API
- Google Gemini API
- Railway
- kuromoji（日本語形態素解析）

---

Made with ❤️ for better AI conversations