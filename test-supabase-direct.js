require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSupabaseDirectly() {
  console.log('🧪 Supabase直接テスト開始\n');
  
  try {
    // データベース接続確認
    console.log('📊 データベース接続確認中...');
    const { count, error: countError } = await supabase
      .from('chiba_knowledge')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    console.log(`✅ データベース接続成功！総データ数: ${count}件\n`);
    
    // ハイブリッド検索テスト（embeddingなし）
    console.log('🔍 キーワード検索テスト（ナンパ）...');
    const { data: keywordResults, error: keywordError } = await supabase.rpc('hybrid_search_chiba', {
      query_text: 'ナンパ',
      query_embedding: null,
      match_threshold: 0.5,
      match_count: 3
    });
    
    if (keywordError) {
      console.error('❌ キーワード検索エラー:', keywordError);
    } else {
      console.log(`✅ 検索結果: ${keywordResults.length}件`);
      keywordResults.forEach((result, i) => {
        console.log(`${i + 1}. ${result.title} (スコア: ${result.score})`);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

testSupabaseDirectly();