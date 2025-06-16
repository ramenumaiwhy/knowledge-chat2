/**
 * MCP統合テストスクリプト
 * Claude Code → MCP Client → n8n → Supabase → Response
 */

class MCPIntegrationTester {
  constructor() {
    this.n8nUrl = process.env.N8N_URL || 'https://your-n8n-instance.railway.app';
    this.mcpToken = process.env.N8N_MCP_SECRET || 'chiba-bot-secret-2024';
  }

  // MCP経由でチバ検索テスト
  async testChibaSearch(query) {
    console.log(`🔍 テスト検索: "${query}"`);
    
    try {
      const response = await fetch(`${this.n8nUrl}/webhook/mcp-chiba`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mcpToken}`
        },
        body: JSON.stringify({
          operation: 'search',
          query: query
        })
      });

      if (!response.ok) {
        throw new Error(`MCP Search Error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ 検索成功: ${result.length || 0}件の結果`);
      
      if (result.length > 0) {
        result.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i+1}. ${item.title.substring(0, 50)}...`);
        });
      }

      return result;
      
    } catch (error) {
      console.error(`❌ 検索エラー: ${error.message}`);
      return [];
    }
  }

  // MCP経由でチバレスポンステスト
  async testChibaResponse(query, context = []) {
    console.log(`🤖 レスポンステスト: "${query}"`);
    
    try {
      const response = await fetch(`${this.n8nUrl}/webhook/mcp-chiba`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mcpToken}`
        },
        body: JSON.stringify({
          operation: 'response',
          query: query,
          context: context
        })
      });

      if (!response.ok) {
        throw new Error(`MCP Response Error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ レスポンス生成成功 (${result.response?.length || 0}文字)`);
      
      if (result.response) {
        console.log(`回答プレビュー: ${result.response.substring(0, 200)}...`);
      }

      return result;
      
    } catch (error) {
      console.error(`❌ レスポンスエラー: ${error.message}`);
      return { response: 'エラーが発生しました' };
    }
  }

  // LINE Webhook直接テスト
  async testLineWebhook(message) {
    console.log(`📱 LINE Webhookテスト: "${message}"`);
    
    const lineEvent = {
      events: [{
        type: 'message',
        replyToken: 'test-reply-token-12345',
        source: {
          type: 'user',
          userId: 'test-user-id'
        },
        message: {
          type: 'text',
          text: message
        }
      }]
    };

    try {
      const response = await fetch(`${this.n8nUrl}/webhook/line-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lineEvent)
      });

      console.log(`📱 LINE Webhook応答: ${response.status}`);
      
      if (response.ok) {
        const result = await response.text();
        console.log(`✅ ワークフロー実行成功`);
        return true;
      } else {
        console.log(`❌ ワークフロー実行失敗`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ LINE Webhookエラー: ${error.message}`);
      return false;
    }
  }

  // 統合テスト実行
  async runIntegrationTests() {
    console.log('🧪 MCP統合テスト開始\\n');
    console.log('='.repeat(60));

    const testCases = [
      'ナンパのコツを教えて',
      'アプローチ方法について',
      '美女を落とすには？',
      'チバさんの体験談',
      '恋愛相談'
    ];

    let successCount = 0;
    let totalTests = 0;

    for (const testCase of testCases) {
      console.log(`\\n📝 テストケース: "${testCase}"`);
      console.log('-'.repeat(40));
      
      try {
        // 1. MCP検索テスト
        const searchResults = await this.testChibaSearch(testCase);
        totalTests++;
        if (searchResults.length > 0) successCount++;

        // 2. MCPレスポンステスト
        const response = await this.testChibaResponse(testCase, searchResults);
        totalTests++;
        if (response.response && response.response.length > 100) successCount++;

        // 3. LINE Webhookテスト
        const lineResult = await this.testLineWebhook(testCase);
        totalTests++;
        if (lineResult) successCount++;

        console.log(`✅ テストケース完了\\n`);
        
        // API制限対応
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ テストケースエラー: ${error.message}\\n`);
      }
    }

    console.log('='.repeat(60));
    console.log(`🎯 テスト結果: ${successCount}/${totalTests} 成功`);
    console.log(`📊 成功率: ${((successCount/totalTests) * 100).toFixed(1)}%`);
    
    if (successCount === totalTests) {
      console.log('🎉 全テスト成功！MCP統合が正常に動作しています。');
    } else {
      console.log('⚠️  一部テストが失敗しました。設定を確認してください。');
    }

    return { successCount, totalTests };
  }

  // ヘルスチェック
  async healthCheck() {
    console.log('🏥 ヘルスチェック実行中...\\n');

    const checks = [
      {
        name: 'n8n API接続',
        test: async () => {
          const response = await fetch(`${this.n8nUrl}/api/v1/workflows`, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`admin:${process.env.N8N_BASIC_AUTH_PASSWORD}`).toString('base64')}`
            }
          });
          return response.ok;
        }
      },
      {
        name: 'MCP Webhook応答',
        test: async () => {
          const response = await fetch(`${this.n8nUrl}/webhook/mcp-chiba`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.mcpToken}`
            },
            body: JSON.stringify({ operation: 'health', query: 'test' })
          });
          return response.status < 500;
        }
      },
      {
        name: 'LINE Webhook応答',
        test: async () => {
          const response = await fetch(`${this.n8nUrl}/webhook/line-webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: [] })
          });
          return response.status < 500;
        }
      }
    ];

    let healthyCount = 0;

    for (const check of checks) {
      try {
        const result = await check.test();
        if (result) {
          console.log(`✅ ${check.name}: 正常`);
          healthyCount++;
        } else {
          console.log(`❌ ${check.name}: 異常`);
        }
      } catch (error) {
        console.log(`❌ ${check.name}: エラー - ${error.message}`);
      }
    }

    console.log(`\\n🏥 ヘルスチェック結果: ${healthyCount}/${checks.length} 正常`);
    return healthyCount === checks.length;
  }
}

// 実行
async function main() {
  const tester = new MCPIntegrationTester();
  
  try {
    // 1. ヘルスチェック
    const isHealthy = await tester.healthCheck();
    
    if (!isHealthy) {
      console.log('⚠️  システムに問題があります。設定を確認してください。');
      return;
    }

    // 2. 統合テスト
    await tester.runIntegrationTests();
    
  } catch (error) {
    console.error('💥 テスト実行エラー:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = MCPIntegrationTester;