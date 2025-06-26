# n8n エラーログノード設定ガイド

## エラーログノードの役割
「CSV取得」や「高度な検索」でエラーが発生した時に、エラー内容を記録して、フォールバック処理に流す役割です。

## 設定方法

### 1. エラーログノードの基本設定
現在の設定で問題ありませんが、以下のオプションがあります：

#### A. シンプルなログ出力（推奨）
```
Level: Warning
Message: 検索エラー: {{ $json.error.message }}
```

#### B. 詳細なメタデータ付き
```
Additional Fields:
- query: {{ $('メッセージ分析').item.json.originalMessage }}
- timestamp: {{ new Date().toISOString() }}
- nodeError: {{ $json.error.name }}
```

### 2. エラートリガーの接続方法

#### 重要：エラー出力の接続
1. **CSV取得ノード**の右側にある小さな設定ボタン（⚙️）をクリック
2. 「Settings」を選択
3. 「On Error」タブを開く
4. 「Continue On Fail」を**オフ**にする
5. エラー出力（赤い線）を「エラーログ」ノードに接続

```
CSV取得
  ├─ 成功 → 高度な検索
  └─ エラー（赤） → エラーログ
```

### 3. エラーログの出力先オプション

#### オプション1: コンソールログのみ（デフォルト）
- 現在の設定で十分
- n8nの実行ログに記録される

#### オプション2: ファイルに保存
エラーログノードの後に「Write Binary File」ノードを追加：
```javascript
// ファイル名
/tmp/n8n-errors-{{ $now.format('yyyy-MM-dd') }}.log

// 内容
{{ $json.message }}
```

#### オプション3: Discordに通知
エラーログノードの後に「HTTP Request」ノードを追加：
```json
{
  "content": "⚠️ エラー発生\n```\n{{ $json.message }}\n```",
  "username": "n8n Error Bot"
}
```

#### オプション4: データベースに記録
「PostgreSQL」ノードを追加して：
```sql
INSERT INTO error_logs (timestamp, message, metadata)
VALUES ($1, $2, $3)
```

### 4. エラーハンドリングフロー

```
CSV取得
  ├─ 成功 → 高度な検索
  └─ エラー → エラーログ
              ├─ ログ記録
              └─ Gemini API (結果なし) へ続行
```

### 5. よくあるエラーと対処

#### GitHubトークンエラー
```
エラー: 401 Unauthorized
対処: GITHUB_TOKENを確認
```

#### CSVパースエラー
```
エラー: Invalid CSV format
対処: CSVファイルの形式を確認
```

#### タイムアウトエラー
```
エラー: Request timeout
対処: HTTPリクエストのタイムアウト値を増やす
```

## 推奨設定

1. **開発時**: コンソールログのみ
2. **本番環境**: Discord/Slack通知 + ファイル保存
3. **分析が必要**: データベース保存

## エラーログノードを削除してもOK？

はい！エラーログノードは**オプション**です。
削除しても、エラー時は自動的に「Gemini API (結果なし)」に流れます。

ただし、エラーログがあると：
- 問題の原因を特定しやすい
- 改善点が見つかる
- ユーザーへの影響を把握できる