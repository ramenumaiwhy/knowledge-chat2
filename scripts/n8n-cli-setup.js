#!/usr/bin/env node

/**
 * n8n自動セットアップスクリプト
 * APIを使用してワークフローのインポートと設定を行う
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const N8N_URL = 'http://localhost:5678';
const BASIC_AUTH = {
  username: 'admin',
  password: 'password'
};

class N8nCliSetup {
  constructor() {
    this.apiKey = null;
    this.workflowId = null;
  }

  // n8nの起動を待機
  async waitForN8n(maxRetries = 30) {
    console.log('⏳ n8nの起動を待機中...');
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // ヘルスチェックエンドポイントの代わりにホームページをチェック
        const response = await axios.get(`${N8N_URL}/`, {
          validateStatus: () => true,
          timeout: 5000
        });
        
        if (response.status === 200) {
          console.log('✅ n8nが起動しました');
          return true;
        }
      } catch (error) {
        // 接続エラーは無視
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      process.stdout.write('.');
    }
    
    throw new Error('n8nの起動がタイムアウトしました');
  }

  // 初期ユーザー作成（初回のみ）
  async createInitialUser() {
    console.log('👤 初期セットアップ確認中...');
    
    try {
      // n8nの初期設定状態を確認
      const response = await axios.get(`${N8N_URL}/api/v1/credentials`, {
        auth: BASIC_AUTH,
        validateStatus: () => true
      });
      
      if (response.status === 401) {
        console.log('ℹ️  初期設定が必要です。n8n UIで手動設定してください');
        console.log('   URL: http://localhost:5678');
        console.log('   初回アクセス時にユーザー作成画面が表示されます');
        return null;
      } else if (response.status === 200) {
        console.log('✅ n8nは既に初期設定済みです');
        return true;
      }
    } catch (error) {
      console.log('ℹ️  初期設定の確認をスキップします');
      return null;
    }
  }

  // APIキーの取得または作成
  async getOrCreateApiKey() {
    console.log('🔑 APIキーを取得中...');
    
    try {
      // 既存のAPIキーを確認
      const listResponse = await axios.get(`${N8N_URL}/api/v1/api-keys`, {
        auth: BASIC_AUTH
      });
      
      if (listResponse.data.data && listResponse.data.data.length > 0) {
        // 既存のキーがある場合は最初のものを使用
        const existingKey = listResponse.data.data[0];
        console.log(`ℹ️  既存のAPIキー "${existingKey.label}" を使用します`);
        
        // 既存のキーの値は取得できないため、新しいキーを作成
        console.log('🔑 新しいAPIキーを作成します...');
      }
      
      // 新しいAPIキーを作成
      const createResponse = await axios.post(`${N8N_URL}/api/v1/api-keys`, 
        { label: `CLI Setup ${new Date().toISOString()}` },
        { auth: BASIC_AUTH }
      );
      
      this.apiKey = createResponse.data.apiKey;
      console.log('✅ APIキーを作成しました');
      
      // 環境変数ファイルに保存
      await this.saveApiKey();
      
      return this.apiKey;
    } catch (error) {
      console.error('❌ APIキーの取得に失敗:', error.response?.data || error.message);
      throw error;
    }
  }

  // APIキーを環境変数ファイルに保存
  async saveApiKey() {
    const envPath = path.join(__dirname, '..', '.env.n8n');
    const envContent = `N8N_API_KEY=${this.apiKey}\n`;
    
    await fs.writeFile(envPath, envContent);
    console.log(`💾 APIキーを ${envPath} に保存しました`);
  }

  // ワークフローのインポート
  async importWorkflow() {
    console.log('📥 ワークフローをインポート中...');
    
    try {
      // ワークフローファイルを読み込み
      const workflowPath = path.join(__dirname, '..', 'n8n-workflow-csds.json');
      const workflowData = JSON.parse(await fs.readFile(workflowPath, 'utf-8'));
      
      // APIでインポート
      const response = await axios.post(`${N8N_URL}/api/v1/workflows`, 
        workflowData,
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      this.workflowId = response.data.id;
      console.log(`✅ ワークフローをインポートしました (ID: ${this.workflowId})`);
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message?.includes('already exists')) {
        console.log('ℹ️  ワークフローは既に存在します');
        // 既存のワークフローを検索
        await this.findExistingWorkflow();
      } else {
        console.error('❌ ワークフローのインポートに失敗:', error.response?.data || error.message);
        throw error;
      }
    }
  }

  // 既存のワークフローを検索
  async findExistingWorkflow() {
    const response = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': this.apiKey
      }
    });
    
    const workflow = response.data.data.find(w => w.name === 'LINE Chatbot with CSDS Enhanced');
    if (workflow) {
      this.workflowId = workflow.id;
      console.log(`📍 既存のワークフローを使用します (ID: ${this.workflowId})`);
    }
  }

  // 環境変数の設定
  async setEnvironmentVariables() {
    console.log('🔧 環境変数を設定中...');
    
    const variables = [
      { key: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY || 'your-gemini-api-key' },
      { key: 'LINE_CHANNEL_ACCESS_TOKEN', value: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'your-line-token' },
      { key: 'LINE_CHANNEL_SECRET', value: process.env.LINE_CHANNEL_SECRET || 'your-line-secret' },
      { key: 'GITHUB_OWNER', value: process.env.GITHUB_OWNER || 'your-github-owner' },
      { key: 'GITHUB_REPO', value: process.env.GITHUB_REPO || 'your-github-repo' },
      { key: 'GITHUB_TOKEN', value: process.env.GITHUB_TOKEN || 'your-github-token' },
      { key: 'NODE_ENV', value: 'development' }
    ];
    
    // 環境変数APIがない場合は、設定ファイルを直接更新する必要がある
    console.log('ℹ️  環境変数は docker-compose.yml で設定されています');
    console.log('   必要に応じて .env ファイルを更新してください');
    
    return true;
  }

  // ワークフローの有効化
  async activateWorkflow() {
    if (!this.workflowId) {
      console.error('❌ ワークフローIDが設定されていません');
      return;
    }
    
    console.log('🚀 ワークフローを有効化中...');
    
    try {
      const response = await axios.patch(`${N8N_URL}/api/v1/workflows/${this.workflowId}`, 
        { active: true },
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ ワークフローを有効化しました');
      console.log(`📍 Webhook URL: ${N8N_URL}/webhook/line-webhook-csds`);
      
      return response.data;
    } catch (error) {
      console.error('❌ ワークフローの有効化に失敗:', error.response?.data || error.message);
      throw error;
    }
  }

  // テスト実行
  async testWorkflow() {
    console.log('\n🧪 ワークフローのテスト実行...');
    
    const testMessage = {
      events: [{
        type: 'message',
        message: {
          type: 'text',
          text: 'こんにちは、テストです'
        },
        replyToken: 'test-reply-token',
        source: {
          userId: 'test-user-id'
        }
      }]
    };
    
    try {
      const response = await axios.post(
        `${N8N_URL}/webhook/line-webhook-csds`,
        testMessage,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          validateStatus: () => true
        }
      );
      
      if (response.status === 200) {
        console.log('✅ Webhookテスト成功');
      } else {
        console.log(`⚠️  Webhookレスポンス: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ テスト実行エラー:', error.message);
    }
  }

  // メイン実行
  async run() {
    try {
      console.log('🚀 n8n自動セットアップを開始します\n');
      
      // 1. n8nの起動を待機
      await this.waitForN8n();
      
      // 2. 初期ユーザー作成（必要な場合）
      await this.createInitialUser();
      
      // 3. APIキーの取得
      await this.getOrCreateApiKey();
      
      // 4. ワークフローのインポート
      await this.importWorkflow();
      
      // 5. 環境変数の設定（情報表示のみ）
      await this.setEnvironmentVariables();
      
      // 6. ワークフローの有効化
      await this.activateWorkflow();
      
      // 7. テスト実行
      await this.testWorkflow();
      
      console.log('\n✅ セットアップが完了しました！');
      console.log('\n📋 次のステップ:');
      console.log('1. n8n UI: http://localhost:5678');
      console.log('2. ログイン: admin@example.com / password');
      console.log('3. Webhook URL:', `${N8N_URL}/webhook/line-webhook-csds`);
      console.log('4. テスト実行: ./test-n8n-webhook.sh');
      
    } catch (error) {
      console.error('\n❌ セットアップ中にエラーが発生しました:', error.message);
      process.exit(1);
    }
  }
}

// 実行
if (require.main === module) {
  const setup = new N8nCliSetup();
  setup.run();
}