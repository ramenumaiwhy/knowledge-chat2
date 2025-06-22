require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkData() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  try {
    // データサンプル取得
    const { data, error } = await supabase
      .from('chiba_knowledge')
      .select('id, title')
      .order('id')
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('📊 投入済みデータ例:');
    data.forEach(row => {
      console.log(`ID ${row.id}: ${row.title.substring(0, 50)}...`);
    });
    
    // 総件数確認
    const { count, error: countError } = await supabase
      .from('chiba_knowledge')
      .select('*', { count: 'exact', head: true });
      
    if (!countError) {
      console.log(`\n✅ 総データ数: ${count}件`);
      
      // embedding確認
      const { data: embeddingData, error: embeddingError } = await supabase
        .from('chiba_knowledge')
        .select('id')
        .not('embedding', 'is', null)
        .limit(1);
        
      if (!embeddingError && embeddingData.length > 0) {
        console.log('✅ Embedding生成済み');
      } else {
        console.log('❌ Embeddingが未生成');
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

checkData();