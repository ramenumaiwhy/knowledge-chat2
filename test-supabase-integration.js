const axios = require('axios');

async function testSupabaseIntegration() {
  console.log('🧪 Supabase統合テスト開始\n');
  
  const testQueries = [
    'ナンパのコツを教えて',
    'アプローチ方法について',
    '美女を落とすには？',
    'チバさんの経験談'
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 テストクエリ: "${query}"`);
    console.log('=' .repeat(50));
    
    try {
      const response = await axios.post(
        'http://localhost:3000/webhook',
        {
          events: [{
            type: 'message',
            message: {
              type: 'text',
              text: query
            },
            replyToken: 'test-token'
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log(`✅ レスポンス: ${response.status} ${response.statusText}`);
      console.log(`📊 データ: ${JSON.stringify(response.data)}`);
      
    } catch (error) {
      console.error(`❌ エラー: ${error.message}`);
      if (error.response) {
        console.error(`   ステータス: ${error.response.status}`);
        console.error(`   データ: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // 小休憩
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 テスト完了！');
}

// 実行
testSupabaseIntegration().catch(console.error);