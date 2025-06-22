const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

/**
 * n8n CSDS統合ワークフローデプロイスクリプト
 */
class CSDSWorkflowDeployer {
  constructor() {
    this.n8nUrl = process.env.N8N_URL || 'http://localhost:5678';
    this.n8nApiKey = process.env.N8N_API_KEY;
    this.n8nUsername = process.env.N8N_USERNAME || 'admin';
    this.n8nPassword = process.env.N8N_BASIC_AUTH_PASSWORD;
  }

  async deployWorkflow() {
    try {
      console.log('🚀 CSDS統合ワークフローのデプロイを開始します...\n');

      // ワークフローファイルを読み込む
      const workflowPath = path.join(__dirname, '../n8n-workflow-csds.json');
      const workflowContent = await fs.readFile(workflowPath, 'utf-8');
      const workflow = JSON.parse(workflowContent);

      // カスタムノードのチェック
      console.log('📦 カスタムノードの準備...');
      await this.prepareCustomNodes();

      // 環境変数のチェック
      console.log('\n🔍 環境変数をチェック中...');
      this.checkEnvironmentVariables();

      // n8nへの接続テスト
      console.log('\n🔗 n8nへの接続をテスト中...');
      await this.testConnection();

      // 既存のワークフローをチェック
      console.log('\n📋 既存のワークフローをチェック中...');
      const existingWorkflow = await this.findExistingWorkflow(workflow.name);

      if (existingWorkflow) {
        console.log('⚠️  同名のワークフローが見つかりました。更新しますか？');
        // 実際の実装では、ユーザーに確認を求める
        await this.updateWorkflow(existingWorkflow.id, workflow);
      } else {
        await this.createWorkflow(workflow);
      }

      console.log('\n✅ ワークフローのデプロイが完了しました！');
      console.log('\n📊 次のステップ:');
      console.log('1. n8n管理画面でワークフローを確認');
      console.log('2. LINE Webhook URLを設定');
      console.log('3. ワークフローをアクティブ化');
      console.log('4. テストメッセージを送信');

    } catch (error) {
      console.error('\n❌ デプロイエラー:', error.message);
      process.exit(1);
    }
  }

  async prepareCustomNodes() {
    // カスタムノードをn8nのカスタムノードディレクトリにコピー
    const customNodePath = path.join(__dirname, '../n8n-nodes/ChibaStyleNode.js');
    const n8nCustomPath = path.join(process.env.HOME, '.n8n/custom');
    
    try {
      await fs.mkdir(n8nCustomPath, { recursive: true });
      await fs.copyFile(
        customNodePath,
        path.join(n8nCustomPath, 'ChibaStyleNode.node.js')
      );
      console.log('✅ カスタムノードをインストールしました');
    } catch (error) {
      console.log('⚠️  カスタムノードのインストールをスキップ（手動で設定してください）');
    }
  }

  checkEnvironmentVariables() {
    const required = [
      'LINE_CHANNEL_ACCESS_TOKEN',
      'LINE_CHANNEL_SECRET',
      'GEMINI_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.log('⚠️  以下の環境変数が設定されていません:');
      missing.forEach(key => console.log(`   - ${key}`));
      console.log('\n💡 ヒント: .envファイルまたはRailway環境変数で設定してください');
    } else {
      console.log('✅ すべての必要な環境変数が設定されています');
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.n8nUrl}/api/v1/workflows`, {
        auth: {
          username: this.n8nUsername,
          password: this.n8nPassword
        }
      });
      console.log('✅ n8nへの接続に成功しました');
    } catch (error) {
      throw new Error(`n8nへの接続に失敗しました: ${error.message}`);
    }
  }

  async findExistingWorkflow(name) {
    try {
      const response = await axios.get(`${this.n8nUrl}/api/v1/workflows`, {
        auth: {
          username: this.n8nUsername,
          password: this.n8nPassword
        }
      });
      
      return response.data.data.find(w => w.name === name);
    } catch (error) {
      console.log('⚠️  既存のワークフローチェックをスキップ');
      return null;
    }
  }

  async createWorkflow(workflow) {
    console.log('\n📝 新しいワークフローを作成中...');
    
    try {
      const response = await axios.post(
        `${this.n8nUrl}/api/v1/workflows`,
        workflow,
        {
          auth: {
            username: this.n8nUsername,
            password: this.n8nPassword
          }
        }
      );
      
      console.log('✅ ワークフローが作成されました');
      console.log(`   ID: ${response.data.data.id}`);
      console.log(`   名前: ${response.data.data.name}`);
    } catch (error) {
      console.log('⚠️  API経由の作成に失敗しました。手動でインポートしてください。');
      
      // ワークフローファイルの場所を表示
      const workflowPath = path.join(__dirname, '../n8n-workflow-csds.json');
      console.log(`\n📁 ワークフローファイル: ${workflowPath}`);
      console.log('💡 n8n管理画面から「Import from File」でインポートできます');
    }
  }

  async updateWorkflow(id, workflow) {
    console.log('\n🔄 既存のワークフローを更新中...');
    
    try {
      workflow.id = id;
      const response = await axios.patch(
        `${this.n8nUrl}/api/v1/workflows/${id}`,
        workflow,
        {
          auth: {
            username: this.n8nUsername,
            password: this.n8nPassword
          }
        }
      );
      
      console.log('✅ ワークフローが更新されました');
    } catch (error) {
      console.log('⚠️  API経由の更新に失敗しました。手動で更新してください。');
    }
  }

  // パフォーマンステスト
  async testPerformance() {
    console.log('\n🧪 パフォーマンステストを実行中...');
    
    const testCases = [
      { message: 'こんにちは', expectedType: 'greeting' },
      { message: 'ナンパがうまくいきません', expectedType: 'consultation' },
      { message: 'デートの誘い方は？', expectedType: 'question' }
    ];

    for (const testCase of testCases) {
      console.log(`\n📝 テスト: "${testCase.message}"`);
      
      // ここで実際のワークフロー実行をトリガー
      // 実装は環境に依存
      
      console.log(`   期待される型: ${testCase.expectedType}`);
      console.log(`   結果: [テスト実装待ち]`);
    }
  }
}

// メイン実行
async function main() {
  const deployer = new CSDSWorkflowDeployer();
  await deployer.deployWorkflow();
  
  // オプション: パフォーマンステスト
  if (process.argv.includes('--test')) {
    await deployer.testPerformance();
  }
}

if (require.main === module) {
  main();
}

module.exports = CSDSWorkflowDeployer;