# Supabase セットアップガイド（初心者向け完全版）

## 1. Supabase プロジェクト作成

### ステップ 1-1: アカウント作成・ログイン
1. [Supabase](https://supabase.com)にアクセス
2. 右上の「Sign In」をクリック
3. GitHubアカウントでサインイン（推奨）
4. 初回の場合は「Sign up」からアカウント作成

### ステップ 1-2: 新プロジェクト作成
1. ダッシュボードで「New project」をクリック
2. プロジェクト情報を入力:
   - **Organization**: 個人アカウント選択
   - **Name**: `chiba-chatbot`
   - **Database Password**: **必ずメモ！** 強力なパスワード設定（例：`ChibaBot2024!@#`）
   - **Region**: `Asia Pacific (Tokyo)` 選択
   - **Pricing Plan**: `Free`
3. 「Create new project」をクリック
4. **⏳ 約2-3分待つ**（プロジェクト作成中）

## 2. pgvector 拡張機能の有効化

### ステップ 2-1: Extensions画面へ移動
1. 左サイドバーから「**Database**」をクリック
2. 「**Extensions**」をクリック

### ステップ 2-2: vector拡張機能を有効化
1. 右上の検索欄に「**vector**」と入力
2. 「**vector**」という名前の拡張機能を見つける
3. 右端の「**Enable**」ボタンをクリック
4. ✅ 「Enabled」と表示されればOK

## 3. データベーススキーマ作成

### ステップ 3-1: SQL Editorを開く
1. 左サイドバーから「**SQL Editor**」をクリック
2. 「**New query**」をクリック

### ステップ 3-2: スキーマ作成クエリ実行
**以下のSQLを全てコピーして、SQL Editorに貼り付けてください：**

```sql
-- Chiba persona knowledge table
CREATE TABLE chiba_knowledge (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(50),
  content_type VARCHAR(20) DEFAULT 'email',
  keywords TEXT[],
  date TIMESTAMP,
  target_group VARCHAR(100),
  occupation VARCHAR(100),
  original_length INTEGER,
  processed_at TIMESTAMP DEFAULT NOW(),
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### ステップ 3-3: クエリの実行
1. 上記のSQLをコピーして、SQL Editorの大きなテキストエリアに貼り付け
2. 右下の「**RUN**」ボタンをクリック
3. ✅ **「Success. No rows returned」と表示されたら正常完了！**
   - これは「正常に実行されたが、返すデータがない」という意味
   - テーブルが作成されただけなので、これで正解です

### ステップ 3-4: インデックス作成クエリ実行
**新しいクエリとして以下をSQL Editorに貼り付けて実行：**

```sql
-- Create indexes for efficient search
CREATE INDEX idx_chiba_category ON chiba_knowledge(category);
CREATE INDEX idx_chiba_content_type ON chiba_knowledge(content_type);
CREATE INDEX idx_chiba_keywords ON chiba_knowledge USING GIN(keywords);
CREATE INDEX idx_chiba_date ON chiba_knowledge(date);
```

**実行方法：**
1. SQL Editorで「**New query**」をクリック
2. 上記SQLを貼り付け
3. 「**RUN**」をクリック

**⚠️ 「already exists」エラーが出た場合：**

**これは正常です！** インデックスが既に作成済みという意味です。

次のステップに進んでください。確認したい場合は以下を実行：

```sql
-- Check existing indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'chiba_knowledge';
```

以下のようなインデックスが表示されればOK：
- `idx_chiba_category`
- `idx_chiba_content_type` 
- `idx_chiba_keywords`
- `idx_chiba_date`

✅ **either「Success. No rows returned」OR「already exists」エラー = 正常**

### ステップ 3-5: 検索関数作成
**新しいクエリとして以下を実行：**

```sql
-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_chiba_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id int,
  title varchar,
  content text,
  summary text,
  category varchar,
  keywords text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chiba_knowledge.id,
    chiba_knowledge.title,
    chiba_knowledge.content,
    chiba_knowledge.summary,
    chiba_knowledge.category,
    chiba_knowledge.keywords,
    1 - (chiba_knowledge.embedding <=> query_embedding) AS similarity
  FROM chiba_knowledge
  WHERE 1 - (chiba_knowledge.embedding <=> query_embedding) > match_threshold
  ORDER BY chiba_knowledge.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**実行後：** ✅ 「Success. No rows returned」で正常

### ステップ 3-6: ハイブリッド検索関数作成
**新しいクエリとして以下を実行：**

```sql
-- Create hybrid search function (vector + full-text)
CREATE OR REPLACE FUNCTION hybrid_search_chiba(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id int,
  title varchar,
  content text,
  summary text,
  category varchar,
  keywords text[],
  search_type text,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vector search if embedding provided
  IF query_embedding IS NOT NULL THEN
    RETURN QUERY
    SELECT
      chiba_knowledge.id,
      chiba_knowledge.title,
      chiba_knowledge.content,
      chiba_knowledge.summary,
      chiba_knowledge.category,
      chiba_knowledge.keywords,
      'vector'::text AS search_type,
      (1 - (chiba_knowledge.embedding <=> query_embedding)) AS score
    FROM chiba_knowledge
    WHERE 1 - (chiba_knowledge.embedding <=> query_embedding) > match_threshold
    ORDER BY chiba_knowledge.embedding <=> query_embedding
    LIMIT match_count;
  ELSE
    -- Fallback to keyword search
    RETURN QUERY
    SELECT
      chiba_knowledge.id,
      chiba_knowledge.title,
      chiba_knowledge.content,
      chiba_knowledge.summary,
      chiba_knowledge.category,
      chiba_knowledge.keywords,
      'keyword'::text AS search_type,
      0.8::float AS score
    FROM chiba_knowledge
    WHERE 
      chiba_knowledge.content ILIKE '%' || query_text || '%'
      OR chiba_knowledge.title ILIKE '%' || query_text || '%'
      OR query_text = ANY(chiba_knowledge.keywords)
    ORDER BY 
      CASE 
        WHEN chiba_knowledge.title ILIKE '%' || query_text || '%' THEN 1
        WHEN query_text = ANY(chiba_knowledge.keywords) THEN 2
        ELSE 3
      END
    LIMIT match_count;
  END IF;
END;
$$;
```

**実行後：** ✅ 「Success. No rows returned」で正常

## 4. Row Level Security (RLS) 設定

### ステップ 4-1: セキュリティ設定
**新しいクエリで以下を実行：**

```sql
-- Enable RLS on the table
ALTER TABLE chiba_knowledge ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (for API access)  
CREATE POLICY "Allow service role access" ON chiba_knowledge
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users (optional)
CREATE POLICY "Allow authenticated read access" ON chiba_knowledge
FOR SELECT 
TO authenticated
USING (true);
```

**実行後：** ✅ 「Success. No rows returned」が1-3回表示されればOK

**⚠️ 1回だけしか表示されない場合：**
これも正常です！Supabaseが複数のSQLステートメントを一括処理したためです。

**確認方法：** 以下のクエリで設定が正しく適用されているかチェック：

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chiba_knowledge';

-- Check policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'chiba_knowledge';
```

**期待結果：**
- `rowsecurity: true` が表示される
- 2つのpolicyが表示される

## 5. API情報の取得（重要！）

### ステップ 5-1: API設定画面へ移動
1. 左サイドバーから「**Settings**」をクリック
2. 「**API**」をクリック

### ステップ 5-2: 重要な情報をコピー・保存
**以下の2つの値を必ずメモしてください：**

1. **Project URL**
   - 例：`https://abcdefghijklmnop.supabase.co`
   - 右側の📋アイコンをクリックしてコピー

2. **service_role key**（秘密鍵）
   - 👁️アイコンをクリックして表示
   - 右側の📋アイコンをクリックしてコピー
   - ⚠️ **絶対に他人に教えないでください**

### ステップ 5-3: 環境変数ファイル作成
**プロジェクトフォルダで以下のファイルを作成：**

ファイル名：`.env`

```bash
# Supabase Configuration
SUPABASE_URL=https://あなたのProject URLをここに貼り付け
SUPABASE_SERVICE_KEY=あなたのservice_role keyをここに貼り付け

# 既存の環境変数も含める
LINE_CHANNEL_ACCESS_TOKEN=あなたのLINE_TOKEN
LINE_CHANNEL_SECRET=あなたのLINE_SECRET  
GEMINI_API_KEY=あなたのGEMINI_API_KEY
GITHUB_TOKEN=あなたのGITHUB_TOKEN
GITHUB_OWNER=あなたのGITHUB_OWNER
GITHUB_REPO=あなたのGITHUB_REPO
N8N_BASIC_AUTH_PASSWORD=あなたのN8N_PASSWORD
N8N_ENCRYPTION_KEY=あなたのN8N_KEY
```

## 6. セットアップ完了テスト

### ステップ 6-1: テーブル作成確認
**SQL Editorで以下を実行：**

```sql
-- Test: Check if table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chiba_knowledge'
ORDER BY ordinal_position;
```

**期待結果：** 14行のテーブル構造が表示される

### ステップ 6-2: 関数動作確認
**SQL Editorで以下を実行：**

```sql
-- Test: Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%chiba%';
```

**期待結果：** 
- `hybrid_search_chiba` 
- `match_chiba_documents`

の2つの関数が表示される

## ✅ セットアップ完了！

**以下が完了しました：**
- ✅ Supabaseプロジェクト作成
- ✅ pgvector拡張機能有効化  
- ✅ データベーステーブル作成
- ✅ 検索インデックス作成
- ✅ ベクトル検索関数作成
- ✅ ハイブリッド検索関数作成
- ✅ セキュリティ設定
- ✅ API情報取得

## 次のステップ：データ投入

1. `.env`ファイルの環境変数が正しく設定されていることを確認
2. 以下のコマンドでデータ投入開始：

```bash
node scripts/embedding-generator.js --clear
```

このコマンドで710件のデータにembeddingを生成してSupabaseに保存します（約12分かかります）。