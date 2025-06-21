#!/usr/bin/env node

/**
 * エンベディング用メタデータ生成スクリプト
 * Supabase投入用の準備データを作成
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

const EMBEDDINGS_DIR = path.join(__dirname, '..', 'data', 'embeddings');

async function main() {
  console.log('📊 エンベディング用メタデータを生成します...\n');
  
  try {
    // ディレクトリ作成
    await fs.mkdir(EMBEDDINGS_DIR, { recursive: true });
    
    // 新しいメールデータを読み込み
    const csvContent = await fs.readFile(
      path.join(__dirname, '..', 'data', 'new_emails_processed.csv'),
      'utf-8'
    );
    
    const data = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`📊 ${data.length}件のデータを処理します\n`);
    
    // メタデータを生成
    const metadata = data.map(record => ({
      id: parseInt(record.id),
      title: record.title,
      content_length: parseInt(record.original_length),
      keywords: record.keywords.split(';'),
      category: record.category,
      date: record.date,
      chunks_needed: Math.ceil(parseInt(record.original_length) / 2000),
      ready_for_embedding: true
    }));
    
    // 結果を保存
    const outputPath = path.join(EMBEDDINGS_DIR, 'new_emails_metadata.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(metadata, null, 2)
    );
    
    console.log(`✅ メタデータ生成が完了しました`);
    console.log(`📁 保存先: ${outputPath}\n`);
    
    // サマリー
    const totalChunks = metadata.reduce((sum, m) => sum + m.chunks_needed, 0);
    console.log(`📊 生成サマリー:`);
    console.log(`  - レコード数: ${metadata.length}`);
    console.log(`  - 推定総チャンク数: ${totalChunks}`);
    console.log(`  - 平均チャンク数: ${(totalChunks / metadata.length).toFixed(1)}`);
    console.log(`  - 最大チャンク数: ${Math.max(...metadata.map(m => m.chunks_needed))}`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();