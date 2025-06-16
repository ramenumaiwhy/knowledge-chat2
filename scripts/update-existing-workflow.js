/**
 * 既存n8nワークフロー更新スクリプト
 * LINE Webhook → Supabase Vector Search統合
 */

class WorkflowUpdater {
  constructor() {
    this.n8nUrl = 'https://knowledge-chat2-production.up.railway.app';
    this.webhookUrl = `${this.n8nUrl}/webhook`;
  }

  // 現在のワークフローをテスト
  async testCurrentWorkflow() {
    console.log('🧪 現在のワークフローテスト中...');
    
    const testEvent = {
      events: [{
        type: 'message',
        replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXCTA',
        source: { type: 'user', userId: 'test-user' },
        message: { type: 'text', text: 'ナンパのコツ' }
      }]
    };

    try {
      const response = await fetch(`${this.webhookUrl}/line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent)
      });

      console.log(`📱 Webhook応答: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ 既存ワークフロー正常動作');
        return true;
      } else {
        console.log('❌ 既存ワークフロー異常');
        return false;
      }
      
    } catch (error) {
      console.error('❌ テストエラー:', error.message);
      return false;
    }
  }

  // n8n管理画面のWebhook URLを生成
  generateWebhookInstructions() {
    const instructions = `
🔧 n8n管理画面での手動更新手順

1. n8n管理画面にアクセス:
   ${this.n8nUrl}

2. 既存の「LINE Webhook」ワークフローを開く

3. 以下のノードを追加/更新:

===== Supabase Vector Search Node =====
Type: HTTP Request
Name: Supabase Vector Search
Method: POST
URL: https://qkpasrtfnhcbqjofiukz.supabase.co/rest/v1/rpc/hybrid_search_chiba

Headers:
  apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGFzcnRmbmhjYnFqb2ZpdWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA4MDQ2NCwiZXhwIjoyMDY1NjU2NDY0fQ.jef5Y8CW7iKCmyrcZtb8AHN0l9w6DIjsOb0eWAEzXBg
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGFzcnRmbmhjYnFqb2ZpdWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA4MDQ2NCwiZXhwIjoyMDY1NjU2NDY0fQ.jef5Y8CW7iKCmyrcZtb8AHN0l9w6DIjsOb0eWAEzXBg
  Content-Type: application/json

Body (JSON):
{
  "query_text": "={{$node['Webhook'].json.events[0].message.text}}",
  "query_embedding": null,
  "match_threshold": 0.5,
  "match_count": 5
}

===== Enhanced Gemini Response Node =====
Type: HTTP Request  
Name: Enhanced Gemini Response
Method: POST
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDMflKhgtla1RPwrcIy9Yev6FRpQTSqUsA

Body (JSON):
{
  "contents": [{
    "parts": [{
      "text": "あなたは恋愛コーチの「チバ」です。以下の知識を基に、チバのメルマガスタイルで800-1200文字の詳細な回答を作成してください。\\n\\n質問: {{$node['Webhook'].json.events[0].message.text}}\\n\\n参考知識:\\n{{$node['Supabase Vector Search'].json.map(item => \`タイトル: \${item.title}\\n要約: \${item.summary || item.content.substring(0, 200)}\`).join('\\n---\\n')}}\\n\\n回答要件:\\n- チバの親しみやすい口調で始める\\n- 個人的な体験談や具体例を含める\\n- 実践的なアドバイスを段階的に説明\\n- メルマガのような詳細解説\\n- 800-1200文字程度\\n- 最後に励ましのメッセージで締める"
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 1200
  }
}

===== フロー接続 =====
Webhook → Supabase Vector Search → Enhanced Gemini Response → LINE Reply

4. ワークフローを保存・有効化

5. テスト実行
`;

    console.log(instructions);
    return instructions;
  }

  // JSON設定ファイル生成
  generateWorkflowJSON() {
    const workflowConfig = {
      supabaseSearch: {
        url: "https://qkpasrtfnhcbqjofiukz.supabase.co/rest/v1/rpc/hybrid_search_chiba",
        headers: {
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGFzcnRmbmhjYnFqb2ZpdWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA4MDQ2NCwiZXhwIjoyMDY1NjU2NDY0fQ.jef5Y8CW7iKCmyrcZtb8AHN0l9w6DIjsOb0eWAEzXBg",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGFzcnRmbmhjYnFqb2ZpdWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA4MDQ2NCwiZXhwIjoyMDY1NjU2NDY0fQ.jef5Y8CW7iKCmyrcZtb8AHN0l9w6DIjsOb0eWAEzXBg"
        },
        body: {
          "query_text": "={{$node['Webhook'].json.events[0].message.text}}",
          "query_embedding": null,
          "match_threshold": 0.5,
          "match_count": 5
        }
      },
      geminiEnhanced: {
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDMflKhgtla1RPwrcIy9Yev6FRpQTSqUsA",
        prompt: "あなたは恋愛コーチの「チバ」です。以下の知識を基に、チバのメルマガスタイルで800-1200文字の詳細な回答を作成してください。",
        instructions: [
          "チバの親しみやすい口調で始める",
          "個人的な体験談や具体例を含める", 
          "実践的なアドバイスを段階的に説明",
          "メルマガのような詳細解説",
          "800-1200文字程度",
          "最後に励ましのメッセージで締める"
        ]
      }
    };

    console.log('\n📄 ワークフロー設定JSON:');
    console.log(JSON.stringify(workflowConfig, null, 2));
    
    return workflowConfig;
  }

  // 実行
  async run() {
    console.log('🔧 n8nワークフロー更新ガイド\n');
    
    try {
      // 1. 現在のワークフローテスト
      const isWorking = await this.testCurrentWorkflow();
      
      if (isWorking) {
        console.log('\n✅ 既存ワークフローは動作中です');
        console.log('🚀 Vector Search統合で更にパワーアップしましょう！\n');
      } else {
        console.log('\n⚠️  既存ワークフローに問題があります');
        console.log('🔧 修復とVector Search統合を同時に行いましょう\n');
      }

      // 2. 手動更新手順生成
      this.generateWebhookInstructions();

      // 3. 設定JSON生成
      this.generateWorkflowJSON();

      console.log('\n🎯 次のステップ:');
      console.log('1. n8n管理画面で上記設定を適用');
      console.log('2. テスト実行で動作確認');
      console.log('3. LINE Botで実際にテスト');
      
    } catch (error) {
      console.error('💥 エラー:', error.message);
    }
  }
}

// 実行
async function main() {
  const updater = new WorkflowUpdater();
  await updater.run();
}

if (require.main === module) {
  main();
}

module.exports = WorkflowUpdater;