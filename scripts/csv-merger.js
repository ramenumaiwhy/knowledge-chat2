const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const stringify = require('csv-stringify/sync');

// CSVファイルのパス
const KNOWLEDGE_PATH = path.join(__dirname, '../data/knowledge.csv');
const UPDATES_PATH = path.join(__dirname, '../data/updates.csv');

// CSVファイルを読み込んでマージ
function mergeCSVFiles() {
  try {
    // 既存のknowledge.csvを読み込み
    const knowledgeContent = fs.readFileSync(KNOWLEDGE_PATH, 'utf-8');
    const knowledgeData = csv.parse(knowledgeContent, {
      columns: true,
      skip_empty_lines: true
    });

    // updates.csvを読み込み
    const updatesContent = fs.readFileSync(UPDATES_PATH, 'utf-8');
    const updatesData = csv.parse(updatesContent, {
      columns: true,
      skip_empty_lines: true
    });

    if (updatesData.length === 0) {
      console.log('No updates to merge.');
      return;
    }

    // 最大IDを取得
    const maxId = Math.max(...knowledgeData.map(row => parseInt(row.id)));
    
    // 新しいデータにIDを割り当て
    updatesData.forEach((row, index) => {
      row.id = (maxId + index + 1).toString();
      row.updated_at = new Date().toISOString().split('T')[0];
    });

    // データをマージ
    const mergedData = [...knowledgeData, ...updatesData];

    // CSVに書き出し
    const output = stringify.stringify(mergedData, {
      header: true,
      columns: ['id', 'category', 'question', 'answer', 'keywords', 'source', 'updated_at']
    });

    fs.writeFileSync(KNOWLEDGE_PATH, output);
    console.log(`Merged ${updatesData.length} new entries.`);

    // updates.csvをクリア
    fs.writeFileSync(UPDATES_PATH, 'id,category,question,answer,keywords,source,updated_at\n');
    console.log('Cleared updates.csv');

  } catch (error) {
    console.error('Error merging CSV files:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  mergeCSVFiles();
}