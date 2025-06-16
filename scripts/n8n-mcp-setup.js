/**
 * n8n MCP統合セットアップスクリプト
 * Claude Code -> n8n MCP -> Supabase Vector Search
 */

class N8nMCPSetup {
  constructor() {
    this.n8nApiUrl = process.env.N8N_API_URL || 'https://your-n8n-instance.railway.app/api/v1';
    this.n8nApiKey = process.env.N8N_API_KEY;
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  // n8n MCP Server設定
  async setupMCPServer() {
    const mcpWorkflow = {
      "name": "Chiba Chatbot MCP Server",
      "nodes": [
        {
          "id": "mcp-server-trigger",
          "type": "n8n-nodes-langchain.mcptrigger",
          "name": "MCP Server Trigger",
          "parameters": {
            "authentication": "bearerToken",
            "bearerToken": "chiba-bot-secret-2024"
          },
          "position": [240, 300]
        },
        {
          "id": "supabase-vector-search",
          "type": "@n8n/n8n-nodes-base.httpRequest",
          "name": "Supabase Vector Search",
          "parameters": {
            "url": `${this.supabaseUrl}/rest/v1/rpc/hybrid_search_chiba`,
            "method": "POST",
            "headers": {
              "apikey": this.supabaseKey,
              "Authorization": `Bearer ${this.supabaseKey}`,
              "Content-Type": "application/json"
            },
            "body": {
              "query_text": "={{$json.query}}",
              "query_embedding": null,
              "match_threshold": 0.5,
              "match_count": 5
            }
          },
          "position": [460, 300]
        },
        {
          "id": "gemini-embedding",
          "type": "@n8n/n8n-nodes-base.httpRequest", 
          "name": "Gemini Embedding",
          "parameters": {
            "url": `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiApiKey}`,
            "method": "POST",
            "headers": {
              "Content-Type": "application/json"
            },
            "body": {
              "model": "models/text-embedding-004",
              "content": {
                "parts": [{"text": "={{$json.query}}"}]
              }
            }
          },
          "position": [460, 200]
        },
        {
          "id": "chiba-response-generator",
          "type": "@n8n/n8n-nodes-base.httpRequest",
          "name": "Chiba Response Generator", 
          "parameters": {
            "url": `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
            "method": "POST",
            "headers": {
              "Content-Type": "application/json"
            },
            "body": {
              "contents": [{
                "parts": [{
                  "text": `あなたは恋愛コーチの「チバ」です。以下の知識を基に、チバのメルマガスタイルで800-1200文字の詳細な回答を作成してください。

質問: {{$node['MCP Server Trigger'].json.query}}

参考知識:
{{$node['Supabase Vector Search'].json.map(item => \`タイトル: \${item.title}\\n要約: \${item.summary}\`).join('\\n---\\n')}}

回答要件:
- チバの親しみやすい口調
- 具体的な体験談や例を含める
- 実践的なアドバイスを段階的に説明
- メルマガのような詳細解説
- 800-1200文字程度`
                }]
              }],
              "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1000
              }
            }
          },
          "position": [680, 300]
        }
      ],
      "connections": {
        "MCP Server Trigger": {
          "main": [
            [
              {
                "node": "Gemini Embedding",
                "type": "main",
                "index": 0
              },
              {
                "node": "Supabase Vector Search", 
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Supabase Vector Search": {
          "main": [
            [
              {
                "node": "Chiba Response Generator",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      }
    };

    return mcpWorkflow;
  }

  // MCP Client設定（Claude Code側）
  async setupMCPClient() {
    const mcpClientConfig = {
      "mcpServers": {
        "chiba-chatbot": {
          "url": "https://your-n8n-instance.railway.app/mcp",
          "authentication": {
            "type": "bearer",
            "token": "chiba-bot-secret-2024"
          },
          "tools": [
            "chiba_search",
            "chiba_response"
          ]
        }
      }
    };

    return mcpClientConfig;
  }

  // n8n APIを使ったワークフロー作成
  async createMCPWorkflow() {
    const workflow = await this.setupMCPServer();
    
    try {
      const response = await fetch(`${this.n8nApiUrl}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.n8nApiKey
        },
        body: JSON.stringify(workflow)
      });

      if (!response.ok) {
        throw new Error(`n8n API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ MCP Workflow作成成功:', result.id);
      return result;

    } catch (error) {
      console.error('❌ Workflow作成エラー:', error.message);
      throw error;
    }
  }

  // MCP接続テスト
  async testMCPConnection() {
    const testQuery = "ナンパのコツを教えて";
    
    try {
      // MCP Server経由でチバボット呼び出し
      const response = await fetch(`${this.n8nApiUrl}/webhooks/mcp/chiba-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer chiba-bot-secret-2024'
        },
        body: JSON.stringify({
          query: testQuery
        })
      });

      if (!response.ok) {
        throw new Error(`MCP Test Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('🧪 MCP接続テスト成功!');
      console.log('回答:', result.response.substring(0, 200) + '...');
      
      return result;

    } catch (error) {
      console.error('❌ MCP接続テストエラー:', error.message);
      throw error;
    }
  }

  // Claude Code MCP設定ファイル生成
  generateClaudeMCPConfig() {
    const config = {
      "mcpServers": {
        "chiba-chatbot": {
          "command": "node",
          "args": ["/path/to/chiba-mcp-client.js"],
          "env": {
            "N8N_MCP_URL": "https://your-n8n-instance.railway.app/mcp",
            "N8N_MCP_TOKEN": "chiba-bot-secret-2024"
          }
        }
      }
    };

    console.log('📝 Claude MCP設定:');
    console.log(JSON.stringify(config, null, 2));
    return config;
  }

  // セットアップ実行
  async run() {
    console.log('🚀 n8n MCP統合セットアップ開始');
    
    try {
      // 1. MCP Server Workflow作成
      console.log('1. MCP Server Workflow作成中...');
      await this.createMCPWorkflow();
      
      // 2. MCP Client設定生成
      console.log('2. MCP Client設定生成中...');
      await this.setupMCPClient();
      
      // 3. 接続テスト
      console.log('3. MCP接続テスト実行中...');
      await this.testMCPConnection();
      
      // 4. Claude設定ファイル生成
      console.log('4. Claude MCP設定生成中...');
      this.generateClaudeMCPConfig();
      
      console.log('🎉 n8n MCP統合セットアップ完了！');
      
    } catch (error) {
      console.error('💥 セットアップエラー:', error.message);
    }
  }
}

// 実行
async function main() {
  const setup = new N8nMCPSetup();
  await setup.run();
}

if (require.main === module) {
  main();
}

module.exports = N8nMCPSetup;