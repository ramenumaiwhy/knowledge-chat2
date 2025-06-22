#!/usr/bin/env node

/**
 * シンプルなワークフローをインポートして動作確認
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const N8N_URL = 'http://localhost:5678';
const API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzQ4NjQxZi1lZDViLTQ5MmEtYmRiNC0wYmMzMmU2ZDc2NTciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUwNTk0OTg5fQ.viSmiI2FTrPorS4xH4bYz4i2-EuKUSUx7qimONNMY-k';

async function importSimpleWorkflow() {
  try {
    console.log('📥 シンプルなワークフローをインポート中...');
    
    // ワークフローファイルを読み込み
    const workflowPath = path.join(__dirname, '..', 'n8n-workflow-simple.json');
    const workflowData = JSON.parse(await fs.readFile(workflowPath, 'utf-8'));
    
    // APIでインポート
    const response = await axios.post(`${N8N_URL}/api/v1/workflows`, 
      workflowData,
      {
        headers: {
          'X-N8N-API-KEY': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ ワークフローをインポートしました (ID: ${response.data.id})`);
    console.log('\n📍 n8n UIでワークフローを確認してください:');
    console.log(`   http://localhost:5678/workflow/${response.data.id}`);
    console.log('\n⚡ このワークフローを有効化してテスト:');
    console.log(`   curl -X POST http://localhost:5678/webhook/line-webhook-test \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"events":[{"message":{"text":"テスト"}}]}'`);
    
  } catch (error) {
    console.error('❌ エラー:', error.response?.data || error.message);
  }
}

importSimpleWorkflow();