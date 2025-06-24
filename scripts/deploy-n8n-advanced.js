const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

/**
 * n8n Advanced Workflow デプロイスクリプト
 * Supabaseベクトル検索とStyle DNA統合を含む高度なワークフローをデプロイ
 */

class N8nAdvancedDeployer {
  constructor() {
    // Railway環境変数から取得
    this.n8nUrl = process.env.N8N_URL || 'https://your-n8n.railway.app';
    this.n8nApiKey = process.env.N8N_API_KEY;
    this.n8nUser = process.env.N8N_USER || 'admin';
    this.n8nPassword = process.env.N8N_PASSWORD;
    
    // 必要な環境変数
    this.requiredEnvVars = [
      'LINE_CHANNEL_ACCESS_TOKEN',
      'LINE_CHANNEL_SECRET',
      'GEMINI_API_KEY',
      'GITHUB_TOKEN',
      'GITHUB_OWNER',
      'GITHUB_REPO',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY'
    ];
  }

  // 環境変数チェック
  checkEnvironment() {
    console.log('🔍 環境変数をチェック中...\n');
    
    const missing = [];
    this.requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
        console.log(`❌ ${varName}: 未設定`);
      } else {
        console.log(`✅ ${varName}: 設定済み`);
      }
    });
    
    if (missing.length > 0) {
      throw new Error(`\n以下の環境変数が設定されていません:\n${missing.join('\n')}`);
    }
    
    console.log('\n✅ すべての環境変数が設定されています');
  }

  // n8n認証トークン取得
  async getAuthToken() {
    try {
      // API Keyがある場合はそれを使用
      if (this.n8nApiKey) {
        return { 'X-N8N-API-KEY': this.n8nApiKey };
      }
      
      // Basic認証を使用
      const auth = Buffer.from(`${this.n8nUser}:${this.n8nPassword}`).toString('base64');
      return { 'Authorization': `Basic ${auth}` };
    } catch (error) {
      throw new Error('n8n認証に失敗しました: ' + error.message);
    }
  }

  // ワークフロー読み込み
  async loadWorkflow() {
    const workflowPath = path.join(__dirname, '../n8n-advanced-workflow.json');
    const content = await fs.readFile(workflowPath, 'utf-8');
    return JSON.parse(content);
  }

  // Supabase接続テスト
  async testSupabaseConnection() {
    console.log('\n🔗 Supabase接続をテスト中...');
    
    try {
      const response = await axios.post(
        `${process.env.SUPABASE_URL}/rest/v1/rpc/hybrid_search_chiba`,
        {
          query_text: 'test',
          query_embedding: null,
          match_threshold: 0.5,
          match_count: 1
        },
        {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Supabase接続成功');
      return true;
    } catch (error) {
      console.log('⚠️  Supabase接続失敗（ワークフローは続行します）');
      console.log('   エラー:', error.response?.data?.message || error.message);
      return false;
    }
  }

  // ワークフローのデプロイ
  async deployWorkflow(workflow) {
    console.log('\n📤 ワークフローをデプロイ中...');
    
    const headers = await this.getAuthToken();
    headers['Content-Type'] = 'application/json';
    
    try {
      // 既存のワークフローを確認
      const existingWorkflows = await axios.get(
        `${this.n8nUrl}/api/v1/workflows`,
        { headers }
      );
      
      // 同名のワークフローがあるか確認
      const existing = existingWorkflows.data.data.find(
        w => w.name === workflow.name
      );
      
      let response;
      if (existing) {
        console.log(`📝 既存のワークフロー（ID: ${existing.id}）を更新します`);
        response = await axios.put(
          `${this.n8nUrl}/api/v1/workflows/${existing.id}`,
          workflow,
          { headers }
        );
      } else {
        console.log('🆕 新規ワークフローを作成します');
        response = await axios.post(
          `${this.n8nUrl}/api/v1/workflows`,
          workflow,
          { headers }
        );
      }
      
      const workflowId = response.data.data.id;
      console.log(`✅ ワークフローデプロイ成功（ID: ${workflowId}）`);
      
      // ワークフローをアクティブ化
      await this.activateWorkflow(workflowId, headers);
      
      return workflowId;
    } catch (error) {
      throw new Error(`ワークフローデプロイ失敗: ${error.response?.data?.message || error.message}`);
    }
  }

  // ワークフローをアクティブ化
  async activateWorkflow(workflowId, headers) {
    console.log('\n🚀 ワークフローをアクティブ化中...');
    
    try {
      await axios.patch(
        `${this.n8nUrl}/api/v1/workflows/${workflowId}`,
        { active: true },
        { headers }
      );
      
      console.log('✅ ワークフローがアクティブになりました');
    } catch (error) {
      console.log('⚠️  ワークフローのアクティブ化に失敗:', error.message);
    }
  }

  // Webhook URLを生成
  generateWebhookUrl(workflowId) {
    // n8nのWebhook URLフォーマット
    const webhookPath = 'line-webhook';
    const webhookUrl = `${this.n8nUrl}/webhook/${webhookPath}`;
    
    console.log('\n📌 Webhook URL:');
    console.log(`   ${webhookUrl}`);
    console.log('\n   このURLをLINE Developersコンソールに設定してください');
    
    return webhookUrl;
  }

  // デプロイ後の設定ガイド
  showPostDeployGuide() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 デプロイ後の設定手順\n');
    
    console.log('1. LINE Developers Console での設定:');
    console.log('   - Messaging API設定 → Webhook URLに上記URLを設定');
    console.log('   - Webhookの利用をONに設定');
    console.log('   - 応答メッセージをOFFに設定\n');
    
    console.log('2. n8n管理画面での確認:');
    console.log(`   - ${this.n8nUrl} にアクセス`);
    console.log('   - ワークフローが正常に動作しているか確認');
    console.log('   - 実行履歴でエラーがないか確認\n');
    
    console.log('3. 動作テスト:');
    console.log('   - LINE公式アカウントに「こんにちは」と送信');
    console.log('   - チバからの返信が来ることを確認');
    console.log('   - 「ナンパのコツ」など具体的な質問をテスト\n');
    
    console.log('4. トラブルシューティング:');
    console.log('   - n8nの実行履歴でエラーを確認');
    console.log('   - Railway logsでn8nコンテナのログを確認');
    console.log('   - 環境変数が正しく設定されているか再確認');
    
    console.log('\n' + '='.repeat(60));
  }

  // メイン実行
  async deploy() {
    try {
      console.log('🚀 n8n Advanced Workflow デプロイを開始します\n');
      
      // 環境変数チェック
      this.checkEnvironment();
      
      // Supabase接続テスト
      await this.testSupabaseConnection();
      
      // ワークフロー読み込み
      const workflow = await this.loadWorkflow();
      console.log(`\n📄 ワークフロー「${workflow.name}」を読み込みました`);
      
      // デプロイ実行
      const workflowId = await this.deployWorkflow(workflow);
      
      // Webhook URL生成
      this.generateWebhookUrl(workflowId);
      
      // 設定ガイド表示
      this.showPostDeployGuide();
      
      console.log('\n✅ デプロイが完了しました！');
      
    } catch (error) {
      console.error('\n❌ デプロイ失敗:', error.message);
      process.exit(1);
    }
  }
}

// Railway環境変数の設定例を表示
function showEnvExample() {
  console.log('\n📝 Railway環境変数の設定例:\n');
  console.log('N8N_URL=https://your-n8n-app.railway.app');
  console.log('N8N_PASSWORD=your-n8n-password');
  console.log('LINE_CHANNEL_ACCESS_TOKEN=your-line-token');
  console.log('LINE_CHANNEL_SECRET=your-line-secret');
  console.log('GEMINI_API_KEY=your-gemini-api-key');
  console.log('GITHUB_TOKEN=your-github-token');
  console.log('GITHUB_OWNER=your-github-username');
  console.log('GITHUB_REPO=your-repo-name');
  console.log('SUPABASE_URL=https://your-project.supabase.co');
  console.log('SUPABASE_SERVICE_KEY=your-service-key\n');
}

// 実行
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('使用方法: node scripts/deploy-n8n-advanced.js [options]\n');
    console.log('Options:');
    console.log('  --help     このヘルプを表示');
    console.log('  --env      環境変数の設定例を表示');
    return;
  }
  
  if (args.includes('--env')) {
    showEnvExample();
    return;
  }
  
  const deployer = new N8nAdvancedDeployer();
  deployer.deploy();
}

module.exports = N8nAdvancedDeployer;