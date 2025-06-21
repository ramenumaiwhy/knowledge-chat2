#!/usr/bin/env node

/**
 * Supabaseへのデータインポートスクリプト
 * CSVデータをSupabaseのchiba_knowledgeテーブルに投入
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// ログディレクトリ
const LOGS_DIR = path.join(__dirname, '..', 'logs');

async function main() {
  console.log('🚀 Supabaseへのデータインポートを開始します...\n');
  
  // 環境変数チェック
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Supabase環境変数が設定されていません');
    console.log('SUPABASE_URLとSUPABASE_SERVICE_KEYを設定してください\n');
    console.log('現在のシステムはCSVベースで正常に動作しています。');
    console.log('Supabaseへの投入は将来の拡張オプションです。');
    return;
  }
  
  try {
    // Supabaseモジュールを動的にロード
    let createClient;
    try {
      const supabaseModule = require('@supabase/supabase-js');
      createClient = supabaseModule.createClient;
    } catch (error) {
      console.log('📦 @supabase/supabase-jsがインストールされていません');
      console.log('Supabaseを使用する場合は以下を実行してください:');
      console.log('npm install @supabase/supabase-js\n');
      return;
    }
    
    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // ログディレクトリ作成
    await fs.mkdir(LOGS_DIR, { recursive: true });
    
    // 新しいメールデータを読み込み
    const csvContent = await fs.readFile(
      path.join(__dirname, '..', 'data', 'new_emails_processed.csv'),
      'utf-8'
    );
    
    const data = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`📊 ${data.length}件のデータをインポートします\n`);
    
    const importLog = [];
    let successCount = 0;
    let errorCount = 0;
    
    // バッチ処理（5件ずつ）
    const batchSize = 5;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      console.log(`処理中 [${i + 1}-${Math.min(i + batchSize, data.length)}/${data.length}]`);
      
      try {
        // Supabase用のデータ形式に変換
        const supabaseData = batch.map(record => ({
          id: parseInt(record.id),
          title: record.title,
          content: record.content,
          summary: record.summary,
          category: record.category,
          content_type: record.content_type,
          keywords: record.keywords,
          date: record.date,
          target_group: record.target_group,
          occupation: record.occupation,
          original_length: parseInt(record.original_length),
          processed_at: record.processed_at,
          // エンベディングは別途生成が必要
          embedding: null
        }));
        
        // Supabaseに挿入
        const { data: insertedData, error } = await supabase
          .from('chiba_knowledge')
          .upsert(supabaseData, { onConflict: 'id' });
        
        if (error) {
          throw error;
        }
        
        successCount += batch.length;
        importLog.push({
          batch: `${i + 1}-${Math.min(i + batchSize, data.length)}`,
          status: 'success',
          count: batch.length
        });
        
      } catch (error) {
        errorCount += batch.length;
        importLog.push({
          batch: `${i + 1}-${Math.min(i + batchSize, data.length)}`,
          status: 'error',
          error: error.message
        });
        console.error(`  ❌ エラー: ${error.message}`);
      }
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ログ保存
    const logContent = {
      timestamp: new Date().toISOString(),
      total_records: data.length,
      success_count: successCount,
      error_count: errorCount,
      details: importLog
    };
    
    await fs.writeFile(
      path.join(LOGS_DIR, 'supabase-import.log'),
      JSON.stringify(logContent, null, 2)
    );
    
    // 結果表示
    console.log('\n📊 インポート結果:');
    console.log(`  ✅ 成功: ${successCount}件`);
    console.log(`  ❌ エラー: ${errorCount}件`);
    console.log(`\n📁 ログファイル: logs/supabase-import.log`);
    
    if (successCount > 0) {
      console.log('\n🎉 Supabaseへのデータインポートが完了しました！');
      console.log('ベクトル検索を利用するには、別途エンベディング生成が必要です。');
    }
    
  } catch (error) {
    console.error('❌ インポート処理でエラーが発生しました:', error);
    
    // エラーログ保存
    await fs.writeFile(
      path.join(LOGS_DIR, 'supabase-import-error.log'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      }, null, 2)
    );
  }
}

// 実行
main();