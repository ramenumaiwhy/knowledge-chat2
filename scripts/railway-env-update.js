/**
 * Railway環境変数自動更新スクリプト
 * MCP機能とSupabase統合の有効化
 */

class RailwayEnvUpdater {
  constructor() {
    this.railwayToken = process.env.RAILWAY_TOKEN;
    this.projectId = process.env.RAILWAY_PROJECT_ID;
    this.railwayApiUrl = 'https://backboard.railway.app/graphql';
  }

  // GraphQL mutation for environment variables
  async updateEnvironmentVariables() {
    const newVars = {
      // MCP有効化
      'N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE': 'true',
      
      // Supabase統合
      'SUPABASE_URL': process.env.SUPABASE_URL,
      'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
      
      // MCP認証
      'N8N_MCP_SECRET': 'chiba-bot-secret-2024',
      
      // パフォーマンス設定
      'N8N_PAYLOAD_SIZE_MAX': '16',
      'N8N_METRICS': 'true'
    };

    const mutation = `
      mutation VariableUpsert($input: VariableUpsertInput!) {
        variableUpsert(input: $input) {
          id
          name
          value
        }
      }
    `;

    const results = [];
    
    for (const [name, value] of Object.entries(newVars)) {
      try {
        const response = await fetch(this.railwayApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.railwayToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              input: {
                projectId: this.projectId,
                name: name,
                value: value
              }
            }
          })
        });

        const result = await response.json();
        
        if (result.errors) {
          console.error(`❌ ${name}:`, result.errors);
        } else {
          console.log(`✅ ${name}: 更新成功`);
          results.push({ name, status: 'success' });
        }
        
      } catch (error) {
        console.error(`❌ ${name}:`, error.message);
        results.push({ name, status: 'error', error: error.message });
      }
    }

    return results;
  }

  // 現在の環境変数確認
  async getCurrentVariables() {
    const query = `
      query GetVariables($projectId: String!) {
        variables(projectId: $projectId) {
          edges {
            node {
              id
              name
              value
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.railwayApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.railwayToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          variables: {
            projectId: this.projectId
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data.variables.edges.map(edge => edge.node);
      
    } catch (error) {
      console.error('❌ 環境変数取得エラー:', error.message);
      return [];
    }
  }

  // デプロイメント再起動
  async restartDeployment() {
    const mutation = `
      mutation ServiceInstanceRedeploy($serviceId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId) {
          id
          status
        }
      }
    `;

    try {
      const response = await fetch(this.railwayApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.railwayToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            serviceId: process.env.RAILWAY_SERVICE_ID
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      console.log('🔄 デプロイメント再起動開始');
      return result.data.serviceInstanceRedeploy;
      
    } catch (error) {
      console.error('❌ 再起動エラー:', error.message);
      return null;
    }
  }

  // 実行
  async run() {
    console.log('🚀 Railway環境変数更新開始\n');
    
    try {
      // 1. 現在の環境変数確認
      console.log('📊 現在の環境変数確認中...');
      const currentVars = await this.getCurrentVariables();
      console.log(`現在の変数数: ${currentVars.length}件\n`);

      // 2. 環境変数更新
      console.log('🔧 環境変数更新中...');
      const results = await this.updateEnvironmentVariables();
      
      const successCount = results.filter(r => r.status === 'success').length;
      console.log(`\n✅ 更新完了: ${successCount}/${results.length}件\n`);

      // 3. デプロイメント再起動
      console.log('🔄 n8nサービス再起動中...');
      await this.restartDeployment();
      
      console.log('\n🎉 Railway環境設定完了！');
      console.log('⏳ n8n再起動まで約2-3分お待ちください。');
      
    } catch (error) {
      console.error('💥 更新エラー:', error.message);
    }
  }
}

// 手動実行用（Railway API認証情報が必要）
async function manualSetup() {
  console.log('🔧 手動セットアップガイド\n');
  
  const requiredVars = {
    'N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE': 'true',
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
    'N8N_MCP_SECRET': 'chiba-bot-secret-2024'
  };
  
  console.log('Railway Dashboard → Variables に以下を追加:');
  console.log('=' .repeat(50));
  
  Object.entries(requiredVars).forEach(([key, value]) => {
    const displayValue = value && value.length > 20 ? 
      value.substring(0, 20) + '...' : value;
    console.log(`${key}=${displayValue}`);
  });
  
  console.log('=' .repeat(50));
  console.log('\n✅ 設定後、Deployを再起動してください。');
}

// 実行
if (require.main === module) {
  if (process.env.RAILWAY_TOKEN && process.env.RAILWAY_PROJECT_ID) {
    const updater = new RailwayEnvUpdater();
    updater.run();
  } else {
    manualSetup();
  }
}

module.exports = RailwayEnvUpdater;