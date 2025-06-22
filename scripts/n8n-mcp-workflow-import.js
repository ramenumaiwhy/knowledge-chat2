const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * n8n MCPワークフローインポートスクリプト
 * n8n APIを使用してワークフローを自動的にインポート・有効化
 */

async function importWorkflowViaMCP() {
  try {
    // 環境変数から設定を取得
    const n8nUrl = process.env.N8N_URL || 'http://localhost:5678';
    const apiKey = process.env.N8N_API_KEY;
    const username = process.env.N8N_BASIC_AUTH_USER || 'admin';
    const password = process.env.N8N_BASIC_AUTH_PASSWORD;

    if (!apiKey && !password) {
      console.error('❌ N8N_API_KEY または N8N_BASIC_AUTH_PASSWORD が設定されていません');
      process.exit(1);
    }

    console.log('🔧 n8n ワークフローインポート開始...');
    console.log(`📍 n8n URL: ${n8nUrl}`);

    // ワークフローファイルを読み込み
    const workflowPath = path.join(__dirname, '..', 'n8n-workflow-full.json');
    const workflowData = await fs.readFile(workflowPath, 'utf8');
    const workflow = JSON.parse(workflowData);

    // 認証ヘッダーを準備
    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['X-N8N-API-KEY'] = apiKey;
    } else {
      // Basic認証を使用
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    // 既存のワークフローを確認
    console.log('📋 既存のワークフローを確認中...');
    try {
      const listResponse = await axios.get(`${n8nUrl}/api/v1/workflows`, { headers });
      const existingWorkflows = listResponse.data.data;
      
      // 同名のワークフローがあるか確認
      const existing = existingWorkflows.find(w => w.name === workflow.name);
      if (existing) {
        console.log(`⚠️  同名のワークフロー "${workflow.name}" が既に存在します`);
        console.log(`   ID: ${existing.id}, Active: ${existing.active}`);
        
        // 既存のワークフローを更新
        console.log('🔄 既存のワークフローを更新中...');
        await axios.put(
          `${n8nUrl}/api/v1/workflows/${existing.id}`,
          {
            ...workflow,
            id: existing.id,
            active: true
          },
          { headers }
        );
        console.log('✅ ワークフローを更新して有効化しました');
        return;
      }
    } catch (error) {
      console.log('📝 新規ワークフローとしてインポートします');
    }

    // ワークフローをインポート
    console.log('📤 ワークフローをインポート中...');
    const response = await axios.post(
      `${n8nUrl}/api/v1/workflows`,
      workflow,
      { headers }
    );

    const workflowId = response.data.id;
    console.log(`✅ ワークフローをインポートしました (ID: ${workflowId})`);

    // ワークフローを有効化
    console.log('🚀 ワークフローを有効化中...');
    await axios.patch(
      `${n8nUrl}/api/v1/workflows/${workflowId}`,
      { active: true },
      { headers }
    );

    console.log('✅ ワークフローを有効化しました');
    console.log('');
    console.log('📱 LINE Webhook URL:');
    console.log(`   ${n8nUrl}/webhook/line-csds-full`);
    console.log('');
    console.log('🧪 テスト方法:');
    console.log('   1. LINE Developers ConsoleでWebhook URLを更新');
    console.log('   2. Webhook検証を実行');
    console.log('   3. LINEアプリからメッセージを送信');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('レスポンスデータ:', error.response.data);
      console.error('ステータスコード:', error.response.status);
    }
    process.exit(1);
  }
}

// Railway環境での使用を想定
if (require.main === module) {
  // 環境変数の確認
  console.log('🔍 環境変数チェック:');
  console.log(`   N8N_URL: ${process.env.N8N_URL || '未設定（デフォルト: http://localhost:5678）'}`);
  console.log(`   N8N_API_KEY: ${process.env.N8N_API_KEY ? '設定済み' : '未設定'}`);
  console.log(`   N8N_BASIC_AUTH_PASSWORD: ${process.env.N8N_BASIC_AUTH_PASSWORD ? '設定済み' : '未設定'}`);
  console.log('');

  importWorkflowViaMCP();
}

module.exports = { importWorkflowViaMCP };