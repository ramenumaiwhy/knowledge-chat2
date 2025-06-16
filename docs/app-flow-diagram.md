# 📱 KnowledgeLink アプリケーション動作フロー

## 🔄 システム全体の流れ

```mermaid
graph TB
    A[👤 ユーザー] -->|LINEでメッセージ送信| B[📱 LINE App]
    B -->|Webhook| C[🔧 n8n on Railway]
    C -->|CSVデータ取得| D[📦 GitHub Repository]
    C -->|AI処理| E[🤖 Gemini API]
    C -->|返信| B
    B -->|メッセージ表示| A
```

## 📊 詳細な処理フロー

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant L as 📱 LINE
    participant N as 🔧 n8n
    participant G as 📦 GitHub
    participant AI as 🤖 Gemini API
    
    U->>L: 「料金を教えて」
    L->>N: Webhook送信<br/>(メッセージ + replyToken)
    N->>G: knowledge.csv取得
    G-->>N: CSVデータ返却
    N->>N: キーワード検索<br/>「料金」でフィルタ
    N->>AI: 検索結果 + プロンプト送信
    AI-->>N: 自然な回答生成
    N->>L: 回答を返信
    L->>U: 「基本プランは月額1000円です」
```

## 🗂️ データ管理フロー

```mermaid
graph LR
    A[📝 updates.csv<br/>新規データ] -->|git push| B[🔄 GitHub Actions]
    B -->|自動マージ| C[📊 knowledge.csv<br/>メインDB]
    
```

## 🏗️ インフラ構成

```mermaid
graph TB
    subgraph "☁️ Railway ($5/月)"
        A[🐳 Docker Container<br/>n8n:latest]
    end
    
    subgraph "🌐 外部サービス (無料)"
        B[📱 LINE Messaging API]
        C[🤖 Gemini API]
        D[📦 GitHub]
    end
    
    A <--> B
    A <--> C
    A <--> D
    
```

## 💬 メッセージ処理の詳細

```mermaid
flowchart TD
    A[メッセージ受信] --> B{メッセージタイプ}
    B -->|テキスト| C[CSV検索処理]
    B -->|画像| D[未実装<br/>将来的にGemini Vision]
    
    C --> E{検索結果あり？}
    E -->|Yes| F[関連データ抽出]
    E -->|No| G[デフォルト回答]
    
    F --> H[Gemini APIで<br/>自然言語生成]
    G --> H
    H --> I[LINE返信]
    
```

## 🔐 セキュリティフロー

```mermaid
graph LR
    A[環境変数] -->|暗号化| B[n8n Storage]
    B -->|復号化| C[API呼び出し]
    
    D[管理画面アクセス] -->|Basic認証| E[n8n Dashboard]
    
    F[Webhook] -->|署名検証| G[リクエスト処理]
    
```

## 📈 スケーリング戦略

```mermaid
graph TD
    A[現在の構成<br/>月額$5] --> B{負荷増大？}
    B -->|Yes| C[Railway<br/>プラン変更]
    B -->|No| D[現状維持]
    
    C --> E[オプション1<br/>Cloudflare R2<br/>CSVキャッシュ]
    C --> F[オプション2<br/>Redis追加<br/>検索高速化]
    C --> G[オプション3<br/>複数n8nインスタンス]
    
```

## 🎯 主要コンポーネントの役割

| コンポーネント | 役割 | コスト |
|--------------|------|--------|
| 🔧 n8n | ワークフロー実行エンジン | Railway $5/月 |
| 📦 GitHub | データストレージ・バージョン管理 | 無料 |
| 🤖 Gemini API | 自然言語処理・回答生成 | 無料（60 QPM） |
| 📱 LINE API | メッセージング基盤 | 無料 |

## 🚀 デプロイメントフロー

```mermaid
graph LR
    A[ローカル開発] -->|git push| B[GitHub]
    B -->|自動デプロイ| C[Railway]
    C -->|コンテナ起動| D[n8n稼働]
    D -->|Webhook待機| E[サービス開始]
```

## 💰 より安くする方法

### 🤔 そもそも「AI検索」は必要？

**答え: 大量データなら必要です！**

もし5000件以上のデータ（ブログ記事、メール、PDF等）を扱うなら、AI検索が必要になります。

#### 📖 例え話
- **キーワード検索** = 辞書の索引で探すようなもの → 10件程度ならOK
- **AI検索（ベクトル検索）** = Google検索のように「意味」を理解して探す → 1000件以上なら必須

あなたのCSVは5139行もあるので、AI検索を検討すべきです。

### 選択肢1: 今のままをちょっと改善（月約650円）【🎯 おすすめ！】
```mermaid
graph TB
    A[👤 ユーザー] -->|LINE| B[📱 LINE API<br/>無料]
    B -->|Webhook| C[🔧 n8n on Railway<br/>$5/月]
    C -->|BM25検索| D[📦 GitHub CSV<br/>無料]
    C -->|AI処理| E[🤖 Gemini API<br/>無料]
    C -->|返信| B
    
    F[🔍 より賢い検索<br/>点数付けで並び替え] -.->|検索精度UP| C
```

### 選択肢2: AI検索を追加（月約650円）【✅ 大量データには必須】
```mermaid
graph TB
    A[👤 ユーザー] -->|LINE| B[📱 LINE API<br/>無料]
    B -->|Webhook| C[🔧 n8n on Railway<br/>$5/月]
    C -->|ベクトル検索| D[🗄️ Supabase<br/>無料枠]
    C -->|フォールバック| E[📦 GitHub CSV<br/>無料]
    C -->|AI処理| F[🤖 Gemini API<br/>無料]
    
    G[📊 Gemini Embeddings<br/>無料] -->|ベクトル生成| D
```

### 選択肢3: 完全無料にする（月額0円）【🔧 技術者向け】
```mermaid
graph TB
    A[👤 ユーザー] -->|LINE| B[📱 LINE API<br/>無料]
    B -->|Webhook| C[🔧 n8n<br/>Oracle Cloud無料枠]
    C -->|検索| D[📦 GitHub CSV<br/>無料]
    C -->|AI処理| E[🤖 Gemini API<br/>無料]
    
    F[☁️ Oracleの無料サーバー<br/>ずっと無料] -->|ホスティング| C
```

### 🔍 実現可能性をチェックしました

| 確認したこと | 結果 | わかりやすく説明 |
|------|----------|--------|
| AI検索用データベース | ✅ 無料枠あり | ただし設定が難しい |
| Oracleの無料サーバー | ✅ ずっと無料 | でも自分で全部管理が必要 |
| 賢い検索アルゴリズム | ✅ 実装可能 | 1日でできる！ |
| GoogleのAIエンベディング | ✅ 1日1500回無料 | ただし遅くなる |

## 📈 ステップバイステップで進める方法

```mermaid
graph LR
    A[今<br/>月650円] -->|ステップ1<br/>1日で完了| B[賢い検索追加<br/>検索精度UP]
    B -->|ステップ2<br/>質問が1000件超えたら| C[AI検索を検討<br/>その時に考える]
    C -->|ステップ3<br/>お金を節約したい時| D[無料サーバーへ<br/>引っ越し]
```

### 📊 3つの選択肢を比べてみましょう

| 比べること | 選択肢1（おすすめ） | 選択肢2 | 選択肢3 |
|------|------------|------------|------------|
| 月の費用 | 650円 | 650円 | 0円 |
| 作る難しさ | 簡単（1日） | 普通（1週間） | 難しい（2週間以上） |
| 検索の賢さ | そこそこ | とても賢い | 普通 |
| 管理の楽さ | 楽 | 普通 | 大変（全部自分で） |
| 将来性 | ○ | ◎ | △ |

### 💡 賢い検索の作り方（選択肢1）

今の検索はこんな感じです：
```
ユーザー: 「料金」
システム: キーワードに「料金」があるか確認 → あった！
```

これをもっと賢くします：
```
ユーザー: 「おいくらですか？」
システム: 
1. 「おいくら」→「料金」に似てる？ → 5点
2. 「価格」キーワードも確認 → 10点  
3. 「費用」キーワードも確認 → 10点

合計25点の質問が1位に！
```

こんな感じで「点数」をつけて、一番良さそうな答えを選びます。