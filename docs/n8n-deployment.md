# n8n デプロイメントガイド 2025

## 📋 概要

このガイドは、過去の経験と2025年最新のベストプラクティスに基づいた、n8nの本番環境デプロイ手順です。

## 🚀 クイックスタート

### 前提条件

- Docker & Docker Compose
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- ドメイン名とSSL証明書
- Railway/VPSアカウント

## 📦 Phase 1: ローカル環境構築

### 1.1 環境変数設定

```bash
# 環境変数ファイルを作成
cp .env.n8n.template .env

# 重要な値を生成
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "N8N_BASIC_AUTH_PASSWORD=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
```

### 1.2 ローカルでQueue Mode起動

```bash
# Queue Mode用のDocker Composeを起動
docker-compose -f docker-compose.n8n-queue.yml up -d

# ログを確認
docker-compose -f docker-compose.n8n-queue.yml logs -f

# ヘルスチェック
curl http://localhost:5678/healthz
```

### 1.3 カスタムノードのビルド

```bash
# TypeScriptコンパイル
cd n8n-nodes
npm install
npm run build

# Dockerイメージをビルド
cd ..
docker build -f Dockerfile.n8n-optimized -t n8n-custom:latest .
```

### 1.4 ワークフローインポート

```bash
# n8n UIにアクセス
open http://localhost:5678

# ワークフローをインポート
# 1. Settings → Import from File
# 2. n8n-workflow-full.json を選択
# 3. ワークフローを有効化
```

## 🚂 Phase 2: Railway デプロイ

### 2.1 Railway プロジェクト作成

```bash
# Railway CLIインストール
npm install -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init
```

### 2.2 サービス追加

```bash
# PostgreSQL追加
railway add postgresql

# Redis追加
railway add redis

# 環境変数設定
railway variables set N8N_BASIC_AUTH_PASSWORD="$(openssl rand -base64 32)"
railway variables set N8N_ENCRYPTION_KEY="$(openssl rand -hex 32)"
```

### 2.3 Railway用Dockerfileでデプロイ

```bash
# Railwayにデプロイ
railway up -d --dockerfile Dockerfile.n8n-railway

# ログ確認
railway logs -f

# URLを取得
railway open
```

### 2.4 環境変数の確認

Railway管理画面で以下を設定：

- `N8N_WEBHOOK_BASE_URL`: `https://${RAILWAY_PUBLIC_DOMAIN}`
- `DATABASE_URL`: PostgreSQLのURL（自動設定）
- `REDIS_URL`: RedisのURL（自動設定）

## 🔒 Phase 3: セキュリティ設定

### 3.1 SSL証明書の取得

```bash
# Certbot実行
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d n8n.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

### 3.2 Nginx設定更新

```bash
# ドメインを置換
sed -i 's/n8n.yourdomain.com/your-actual-domain.com/g' nginx/conf.d/n8n-ssl.conf

# Nginx再起動
docker-compose restart nginx
```

### 3.3 ファイアウォール設定

```bash
# UFW設定（Ubuntu/Debian）
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## 🔄 Phase 4: カナリアデプロイ

### 4.1 トラフィック分割開始

```bash
# トラフィックスプリッターを起動
node scripts/traffic-splitter.js &

# 初期設定（10%をn8nへ）
curl -X POST http://localhost:3002/canary/percentage \
  -H "Content-Type: application/json" \
  -d '{"percentage": 0.1}'
```

### 4.2 メトリクス監視

```bash
# Prometheusメトリクス確認
curl http://localhost:9090/metrics

# Grafanaダッシュボード
open http://localhost:3001
```

### 4.3 段階的増加

```bash
# 25%に増加
curl -X POST http://localhost:3002/canary/percentage \
  -H "Content-Type: application/json" \
  -d '{"percentage": 0.25}'

# 50%に増加（1日後）
curl -X POST http://localhost:3002/canary/percentage \
  -H "Content-Type: application/json" \
  -d '{"percentage": 0.5}'

# 100%に移行（問題なければ）
curl -X POST http://localhost:3002/canary/percentage \
  -H "Content-Type: application/json" \
  -d '{"percentage": 1.0}'
```

## 📊 Phase 5: モニタリング設定

### 5.1 アラート設定

```yaml
# monitoring/alerts/n8n-alerts.yml
groups:
  - name: n8n
    rules:
      - alert: HighErrorRate
        expr: rate(n8n_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: LowChibaScore
        expr: avg(chiba_style_score) < 50
        for: 10m
        annotations:
          summary: "Chiba style score below threshold"
```

### 5.2 バックアップ設定

```bash
# バックアップスクリプト
cat > scripts/backup-n8n.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/n8n"

# PostgreSQL backup
docker exec n8n-postgres pg_dump -U n8n n8n > $BACKUP_DIR/postgres_$DATE.sql

# Workflows backup
docker exec n8n-main n8n export:workflow --all --output=$BACKUP_DIR/workflows_$DATE.json

# Credentials backup
docker exec n8n-main n8n export:credentials --all --output=$BACKUP_DIR/credentials_$DATE.json
EOF

chmod +x scripts/backup-n8n.sh

# Cronジョブ設定
echo "0 2 * * * /path/to/scripts/backup-n8n.sh" | crontab -
```

## 🚨 トラブルシューティング

### 問題: Railwayヘルスチェック失敗

```bash
# ヘルスチェックタイムアウトを延長
railway variables set RAILWAY_HEALTHCHECK_TIMEOUT=300

# 再デプロイ
railway up
```

### 問題: カスタムノード認識されない

```bash
# ノードディレクトリ確認
docker exec n8n-main ls -la /home/node/.n8n/nodes/custom/

# n8n再起動
docker-compose restart n8n-main
```

### 問題: 高いエラー率

```bash
# 自動ロールバック
curl -X POST http://localhost:3002/canary/rollback

# ログ確認
docker-compose logs -f n8n-main | grep ERROR
```

## ✅ デプロイチェックリスト

### 事前準備
- [ ] 環境変数設定完了
- [ ] SSL証明書取得
- [ ] バックアップ設定
- [ ] モニタリング設定

### デプロイ時
- [ ] ローカルテスト合格
- [ ] Railway環境変数設定
- [ ] ヘルスチェック通過
- [ ] ワークフロー動作確認

### デプロイ後
- [ ] LINE Webhook更新
- [ ] メトリクス監視開始
- [ ] エラー率確認
- [ ] CSDSスコア確認

## 📈 パフォーマンスチューニング

### PostgreSQL最適化

```sql
-- 接続プール設定
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
SELECT pg_reload_conf();
```

### Redis最適化

```bash
# redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### n8n最適化

```bash
# 環境変数追加
N8N_CONCURRENCY_PRODUCTION_LIMIT=100
EXECUTIONS_DATA_PRUNE_MAX_COUNT=10000
NODE_OPTIONS="--max-old-space-size=4096"
```

## 🎯 成功の指標

### 技術指標
- ヘルスチェック成功率: 99.9%+
- 平均応答時間: < 2秒
- エラー率: < 1%
- CSDSスコア: 75+

### ビジネス指標
- ユーザー満足度: 90%+
- 処理可能リクエスト: 220/秒
- 月額コスト: $5-20

## 🆘 サポート

問題が発生した場合：

1. ログを確認: `docker-compose logs -f`
2. メトリクスを確認: Grafanaダッシュボード
3. ドキュメントを参照: [n8n公式ドキュメント](https://docs.n8n.io)
4. コミュニティフォーラム: [n8n Community](https://community.n8n.io)

---

このガイドに従って段階的にデプロイを進めることで、安定したn8n環境を構築できます。