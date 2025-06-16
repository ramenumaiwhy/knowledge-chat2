# n8n ワークフロー更新ガイド

## 🎯 目標
CSV検索 → Supabase pgvector検索への移行

## 📋 更新手順

### Step 1: n8n管理画面アクセス
1. **Railway Dashboard**にアクセス
2. **知識チャットボット**プロジェクトを選択
3. **Variables**で`N8N_BASIC_AUTH_PASSWORD`を確認
4. **Deployments**から**View Logs**でURLを確認
5. n8n管理画面にアクセス（Basic認証）

### Step 2: 環境変数追加
n8n Settings → Environment Variables に以下を追加：

```bash
SUPABASE_URL=https://qkpasrtfnhcbqjofiukz.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGFzcnRmbmhjYnFqb2ZpdWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA4MDQ2NCwiZXhwIjoyMDY1NjU2NDY0fQ.jef5Y8CW7iKCmyrcZtb8AHN0l9w6DIjsOb0eWAEzXBg
```

### Step 3: 新しいワークフローノード構成

#### 📥 1. LINE Webhook (既存)
- 変更なし

#### 🔍 2. Supabase Vector Search (新規)
**HTTP Request Node**として追加：
- **Method**: POST
- **URL**: `{{$env.SUPABASE_URL}}/rest/v1/rpc/hybrid_search_chiba`
- **Headers**:
  ```json
  {
    "apikey": "{{$env.SUPABASE_SERVICE_KEY}}",
    "Authorization": "Bearer {{$env.SUPABASE_SERVICE_KEY}}",
    "Content-Type": "application/json"
  }
  ```
- **Body**:
  ```json
  {
    "query_text": "{{$node['LINE Webhook'].json.events[0].message.text}}",
    "query_embedding": null,
    "match_threshold": 0.7,
    "match_count": 3
  }
  ```

#### 🤖 3. Gemini Embedding Generation (新規)
**HTTP Request Node**として追加：
- **Method**: POST  
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={{$env.GEMINI_API_KEY}}`
- **Body**:
  ```json
  {
    "model": "models/text-embedding-004",
    "content": {
      "parts": [{"text": "{{$node['LINE Webhook'].json.events[0].message.text}}"}]
    }
  }
  ```

#### 🔄 4. Conditional Logic (新規)
**IF Node**として追加：
- **Condition**: `{{$node['Supabase Vector Search'].json.length}} > 0`
- **True**: Vector検索結果を使用
- **False**: キーワード検索にフォールバック

#### 🧠 5. Enhanced Gemini Response (更新)
**HTTP Request Node**を更新：
- **URL**: 既存のGemini APIエンドポイント
- **Body**を更新:
  ```json
  {
    "contents": [{
      "parts": [{
        "text": "あなたは恋愛コーチの「チバ」です。以下の知識を基に、チバのメルマガスタイルで800-1200文字の詳細な回答を作成してください。\n\n質問: {{$node['LINE Webhook'].json.events[0].message.text}}\n\n参考知識:\n{{$node['Supabase Vector Search'].json.map(item => `タイトル: ${item.title}\n内容: ${item.summary}`).join('\\n---\\n')}}\n\n回答要件:\n- チバの親しみやすい口調\n- 具体的な体験談や例を含める\n- 実践的なアドバイスを提示\n- メルマガのような段階的解説\n- 800-1200文字程度"
      }]
    }],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1000
    }
  }
  ```

#### 📤 6. LINE Reply (既存)
- 基本的に変更なし
- レスポンステキストのソースを新しいGeminiノードに変更

## 🔧 ワークフロー図

```
LINE Webhook
    ↓
Gemini Embedding ← ユーザーメッセージ
    ↓
Supabase Vector Search ← embedding + text
    ↓
IF (結果あり？)
    ↓ Yes              ↓ No
Enhanced Gemini    Fallback Response
    ↓                   ↓
    ← LINE Reply ←  ←  ←
```

## ⚡ 高速化オプション

### Option A: Embedding Skip
初回は embedding なしでキーワード検索のみ：
```json
{
  "query_text": "{{$node['LINE Webhook'].json.events[0].message.text}}",
  "query_embedding": null
}
```

### Option B: Parallel Processing
Embedding生成と初期検索を並行実行

## 🧪 テスト手順

### 1. 基本テスト
- 「ナンパ」→ 関連記事が返ってくるか？
- 「アプローチ」→ 適切なアドバイスか？
- 「チバ」→ 本人の口調で回答するか？

### 2. 品質テスト
- 回答の長さ（800-1200文字）
- チバらしい口調
- 具体的なアドバイス含有

### 3. エラーハンドリングテスト
- Supabase接続エラー
- Gemini API制限
- 検索結果なし

## 🚀 段階的移行

### Phase 1: パラレル運用
- 既存CSV検索 + 新Supabase検索
- 結果比較ログ出力

### Phase 2: 切り替え
- Supabase検索をメインに
- CSV検索をフォールバックに

### Phase 3: 完全移行
- CSV検索削除
- Supabase検索のみ

次のステップ: n8n管理画面での実装開始