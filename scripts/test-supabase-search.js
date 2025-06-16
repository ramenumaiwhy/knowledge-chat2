const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase Vector Search テストスクリプト
 * n8nワークフロー実装前の動作確認用
 */

class SupabaseSearchTester {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!this.supabaseUrl || !this.supabaseKey || !this.geminiApiKey) {
      throw new Error('環境変数が設定されていません');
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  // Gemini APIでembedding生成
  async generateEmbedding(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiApiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: text }] }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.embedding.values;
    } catch (error) {
      console.error('Embedding生成エラー:', error.message);
      return null;
    }
  }

  // ハイブリッド検索（embedding + キーワード）
  async hybridSearch(query, useEmbedding = true) {
    console.log(`\n🔍 検索クエリ: "${query}"`);
    
    let queryEmbedding = null;
    if (useEmbedding) {
      console.log('📊 Embedding生成中...');
      queryEmbedding = await this.generateEmbedding(query);
    }
    
    try {
      const { data, error } = await this.supabase.rpc('hybrid_search_chiba', {
        query_text: query,
        query_embedding: queryEmbedding,
        match_threshold: 0.5,  // 閾値を下げる
        match_count: 5         // 結果数を増やす
      });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ 検索エラー:', error.message);
      return [];
    }
  }

  // チバ風レスポンス生成
  async generateChibaResponse(query, searchResults) {
    if (!searchResults || searchResults.length === 0) {
      return "申し訳ありませんが、その質問に関する具体的な情報が見つかりませんでした。別の質問をしていただけますか？";
    }
    
    const context = searchResults.map(result => 
      `タイトル: ${result.title}\n要約: ${result.summary || result.content.substring(0, 200)}`
    ).join('\n---\n');
    
    const prompt = `あなたは恋愛コーチの「チバ」です。以下の知識を基に、チバのメルマガスタイルで800-1200文字の詳細な回答を作成してください。

質問: ${query}

参考知識:
${context}

回答要件:
- チバの親しみやすい口調で始める
- 個人的な体験談や具体例を含める  
- 実践的なアドバイスを段階的に説明
- メルマガのような詳細解説
- 800-1200文字程度
- 最後に励ましのメッセージ`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('❌ レスポンス生成エラー:', error.message);
      return "回答生成中にエラーが発生しました。";
    }
  }

  // テスト実行
  async runTests() {
    console.log('🧪 Supabase Vector Search テスト開始\n');
    
    const testQueries = [
      'ナンパのコツを教えて',
      'アプローチ方法について',
      '美女を落とすには？',
      'チバさんの経験談',
      '存在しない質問テスト'
    ];
    
    for (const query of testQueries) {
      console.log('='.repeat(60));
      
      // 1. Vector Search テスト
      const searchResults = await this.hybridSearch(query, true);
      console.log(`✅ 検索結果: ${searchResults.length}件`);
      
      if (searchResults.length > 0) {
        searchResults.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title.substring(0, 50)}... (類似度: ${(result.score || 0).toFixed(2)})`);
        });
      }
      
      // 2. Response Generation テスト
      console.log('\n🤖 チバ風レスポンス生成中...');
      const response = await this.generateChibaResponse(query, searchResults);
      console.log(`\n📝 レスポンス (${response.length}文字):`);
      console.log(response.substring(0, 200) + '...\n');
      
      // 小休憩
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('🎉 テスト完了！');
  }

  // データベース統計表示
  async showStats() {
    try {
      const { count } = await this.supabase
        .from('chiba_knowledge')
        .select('*', { count: 'exact', head: true });
        
      console.log(`📊 データベース統計:`);
      console.log(`- 総データ数: ${count}件`);
      
      const { data: categories } = await this.supabase
        .from('chiba_knowledge')
        .select('category')
        .not('category', 'is', null);
        
      const categoryCount = {};
      categories.forEach(row => {
        categoryCount[row.category] = (categoryCount[row.category] || 0) + 1;
      });
      
      console.log('- カテゴリ別:');
      Object.entries(categoryCount).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}件`);
      });
      
    } catch (error) {
      console.error('統計取得エラー:', error.message);
    }
  }
}

// 実行
async function main() {
  try {
    const tester = new SupabaseSearchTester();
    
    console.log('📊 データベース統計確認');
    await tester.showStats();
    
    console.log('\n🚀 検索・レスポンステスト開始');
    await tester.runTests();
    
  } catch (error) {
    console.error('💥 テスト実行エラー:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = SupabaseSearchTester;