#!/usr/bin/env node

/**
 * Chiba Chatbot MCP Client
 * Claude Code <-> n8n MCP Server統合
 */

const { MCPServer } = require('@modelcontextprotocol/server');
const { StdioServerTransport } = require('@modelcontextprotocol/server/stdio');

class ChibaMCPClient {
  constructor() {
    this.server = new MCPServer(
      {
        name: "chiba-chatbot-client",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.n8nUrl = process.env.N8N_MCP_URL || 'https://your-n8n-instance.railway.app';
    this.n8nToken = process.env.N8N_MCP_TOKEN || 'chiba-bot-secret-2024';
    this.setupTools();
  }

  setupTools() {
    // チバ検索ツール
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: "chiba_search",
            description: "チバの知識ベースから関連情報を検索",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "検索クエリ（ナンパ、恋愛相談など）"
                },
                max_results: {
                  type: "number",
                  description: "最大結果数（デフォルト: 5）",
                  default: 5
                }
              },
              required: ["query"]
            }
          },
          {
            name: "chiba_response",
            description: "チバの知識とペルソナで詳細回答を生成",
            inputSchema: {
              type: "object", 
              properties: {
                query: {
                  type: "string",
                  description: "ユーザーの質問"
                },
                context: {
                  type: "array",
                  description: "検索で取得した関連知識",
                  items: {
                    type: "object"
                  }
                }
              },
              required: ["query"]
            }
          },
          {
            name: "chiba_workflow_update",
            description: "n8nワークフローを動的に更新",
            inputSchema: {
              type: "object",
              properties: {
                workflow_id: {
                  type: "string", 
                  description: "更新対象のワークフローID"
                },
                updates: {
                  type: "object",
                  description: "更新内容（ノード設定など）"
                }
              },
              required: ["workflow_id", "updates"]
            }
          }
        ]
      };
    });

    // ツール実行ハンドラー
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'chiba_search':
          return await this.chibaSearch(args.query, args.max_results || 5);
        
        case 'chiba_response':
          return await this.chibaResponse(args.query, args.context);
        
        case 'chiba_workflow_update':
          return await this.updateWorkflow(args.workflow_id, args.updates);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  // チバ検索実行
  async chibaSearch(query, maxResults = 5) {
    try {
      const response = await fetch(`${this.n8nUrl}/webhook/chiba-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.n8nToken}`
        },
        body: JSON.stringify({
          query: query,
          max_results: maxResults
        })
      });

      if (!response.ok) {
        throw new Error(`n8n Search Error: ${response.status}`);
      }

      const results = await response.json();
      
      return {
        content: [
          {
            type: "text",
            text: `検索クエリ: "${query}"\\n\\n検索結果 (${results.length}件):\\n\\n${results.map((r, i) => 
              `${i+1}. **${r.title}**\\n   類似度: ${(r.score || 0).toFixed(2)}\\n   要約: ${r.summary || r.content.substring(0, 100)}...`
            ).join('\\n\\n')}`
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: "text", 
            text: `❌ 検索エラー: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // チバレスポンス生成
  async chibaResponse(query, context = []) {
    try {
      const response = await fetch(`${this.n8nUrl}/webhook/chiba-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.n8nToken}`
        },
        body: JSON.stringify({
          query: query,
          context: context
        })
      });

      if (!response.ok) {
        throw new Error(`n8n Response Error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        content: [
          {
            type: "text",
            text: `**チバからの回答:**\\n\\n${result.response}\\n\\n---\\n*参考データ: ${context.length}件*`
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ レスポンス生成エラー: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // ワークフロー更新
  async updateWorkflow(workflowId, updates) {
    try {
      const response = await fetch(`${this.n8nUrl}/api/v1/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.n8nToken
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Workflow Update Error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        content: [
          {
            type: "text",
            text: `✅ ワークフロー更新完了\\nID: ${workflowId}\\n更新内容: ${JSON.stringify(updates, null, 2)}`
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ ワークフロー更新エラー: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // MCPサーバー開始
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Chiba MCP Client が開始されました');
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// メイン実行
if (require.main === module) {
  const client = new ChibaMCPClient();
  client.start().catch((error) => {
    console.error('❌ MCP Client Start Error:', error);
    process.exit(1);
  });
}

module.exports = ChibaMCPClient;