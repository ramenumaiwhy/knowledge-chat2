FROM n8nio/n8n:latest

USER root

# 権限の修正
RUN mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node/.n8n && \
    chmod 700 /home/node/.n8n

USER node

# 環境変数の設定
ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=5678
ENV PORT=5678
ENV N8N_PROTOCOL=https
ENV WEBHOOK_URL=$RAILWAY_STATIC_URL
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false

# ポートの公開
EXPOSE 5678

# エントリーポイントを直接指定
ENTRYPOINT ["/usr/local/bin/node", "/usr/local/lib/node_modules/n8n/bin/n8n"]
CMD ["start"]