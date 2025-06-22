#!/usr/bin/env node

/**
 * n8n APIを使用したワークフローインポートスクリプト
 * 事前にn8n UIでAPIキーを生成する必要があります
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const N8N_URL = 'http://localhost:5678';

class N8nApiImport {
  constructor() {
    this.apiKey = null;
    this.workflowId = null;
  }

  // ユーザー入力を取得
  async getUserInput(prompt) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  // APIキーの取得
  async getApiKey() {
    // 環境変数から取得を試みる
    if (process.env.N8N_API_KEY) {
      this.apiKey = process.env.N8N_API_KEY;
      console.log('✅ 環境変数からAPIキーを取得しました');
      return this.apiKey;
    }

    // .env.n8nファイルから取得を試みる
    try {
      const envPath = path.join(__dirname, '..', '.env.n8n');
      const envContent = await fs.readFile(envPath, 'utf-8');
      const match = envContent.match(/N8N_API_KEY=(.+)/);
      if (match && match[1]) {
        this.apiKey = match[1].trim();
        console.log('✅ .env.n8nからAPIキーを取得しました');
        return this.apiKey;
      }
    } catch (error) {
      // ファイルが存在しない場合は無視
    }

    // ユーザーに入力を求める
    console.log('\n📝 n8n APIキーが必要です');
    console.log('   n8n UI → Settings → API Keys で生成してください');
    console.log('   URL: http://localhost:5678/settings/api-keys\n');
    
    this.apiKey = await this.getUserInput('APIキーを入力してください: ');
    
    // 保存するか確認
    const save = await this.getUserInput('このAPIキーを保存しますか？ (y/n): ');
    if (save.toLowerCase() === 'y') {
      await this.saveApiKey();
    }
    
    return this.apiKey;
  }

  // APIキーを保存
  async saveApiKey() {
    const envPath = path.join(__dirname, '..', '.env.n8n');
    const envContent = `N8N_API_KEY=${this.apiKey}\n`;
    await fs.writeFile(envPath, envContent);
    console.log('✅ APIキーを .env.n8n に保存しました');
  }

  // ワークフローの存在確認
  async checkExistingWorkflow() {
    try {
      const response = await axios.get(`${N8N_URL}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': this.apiKey
        }
      });

      const workflows = response.data.data || [];
      const existing = workflows.find(w => w.name === 'LINE Chatbot with CSDS Enhanced');
      
      if (existing) {
        console.log(`⚠️  同名のワークフローが既に存在します (ID: ${existing.id})`);
        const overwrite = await this.getUserInput('上書きしますか？ (y/n): ');
        
        if (overwrite.toLowerCase() === 'y') {
          await this.deleteWorkflow(existing.id);
          return null;
        } else {
          return existing.id;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ ワークフロー一覧の取得に失敗:', error.message);
      return null;
    }
  }

  // ワークフローの削除
  async deleteWorkflow(workflowId) {
    try {
      await axios.delete(`${N8N_URL}/api/v1/workflows/${workflowId}`, {
        headers: {
          'X-N8N-API-KEY': this.apiKey
        }
      });
      console.log('✅ 既存のワークフローを削除しました');
    } catch (error) {
      console.error('❌ ワークフローの削除に失敗:', error.message);
    }
  }

  // ワークフローのインポート
  async importWorkflow() {
    console.log('\n📥 ワークフローをインポート中...');
    
    try {
      // ワークフローファイルを読み込み
      const workflowPath = path.join(__dirname, '..', 'n8n-workflow-csds.json');
      const workflowData = JSON.parse(await fs.readFile(workflowPath, 'utf-8'));
      
      // APIで送信する前に不要なフィールドを削除
      delete workflowData.active;
      delete workflowData.id;
      delete workflowData.tags;
      
      // ノードの型を修正（カスタムノード用）
      workflowData.nodes = workflowData.nodes.map(node => {
        // 不要なプロパティを削除
        delete node.id;
        delete node.onError;
        delete node.executeOnError;
        
        if (node.type === 'chibaStyle') {
          node.type = 'n8n-nodes-custom.chibaStyleDNA';
        }
        return node;
      });
      
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
      console.error('❌ ワークフローのインポートに失敗:', error.response?.data || error.message);
      
      // カスタムノードのエラーの場合
      if (error.response?.data?.message?.includes('node type')) {
        console.log('\n⚠️  カスタムノードが認識されていない可能性があります');
        console.log('   以下を確認してください:');
        console.log('   1. docker exec n8n-csds ls -la /home/node/.n8n/nodes/custom/');
        console.log('   2. docker-compose restart n8n');
      }
      
      throw error;
    }
  }

  // ワークフローの有効化
  async activateWorkflow() {
    if (!this.workflowId) {
      console.error('❌ ワークフローIDが設定されていません');
      return;
    }
    
    console.log('\n🚀 ワークフローを有効化中...');
    
    try {
      const response = await axios.put(`${N8N_URL}/api/v1/workflows/${this.workflowId}`, 
        { active: true },
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ ワークフローを有効化しました');
      
      // Webhook URLを表示
      const webhookNode = response.data.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
      if (webhookNode) {
        console.log(`\n📍 Webhook URLs:`);
        console.log(`   Production: ${N8N_URL}/webhook/${webhookNode.webhookId || 'line-webhook-csds'}`);
        console.log(`   Test: ${N8N_URL}/webhook-test/${webhookNode.webhookId || 'line-webhook-csds'}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ ワークフローの有効化に失敗:', error.response?.data || error.message);
      throw error;
    }
  }

  // ワークフローのテスト
  async testWorkflow() {
    console.log('\n🧪 ワークフローのテスト...');
    
    const testMessage = {
      events: [{
        type: 'message',
        message: {
          type: 'text',
          text: 'こんにちは'
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
        console.log('   レスポンス:', response.data);
      }
    } catch (error) {
      console.error('❌ テスト実行エラー:', error.message);
    }
  }

  // メイン実行
  async run() {
    try {
      console.log('🚀 n8n ワークフローインポート\n');
      
      // 1. APIキーの取得
      await this.getApiKey();
      
      // 2. 既存ワークフローの確認
      const existingId = await this.checkExistingWorkflow();
      if (existingId) {
        this.workflowId = existingId;
        console.log(`\n既存のワークフロー (ID: ${existingId}) を使用します`);
      } else {
        // 3. ワークフローのインポート
        await this.importWorkflow();
      }
      
      // 4. ワークフローの有効化
      await this.activateWorkflow();
      
      // 5. テスト実行
      const runTest = await this.getUserInput('\nテストを実行しますか？ (y/n): ');
      if (runTest.toLowerCase() === 'y') {
        await this.testWorkflow();
      }
      
      console.log('\n✅ 完了！');
      console.log('\n📋 次のステップ:');
      console.log('1. n8n UI で動作確認: http://localhost:5678');
      console.log('2. 包括的テスト: ./test-n8n-webhook.sh');
      console.log('3. LINE Webhook URLの設定');
      
    } catch (error) {
      console.error('\n❌ エラーが発生しました:', error.message);
      process.exit(1);
    }
  }
}

// 実行
if (require.main === module) {
  const importer = new N8nApiImport();
  importer.run();
}