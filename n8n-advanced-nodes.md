# n8n 高度なワークフロー構成案

## 現在のシンプル構成の問題点
1. **単純なキーワード検索のみ** - 類義語や部分一致に対応していない
2. **関連度スコアリングなし** - 最適な回答を選択できない
3. **チバスタイル注入なし** - 個性的な返答ができない
4. **エラーハンドリング不足** - API失敗時の対応なし

## 推奨される高度なノード構成

### 1. メインフロー
```
LINE Webhook
    ↓
[挨拶判定] → 挨拶専用返信
    ↓
[クエリ分析・類義語展開]
    ↓
[複数検索戦略]
    ├→ 完全一致検索
    ├→ AND検索
    ├→ OR検索
    └→ 類義語検索
    ↓
[結果統合・スコアリング]
    ↓
[Gemini API呼び出し]
    ↓
[チバスタイル注入]（カスタムノード）
    ↓
[LINE返信]
```

### 2. 追加すべきノード

#### A. クエリ分析ノード（Code Node）
```javascript
// 類義語展開とクエリ正規化
const SYNONYMS = {
  'ナンパ': ['声かけ', 'アプローチ', 'ストナン'],
  '女性': ['女', '女の子', '女子'],
  // ... 他の類義語
};

// クエリを分析して類義語を展開
function expandQuery(query) {
  let expanded = [query];
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (query.includes(key)) {
      synonyms.forEach(syn => {
        expanded.push(query.replace(key, syn));
      });
    }
  }
  return expanded;
}
```

#### B. 高度なCSV検索ノード（Code Node）
```javascript
// N-gramマッチングと関連度スコアリング
function searchWithScore(data, queries) {
  const results = [];
  
  data.forEach(row => {
    let score = 0;
    queries.forEach(query => {
      // タイトルマッチ（高スコア）
      if (row.title?.includes(query)) score += 10;
      // キーワードマッチ（中スコア）
      if (row.keywords?.includes(query)) score += 5;
      // コンテンツマッチ（低スコア）
      if (row.content?.includes(query)) score += 1;
    });
    
    if (score > 0) {
      results.push({ ...row, score });
    }
  });
  
  // スコア順にソート
  return results.sort((a, b) => b.score - a.score);
}
```

#### C. エラーハンドリングフロー
```
各APIノード
    ↓
[Error Trigger]
    ↓
[フォールバック処理]
    ↓
[エラーメッセージ返信]
```

### 3. カスタムノード活用
- **ChibaStyleNode** - すでに作成済み
- **日本語解析ノード** - kuromoji統合（新規作成）
- **ベクトル検索ノード** - Supabase統合（オプション）

## 実装の選択肢

### オプション1: シンプルなまま（現状維持）
**メリット**：
- 保守が簡単
- 動作が安定
- デバッグしやすい

**デメリット**：
- 検索精度が低い
- 個性的な返答ができない

### オプション2: 中間的な改善
- クエリ分析ノード追加
- スコアリング機能追加
- エラーハンドリング追加

### オプション3: フル機能実装
- webhook-server.jsの全機能をn8nで再現
- カスタムノード多用
- 複雑だが高機能

## 推奨案
**オプション2（中間的な改善）**がバランスが良い：
- 検索精度の向上
- 適度な複雑さ
- n8nの利点を活かせる