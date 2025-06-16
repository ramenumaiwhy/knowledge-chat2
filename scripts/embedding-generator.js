const fs = require('fs');
const csv = require('csv-parse');
const { createClient } = require('@supabase/supabase-js');

/**
 * Embedding生成・投入スクリプト
 * Gemini APIでembeddingを生成してSupabaseに保存
 */

class EmbeddingGenerator {
  constructor() {
    // 環境変数から設定を取得
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!this.supabaseUrl || !this.supabaseKey || !this.geminiApiKey) {
      throw new Error('環境変数が設定されていません: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY');
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    this.processedCount = 0;
    this.errorCount = 0;
  }

  // Gemini APIでembedding生成
  async generateEmbedding(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiApiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text: text }]
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return data.embedding.values;
  }

  // 遅延関数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // データベースにレコード挿入
  async insertRecord(record, embedding) {
    const { data, error } = await this.supabase
      .from('chiba_knowledge')
      .insert({
        id: record.id,
        title: record.title,
        content: record.content,
        summary: record.summary,
        category: record.category,
        content_type: record.content_type,
        keywords: record.keywords ? record.keywords.split(',') : [],
        date: record.date,
        target_group: record.target_group,
        occupation: record.occupation,
        original_length: parseInt(record.original_length) || 0,
        processed_at: record.processed_at,
        embedding: embedding
      });
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  // 既存データの確認
  async checkExistingData() {
    const { data, error } = await this.supabase
      .from('chiba_knowledge')
      .select('id')
      .limit(1);
      
    if (error) {
      throw error;
    }
    
    return data.length > 0;
  }

  // バッチ処理でembedding生成
  async processBatch(records, batchSize = 10) {
    console.log(`\n🔄 バッチ処理開始: ${records.length}件`);
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      console.log(`\n📦 バッチ ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} (${batch.length}件)`);
      
      for (const record of batch) {
        try {
          // embedding用のテキスト作成
          const embeddingText = `${record.title}\n\n${record.summary}\n\n${record.content}`;
          
          console.log(`  処理中: ID ${record.id} - "${record.title.substring(0, 30)}..."`);
          
          // embedding生成
          const embedding = await this.generateEmbedding(embeddingText);
          
          // データベースに挿入
          await this.insertRecord(record, embedding);
          
          this.processedCount++;
          console.log(`  ✅ 完了 (${this.processedCount}/${records.length})`);
          
          // API制限対応（1秒間隔）
          await this.delay(1000);
          
        } catch (error) {
          this.errorCount++;
          console.error(`  ❌ エラー ID ${record.id}:`, error.message);
          
          // エラーが続く場合は少し長めに待機
          if (error.message.includes('quota') || error.message.includes('rate')) {
            console.log('  ⏸️  API制限のため60秒待機...');
            await this.delay(60000);
          }
        }
      }
      
      // バッチ間の休憩
      if (i + batchSize < records.length) {
        console.log('  ⏸️  バッチ間休憩 (10秒)...');
        await this.delay(10000);
      }
    }
  }

  // CSVファイルを読み込み
  async loadCSV(filePath) {
    console.log(`📂 CSVファイル読み込み: ${filePath}`);
    
    const records = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv.parse({ 
          columns: true,
          skip_empty_lines: true 
        }))
        .on('data', (data) => {
          records.push(data);
        })
        .on('end', () => {
          console.log(`✅ ${records.length}件のレコードを読み込み`);
          resolve(records);
        })
        .on('error', reject);
    });
  }

  // データベースのクリア（オプション）
  async clearDatabase() {
    console.log('🗑️  既存データを削除中...');
    
    const { error } = await this.supabase
      .from('chiba_knowledge')
      .delete()
      .neq('id', 0); // 全削除
    
    if (error) {
      throw error;
    }
    
    console.log('✅ データベースをクリア');
  }

  // 統計情報表示
  async showStatistics() {
    const { data, error } = await this.supabase
      .from('chiba_knowledge')
      .select('category, content_type')
      .not('embedding', 'is', null);
    
    if (error) {
      throw error;
    }
    
    const categoryStats = {};
    const typeStats = {};
    
    data.forEach(row => {
      categoryStats[row.category] = (categoryStats[row.category] || 0) + 1;
      typeStats[row.content_type] = (typeStats[row.content_type] || 0) + 1;
    });
    
    console.log('\n📊 データベース統計:');
    console.log(`総件数: ${data.length}件`);
    console.log('\nカテゴリ別:');
    Object.entries(categoryStats).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}件`);
    });
    console.log('\nタイプ別:');
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}件`);
    });
  }

  // メイン実行
  async run(csvPath, options = {}) {
    try {
      console.log('🚀 Embedding生成プロセス開始');
      console.log(`📅 開始時刻: ${new Date().toLocaleString()}`);
      
      // 既存データチェック
      const hasExistingData = await this.checkExistingData();
      if (hasExistingData && !options.clearFirst) {
        console.log('⚠️  既存データが見つかりました');
        console.log('クリアして再実行する場合は --clear オプションを使用してください');
        return;
      }
      
      if (options.clearFirst) {
        await this.clearDatabase();
      }
      
      // CSVファイル読み込み
      const records = await this.loadCSV(csvPath);
      
      // embedding生成・投入
      const startTime = Date.now();
      await this.processBatch(records, options.batchSize || 10);
      const endTime = Date.now();
      
      // 結果表示
      console.log('\n🎉 処理完了!');
      console.log(`📊 処理済み: ${this.processedCount}件`);
      console.log(`❌ エラー: ${this.errorCount}件`);
      console.log(`⏱️  所要時間: ${Math.round((endTime - startTime) / 1000)}秒`);
      
      await this.showStatistics();
      
    } catch (error) {
      console.error('💥 致命的エラー:', error);
      throw error;
    }
  }
}

// コマンドライン実行
async function main() {
  const args = process.argv.slice(2);
  
  // --clearフラグの処理
  const clearFirst = args.includes('--clear');
  const csvPath = args.find(arg => !arg.startsWith('--')) || './data/processed_knowledge.csv';
  
  const options = {
    clearFirst,
    batchSize: 10
  };
  
  console.log('='.repeat(50));
  console.log('🤖 Chiba Chatbot - Embedding Generator');
  console.log('='.repeat(50));
  
  try {
    const generator = new EmbeddingGenerator();
    await generator.run(csvPath, options);
  } catch (error) {
    console.error('\n💥 実行エラー:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EmbeddingGenerator;