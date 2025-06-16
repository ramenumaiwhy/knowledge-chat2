/**
 * n8n ワークフロー自動デプロイスクリプト
 * Supabase Vector Search + Chiba Persona Response
 */

class N8nWorkflowDeployer {
  constructor() {
    this.n8nUrl = process.env.N8N_URL || 'https://your-n8n-instance.railway.app';
    this.n8nApiKey = process.env.N8N_BASIC_AUTH_PASSWORD; // Basic認証パスワード
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  // LINE Webhook → Supabase Vector Search ワークフロー
  createMainWorkflow() {
    return {
      "name": "Chiba Chatbot - Vector Search Enhanced",
      "active": true,
      "nodes": [
        {
          "parameters": {
            "httpMethod": "POST",
            "path": "line-webhook",
            "options": {}
          },
          "id": "webhook-line",
          "name": "LINE Webhook",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1,
          "position": [240, 300],
          "webhookId": "line-chiba-webhook"
        },
        {
          "parameters": {
            "conditions": {
              "string": [
                {
                  "value1": "={{$node['LINE Webhook'].json.events[0].type}}",
                  "operation": "equal",
                  "value2": "message"
                }
              ]
            }
          },
          "id": "filter-message",
          "name": "Filter Message",
          "type": "n8n-nodes-base.if",
          "typeVersion": 1,
          "position": [460, 300]
        },
        {
          "parameters": {
            "url": `${this.supabaseUrl}/rest/v1/rpc/hybrid_search_chiba`,
            "method": "POST",
            "headers": {
              "apikey": this.supabaseKey,
              "Authorization": `Bearer ${this.supabaseKey}`,
              "Content-Type": "application/json"
            },
            "body": {
              "query_text": "={{$node['LINE Webhook'].json.events[0].message.text}}",
              "query_embedding": null,
              "match_threshold": 0.5,
              "match_count": 5
            },
            "options": {
              "response": {
                "response": {
                  "fullResponse": false,
                  "neverError": true
                }
              }
            }
          },
          "id": "supabase-search",
          "name": "Supabase Vector Search",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4,
          "position": [680, 200]
        },
        {
          "parameters": {
            "url": `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiApiKey}`,
            "method": "POST",
            "headers": {
              "Content-Type": "application/json"
            },
            "body": {
              "model": "models/text-embedding-004",
              "content": {
                "parts": [{"text": "={{$node['LINE Webhook'].json.events[0].message.text}}"}]
              }
            },
            "options": {
              "response": {
                "response": {
                  "fullResponse": false,
                  "neverError": true
                }
              }
            }
          },
          "id": "gemini-embedding",
          "name": "Gemini Embedding",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4,
          "position": [680, 400]
        },
        {
          "parameters": {
            "conditions": {
              "number": [
                {
                  "value1": "={{$node['Supabase Vector Search'].json.length}}",
                  "operation": "larger",
                  "value2": 0
                }
              ]
            }
          },
          "id": "check-search-results",
          "name": "Check Search Results",
          "type": "n8n-nodes-base.if",
          "typeVersion": 1,
          "position": [900, 300]
        },
        {
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

質問: {{$node['LINE Webhook'].json.events[0].message.text}}

参考知識:
{{$node['Supabase Vector Search'].json.map(item => \`タイトル: \${item.title}\\n要約: \${item.summary || item.content.substring(0, 200)}\`).join('\\n---\\n')}}

回答要件:
- チバの親しみやすい口調で始める（「こんにちは、チバです！」など）
- 個人的な体験談や具体例を含める
- 実践的なアドバイスを段階的に説明
- メルマガのような詳細解説
- 800-1200文字程度
- 最後に励ましのメッセージで締める`
                }]
              }],
              "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1200
              }
            }
          },
          "id": "chiba-response",
          "name": "Chiba Response Generator", 
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4,
          "position": [1120, 200]
        },
        {
          "parameters": {
            "jsCode": "return [{ json: { response: '申し訳ありませんが、その質問に関する具体的な情報が見つかりませんでした。\\n\\nただ、どんな質問でも遠慮なくお聞かせください！チバがお答えできるよう努力します。\\n\\n他にも恋愛やナンパに関することがあれば、何でも質問してくださいね！' } }];"
          },
          "id": "fallback-response",
          "name": "Fallback Response",
          "type": "n8n-nodes-base.code",
          "typeVersion": 2,
          "position": [1120, 400]
        },
        {
          "parameters": {
            "url": "https://api.line.me/v2/bot/message/reply",
            "method": "POST",
            "headers": {
              "Authorization": "Bearer {{$env.LINE_CHANNEL_ACCESS_TOKEN}}",
              "Content-Type": "application/json"
            },
            "body": {
              "replyToken": "={{$node['LINE Webhook'].json.events[0].replyToken}}",
              "messages": [{
                "type": "text",
                "text": "={{$node['Chiba Response Generator'].json.candidates ? $node['Chiba Response Generator'].json.candidates[0].content.parts[0].text : $node['Fallback Response'].json.response}}"
              }]
            }
          },
          "id": "line-reply",
          "name": "LINE Reply",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4,
          "position": [1340, 300]
        }
      ],
      "connections": {
        "LINE Webhook": {
          "main": [
            [
              {
                "node": "Filter Message",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Filter Message": {
          "main": [
            [
              {
                "node": "Supabase Vector Search",
                "type": "main",
                "index": 0
              },
              {
                "node": "Gemini Embedding",
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
                "node": "Check Search Results",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Check Search Results": {
          "main": [
            [
              {
                "node": "Chiba Response Generator",
                "type": "main",
                "index": 0
              }
            ],
            [
              {
                "node": "Fallback Response",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Chiba Response Generator": {
          "main": [
            [
              {
                "node": "LINE Reply",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Fallback Response": {
          "main": [
            [
              {
                "node": "LINE Reply",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      }
    };
  }

  // MCP Server Workflow
  createMCPWorkflow() {
    return {
      "name": "Chiba MCP Server",
      "active": true,
      "nodes": [
        {
          "parameters": {
            "path": "mcp-chiba",
            "options": {
              "noResponseBody": false
            }
          },
          "id": "mcp-webhook",
          "name": "MCP Webhook",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1,
          "position": [240, 300]
        },
        {
          "parameters": {
            "jsCode": `
const operation = $input.all()[0].json.operation || 'search';
const query = $input.all()[0].json.query;

if (operation === 'search') {
  return [{
    json: {
      operation: 'search',
      query: query,
      endpoint: 'supabase'
    }
  }];
} else if (operation === 'response') {
  return [{
    json: {
      operation: 'response', 
      query: query,
      context: $input.all()[0].json.context || [],
      endpoint: 'gemini'
    }
  }];
}

return [{ json: { error: 'Unknown operation' } }];
            `
          },
          "id": "mcp-router",
          "name": "MCP Router",
          "type": "n8n-nodes-base.code",
          "typeVersion": 2,
          "position": [460, 300]
        }
      ],
      "connections": {
        "MCP Webhook": {
          "main": [
            [
              {
                "node": "MCP Router",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      }
    };
  }

  // ワークフローをn8nにデプロイ
  async deployWorkflow(workflow) {
    try {
      const response = await fetch(`${this.n8nUrl}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`admin:${this.n8nApiKey}`).toString('base64')}`
        },
        body: JSON.stringify(workflow)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ ワークフロー作成成功: ${result.name} (ID: ${result.id})`);
      return result;

    } catch (error) {
      console.error('❌ ワークフローデプロイエラー:', error.message);
      throw error;
    }
  }

  // 既存ワークフロー確認
  async listWorkflows() {
    try {
      const response = await fetch(`${this.n8nUrl}/api/v1/workflows`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`admin:${this.n8nApiKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        throw new Error(`n8n API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 既存ワークフロー:');
      result.data.forEach(wf => {
        console.log(`  - ${wf.name} (ID: ${wf.id}, Active: ${wf.active})`);
      });
      
      return result.data;

    } catch (error) {
      console.error('❌ ワークフロー一覧取得エラー:', error.message);
      return [];
    }
  }

  // ワークフロー削除
  async deleteWorkflow(workflowId) {
    try {
      const response = await fetch(`${this.n8nUrl}/api/v1/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`admin:${this.n8nApiKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Delete Error: ${response.status}`);
      }

      console.log(`🗑️ ワークフロー削除完了: ${workflowId}`);
      return true;

    } catch (error) {
      console.error('❌ ワークフロー削除エラー:', error.message);
      return false;
    }
  }

  // 実行
  async run() {
    console.log('🚀 n8n ワークフロー自動デプロイ開始\\n');
    
    try {
      // 1. 既存ワークフロー確認
      console.log('📋 既存ワークフローをチェック中...');
      const existingWorkflows = await this.listWorkflows();
      
      // 2. 重複削除（オプション）
      const duplicates = existingWorkflows.filter(wf => 
        wf.name.includes('Chiba Chatbot') || wf.name.includes('Chiba MCP')
      );
      
      if (duplicates.length > 0) {
        console.log(`\\n🗑️ 既存のチバワークフロー ${duplicates.length}件を削除中...`);
        for (const wf of duplicates) {
          await this.deleteWorkflow(wf.id);
        }
      }

      // 3. メインワークフローデプロイ
      console.log('\\n🚀 メインワークフローをデプロイ中...');
      const mainWorkflow = this.createMainWorkflow();
      const mainResult = await this.deployWorkflow(mainWorkflow);

      // 4. MCPワークフローデプロイ
      console.log('\\n🔧 MCPワークフローをデプロイ中...');
      const mcpWorkflow = this.createMCPWorkflow();
      const mcpResult = await this.deployWorkflow(mcpWorkflow);

      console.log('\\n🎉 ワークフローデプロイ完了!');
      console.log(`\\n📱 LINE Webhook URL: ${this.n8nUrl}/webhook/line-webhook`);
      console.log(`🔧 MCP Endpoint URL: ${this.n8nUrl}/webhook/mcp-chiba`);
      
      return {
        main: mainResult,
        mcp: mcpResult
      };

    } catch (error) {
      console.error('💥 デプロイエラー:', error.message);
      throw error;
    }
  }
}

// 実行
async function main() {
  // 環境変数チェック
  const requiredVars = ['N8N_URL', 'N8N_BASIC_AUTH_PASSWORD', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'GEMINI_API_KEY'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ 必要な環境変数が不足しています:', missing.join(', '));
    process.exit(1);
  }

  const deployer = new N8nWorkflowDeployer();
  await deployer.run();
}

if (require.main === module) {
  main();
}

module.exports = N8nWorkflowDeployer;