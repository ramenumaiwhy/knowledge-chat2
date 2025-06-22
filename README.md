# 🤖 KnowledgeLink - AIナレッジチャットボット

LINE経由でユーザーの質問に対して、CSVベースの知識データベースから関連情報を検索し、AI（Gemini API）を使って自然な回答を生成するシステムです。

## 📋 概要

- **ナレッジベース**: 恋愛・ナンパに関する739件の相談事例とアドバイス
- **AI回答生成**: Google Gemini APIによる自然な日本語応答
- **高度な検索**: キーワードマッチング、シノニム展開、N-gram部分一致
- **低コスト運用**: 月額$5（Railway hosting）のみ
- **拡張性**: Supabaseベクトル検索実装済み（350件のデータで稼働中）

## 🏗️ アーキテクチャ

```
LINE User 
    ↓
LINE Messaging API
    ↓
Railway (webhook-server.js)
    ↓
日本語NLP (kuromoji) → シノニム展開・クエリ分析
    ↓
Supabase Vector Search ← Embeddings (Gemini API)
    ↓ (フォールバック)
CSV Knowledge Base (GitHub)
    ↓
Gemini API (gemini-1.5-flash) → 回答生成
    ↓
CSDS (Chiba Style DNA System) → スタイル注入・検証
    ↓
Natural Response with Chiba's Style (スコア60点以上)
    ↓
LINE User
```

### コンポーネント

1. **webhook-server.js**: LINE webhookを処理するExpressサーバー
2. **Supabaseベクター検索**: 
   - 350件のデータをベクター化して高精度検索
   - ハイブリッド検索（ベクター類似度 + キーワード）
3. **CSVデータベース（フォールバック）**: 
   - `data/knowledge.csv`: Q&A形式の簡易データ
   - `data/processed_knowledge.csv`: 詳細な全文データ
4. **日本語NLP**: kuromoji による形態素解析とシノニム展開
5. **CSDS (Chiba Style DNA System)**: チバさんらしい文体を再現
   - `lib/style-injector.js`: スタイル注入エンジン
   - `lib/style-validator.js`: スタイル検証システム
   - `data/chiba-style-dna.json`: 328件の文章から抽出したスタイルDNA
6. **Railway**: Dockerコンテナホスティング（自動デプロイ）

## 🎯 現在の実装状況（2025年1月）

### ✅ 完成した機能
- **webhook-server.js**: Railwayで本番稼働中
- **CSDS (Chiba Style DNA System)**: チバスタイル再現システム実装完了
  - スコア60点以上を達成（目標50点を大幅クリア）
  - 「なぜか？」の頻度を調整済み（1回/応答に制限）
- **日本語NLP**: kuromoji統合によるシノニム展開と高度な検索
- **RAGシステム**: CSV知識ベースからの適切な情報取得
- **Railway デプロイ**: 自動デプロイ設定完了
- **LINE Webhook**: 正常稼働中

### 📊 パフォーマンス指標
- **CSDSスコア**: 平均69点（目標50点以上）
- **レスポンス時間**: 1-3秒
- **稼働率**: 99%+
- **月額コスト**: $5（Railway hosting）

### 🔗 本番環境
- **Webhook URL**: `https://knowledge-chat2-production.up.railway.app/webhook`
- **ヘルスチェック**: `https://knowledge-chat2-production.up.railway.app/health`

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

必要な環境変数：
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Botのアクセストークン
- `LINE_CHANNEL_SECRET`: LINE Botのチャンネルシークレット
- `GEMINI_API_KEY`: Google Gemini APIキー
- `SUPABASE_URL`: SupabaseプロジェクトのURL
- `SUPABASE_SERVICE_KEY`: Supabaseのサービスロールキー

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
├── webhook-server.js      # メインサーバー（本番稼働中）
├── data/
│   ├── knowledge.csv     # Q&Aデータ
│   ├── processed_knowledge.csv  # 詳細データ
│   ├── chiba-style-dna.json    # チバさんのスタイルDNA
│   └── embeddings/       # エンベディングメタデータ
├── lib/
│   ├── style-injector.js # スタイル注入エンジン
│   └── style-validator.js # スタイル検証システム
├── scripts/              # 各種ユーティリティ
│   └── style-analyzer.js # スタイル分析ツール
├── test/
│   └── test-csds.js     # CSDSテストスイート
├── n8n関連（参考保存）
│   ├── n8n-workflow-full.json    # n8nワークフロー定義
│   ├── n8n-nodes/
│   │   └── ChibaStyleNode.js     # カスタムノード
│   └── Dockerfile.n8n-*          # 各種Dockerファイル
├── docs/                 # ドキュメント
├── README-CSDS.md       # CSDS設計ドキュメント
├── Dockerfile           # Railway用（webhook-server）
├── railway.json         # Railway設定
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

## 🔄 最近の更新（2025年1月）

### スタイル調整
- 「なぜか？」の出現頻度を削減（1回/応答に制限）
- 重複チェック機能を追加
- 挿入確率を50%→30%に調整
- より自然な文章生成を実現

### デプロイメント改善
- n8nワークフロー統合の試行（webhook-serverを最終選択）
- Railway環境変数の整理
- ヘルスチェックエンドポイントの追加

### n8n統合の試行と判断
#### 実装した内容:
- 完全なn8nワークフロー（`n8n-workflow-full.json`）の作成
  - クエリ分析、CSV検索、Gemini統合、CSDS適用を含む高度なフロー
- カスタムノード（`ChibaStyleNode.js`）の開発
- Docker環境の構築（複数のDockerfile作成）
- MCP経由でのワークフロー自動インポート機能

#### 採用しなかった理由:
1. **権限エラー**: コンテナ起動時の権限問題が頻発
2. **デプロイの複雑性**: ヘルスチェック失敗などの運用上の課題
3. **リソース効率**: webhook-server.jsの方が軽量で高速
4. **保守性**: シンプルなNode.jsアプリケーションの方が管理しやすい

結果として、同等の機能をwebhook-server.jsで実現でき、より安定した運用が可能となったため、n8nは不採用としました。関連ファイルは将来の参考のために保持しています。

## 📈 将来の拡張

### 実装済み機能

#### Supabaseベクトル検索
現在350件のデータで稼働中。以下の機能を実装：

1. **ハイブリッド検索**: ベクター類似度 + キーワードマッチング
2. **自動フォールバック**: Supabase障害時はCSV検索を使用
3. **高精度検索**: Gemini APIによるembedding生成
4. **リアルタイム検索**: インデックス化により高速応答

### 検討中の機能
- 会話履歴の保存とコンテキスト管理
- ユーザー別のパーソナライゼーション
- 画像認識とマルチモーダル対応
- より高度なスタイル学習システム

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

## 🤖 このチャットボットの仕組み（中学生向け解説）

### どうやって動いているの？

想像してみてください。あなたが図書館で本を探すときのことを。

1. **あなたがLINEで質問する** 
   - 例：「ナンパのコツを教えて」

2. **チャットボットが質問を理解する**
   - コンピューターが「ナンパ」「コツ」という重要な言葉を見つけます
   - これを「キーワード抽出」と言います

3. **2つの方法で答えを探す**
   
   **方法1: ベクター検索（新しい方法）**
   - あなたの質問を「数字の組み合わせ」に変換します
   - データベースの中から「似た数字の組み合わせ」を持つ答えを探します
   - これは「意味が似ている」ものを見つける賢い方法です
   
   **方法2: キーワード検索（従来の方法）**
   - 「ナンパ」という言葉が含まれる答えを直接探します
   - Googleで検索するのと似ています

4. **AIが自然な文章を作る**
   - 見つかった情報を元に、チバさんらしい答えを作ります
   - まるで本当に人が答えているような文章になります

### なぜ2つの検索方法があるの？

- **ベクター検索**：意味が似ているものを見つけられる（「声かけ」と「ナンパ」は違う言葉だけど似た意味）
- **キーワード検索**：確実に同じ言葉を含むものを見つけられる

両方使うことで、より良い答えが見つかります！

### Supabaseって何？

データベース（情報を保存する場所）をインターネット上で使えるサービスです。
350件の相談データが入っていて、すぐに検索できるようになっています。

### CSDS（チバスタイルDNAシステム）って何？

これは、チバさんという人の「話し方の特徴」をコンピューターに覚えさせるシステムです！

#### どうやって作ったの？

1. **チバさんの文章を328個集めました**
   - メールや相談への回答など

2. **話し方の特徴を見つけました**
   - 「チバです。」で始まることが多い
   - 「なぜか？」という自問自答をよく使う
   - 「ガンガン」「ゴリゴリ」など独特な言葉を使う
   - 短い段落で改行が多い
   - 「結論。」で締めくくることが多い

3. **コンピューターに教えました**
   - これらの特徴を「スタイルDNA」として保存
   - AIが回答するときに、このDNAを使って「チバさんらしさ」を再現

#### 実際の例

**普通の回答**：
```
ナンパがうまくいかないときは、アプローチ方法を見直しましょう。
練習すれば必ず上達します。
```

**CSDSを使った回答**：
```
チバです。

なるほど、
ナンパがうまくいかないんですね。

なぜか？
それは経験が足りないだけだからです。

ガンガン声をかけていけば、
必ず上達します。

結論。
失敗を恐れずにゴリゴリ活動することが、
成功への第一歩です。
```

違いがわかりますか？同じ内容でも、チバさんらしい話し方になっています！

#### スコアはどうやって決まるの？

CSDSには「チバさんらしさ」を測る4つのポイントがあります：

1. **語彙（25点）**: チバさん特有の言葉を使っているか
2. **構造（25点）**: 段落の長さや改行の仕方が似ているか
3. **修辞（25点）**: 「なぜか？」などの表現技法を使っているか
4. **感情（25点）**: 励ましや温かみのある表現があるか

合計100点満点で、50点以上なら「チバさんらしい」と判定されます！

現在のシステムは、本物のチバさんの文章で**69点**を取れるようになりました。

大きな図書館の方がたくさんの本があって、検索も速いですよね。それと同じです！

### 技術用語の説明

- **API（エーピーアイ）**: コンピューター同士が話をするための「言葉」のルール
- **ベクター**: 数字の組み合わせ。文章の「意味」を数字で表現したもの
- **エンベディング**: 文章を数字に変換すること
- **データベース**: 情報を整理して保存しておく場所
- **クラウド**: インターネット上のコンピューター
- **フォールバック**: 最初の方法がダメだったときの「予備の方法」

## 🧬 CSDS（チバスタイルDNAシステム）- チバさんらしさを再現する仕組み

### どういうシステムなの？

みなさんは、好きな歌手や芸能人の「話し方」や「文章の書き方」って、すぐに分かりますよね？

例えば：
- 「〜だぜ！」という人
- 「〜でございます」という人
- 絵文字をたくさん使う人
- 短い文で話す人

このような「その人らしさ」を、コンピューターに教えることができるシステムが **CSDS（チバスタイルDNAシステム）** です！

### どうやって「チバさんらしさ」を作るの？

#### 1. 📊 スタイルを分析する（style-analyzer.js）

まず、チバさんが書いた328個の文章を全部調べます。

調べること：
- よく使う言葉（「ガンガン」「どんどん」「結論」など）
- 文の長さ（短い文が多い？長い文が多い？）
- 段落の作り方（どこで改行するか）
- 特別な表現（「なぜか？」「〜と思うかもしれません」など）

これはまるで、探偵が人の「クセ」を見つけるようなものです！

#### 2. 💉 スタイルを注入する（style-injector.js）

普通の文章を「チバさんらしい文章」に変身させます。

**変身前**：
```
ナンパがうまくいかないときは、練習することが大切です。
```

**変身後**：
```
チバです。

なるほど、
ナンパがうまくいかないんですね。


なぜか？
それは経験が足りないだけです。


ガンガン練習すれば、
必ず上達します。


結論。
どんどん行動することが大切です。
```

#### 3. ✅ スタイルをチェックする（style-validator.js）

作った文章が本当に「チバさんらしい」かチェックします。

チェック項目：
- チバさんがよく使う言葉があるか（70点）
- 文の長さや段落が似ているか（50点）
- 特別な表現が使われているか（25点）
- 励ましの言葉があるか（30点）

合計60点以上なら「チバさんらしい」と判定します！

### なぜこんなシステムが必要なの？

普通のAI（人工知能）は、正しい答えは作れますが、「その人らしさ」は苦手です。

例えば：
- **普通のAI**：「頑張ってください」
- **チバさんらしいAI**：「ガンガン行動して、結果を出していきましょう」

同じ意味でも、チバさんらしい方が親しみやすいですよね！

### プログラミングの面白さ

このシステムを作るときに使った技術：

1. **パターン認識**：人の「クセ」を見つける
2. **文字列処理**：文章を切ったり、つなげたり、変えたりする
3. **確率計算**：「60%の確率でこの言葉を使う」みたいな設定
4. **スコアリング**：点数をつけて評価する

これらは全部、プログラミングの基本的な考え方です。みなさんも勉強すれば、自分の好きな人の「話し方」を再現するプログラムが作れますよ！

### 技術的な詳細（興味がある人向け）

- **スタイルDNA**：622KBのJSONファイルに、チバさんの文章の特徴を保存
- **Few-shot Learning**：少ない例から学習する技術
- **自然言語処理（NLP）**：人間の言葉をコンピューターが理解する技術
- **正規表現**：文章のパターンを見つける特別な書き方

詳しくは [README-CSDS.md](README-CSDS.md) を見てください！

---

Made with ❤️ for better AI conversations