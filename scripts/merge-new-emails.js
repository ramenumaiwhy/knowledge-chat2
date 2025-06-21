#!/usr/bin/env node

/**
 * 新しいメールデータを既存のCSVにマージ
 * processed_knowledge.csvとknowledge.csvの両方を更新
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');
const stringify = require('csv-stringify/sync');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function mergeProcessedKnowledge() {
  console.log('📋 processed_knowledge.csvのマージを開始...');
  
  try {
    // 既存のprocessed_knowledge.csvを読み込み
    const existingContent = await fs.readFile(
      path.join(DATA_DIR, 'processed_knowledge.csv'), 
      'utf-8'
    );
    const existingData = csv.parse(existingContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // 新しいデータを読み込み
    const newContent = await fs.readFile(
      path.join(DATA_DIR, 'new_emails_processed.csv'),
      'utf-8'
    );
    const newData = csv.parse(newContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // データをマージ
    const mergedData = [...existingData, ...newData];
    
    // CSVとして書き出し
    const outputCsv = stringify.stringify(mergedData, {
      header: true,
      columns: [
        'id', 'title', 'content', 'summary', 'category', 'content_type',
        'keywords', 'date', 'target_group', 'occupation', 'original_length', 'processed_at'
      ]
    });
    
    await fs.writeFile(
      path.join(DATA_DIR, 'processed_knowledge.csv'),
      outputCsv
    );
    
    console.log(`✅ processed_knowledge.csv: ${existingData.length} → ${mergedData.length} 件`);
    
  } catch (error) {
    console.error('❌ processed_knowledge.csvのマージでエラー:', error);
    throw error;
  }
}

async function mergeKnowledge() {
  console.log('📋 knowledge.csvのマージを開始...');
  
  try {
    // 既存のknowledge.csvを読み込み
    const existingContent = await fs.readFile(
      path.join(DATA_DIR, 'knowledge.csv'),
      'utf-8'
    );
    const existingData = csv.parse(existingContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // 新しいデータを読み込み
    const newContent = await fs.readFile(
      path.join(DATA_DIR, 'new_emails_simple.csv'),
      'utf-8'
    );
    const newData = csv.parse(newContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // データをマージ
    const mergedData = [...existingData, ...newData];
    
    // CSVとして書き出し
    const outputCsv = stringify.stringify(mergedData, {
      header: true,
      columns: ['id', 'category', 'question', 'answer', 'keywords', 'source', 'updated_at']
    });
    
    await fs.writeFile(
      path.join(DATA_DIR, 'knowledge.csv'),
      outputCsv
    );
    
    console.log(`✅ knowledge.csv: ${existingData.length} → ${mergedData.length} 件`);
    
  } catch (error) {
    console.error('❌ knowledge.csvのマージでエラー:', error);
    throw error;
  }
}

async function main() {
  console.log('🔄 新しいメールデータのマージを開始します...\n');
  
  try {
    // 両方のCSVファイルをマージ
    await mergeProcessedKnowledge();
    await mergeKnowledge();
    
    console.log('\n✨ マージが完了しました！');
    
    // バックアップとして新しいデータを保持
    console.log('\n📁 新しいデータファイルはバックアップとして保持されます:');
    console.log('  - data/new_emails_processed.csv');
    console.log('  - data/new_emails_simple.csv');
    
  } catch (error) {
    console.error('\n❌ マージ処理でエラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();