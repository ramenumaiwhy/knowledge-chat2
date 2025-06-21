#!/usr/bin/env node

/**
 * EMLファイル処理スクリプト
 * Gmail AttachmentsフォルダのEMLファイルをCSV形式に変換
 * 原文の魅力を最大限保持しながら処理
 */

const fs = require('fs').promises;
const path = require('path');
const { simpleParser } = require('mailparser');
const csv = require('csv-stringify/sync');

// EMLファイルのディレクトリ
const EML_DIR = '/Users/aiharataketo/Downloads/Gmail Attachments';
const OUTPUT_DIR = path.join(__dirname, '..', 'data');

// 既存の最大IDを取得
async function getMaxId() {
  try {
    const processedCsv = await fs.readFile(path.join(OUTPUT_DIR, 'processed_knowledge.csv'), 'utf-8');
    const lines = processedCsv.split('\n').filter(line => line);
    if (lines.length <= 1) return 0;
    
    const lastLine = lines[lines.length - 1];
    const id = parseInt(lastLine.split(',')[0]);
    return isNaN(id) ? 0 : id;
  } catch (error) {
    console.log('既存CSVファイルが見つかりません。IDを0から開始します。');
    return 0;
  }
}

// プライバシー保護処理
function sanitizeContent(content) {
  // メールアドレスを削除
  content = content.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[メールアドレス削除]');
  
  // 実名っぽいものは保持（既に○○様の形式になっているはず）
  // 追加の処理は不要
  
  return content;
}

// キーワード抽出
function extractKeywords(title, content) {
  const keywords = new Set();
  
  // タイトルからキーワード抽出
  const titleKeywords = [
    'ナンパ', '声かけ', '女性', '恋愛', 'デート', 'アポ',
    '彼女', 'セックス', 'テクニック', 'トーク', 'ゲット',
    '美女', 'スト高', 'ストナン', '初心者', '上級者'
  ];
  
  titleKeywords.forEach(kw => {
    if (title.includes(kw) || content.includes(kw)) {
      keywords.add(kw);
    }
  });
  
  // チバさん特有の表現も追加
  const chibaKeywords = [
    '価値伝達', '止揚', 'アウフヘーベン', '型', 'ルーティン',
    'スキーム', '美女ナンパ', 'Work Hard,Play Hard'
  ];
  
  chibaKeywords.forEach(kw => {
    if (content.includes(kw)) {
      keywords.add(kw);
    }
  });
  
  // タイトルから特定のパターンを抽出
  if (title.includes('崩し方') || title.includes('崩す')) keywords.add('崩し方');
  if (title.includes('既婚')) keywords.add('既婚');
  if (title.includes('処女') || title.includes('処○')) keywords.add('処女');
  if (title.includes('別れ')) keywords.add('別れ');
  
  return Array.from(keywords).join(';');
}

// ターゲットグループと職業の推定
function extractTargetInfo(content) {
  let targetGroup = '';
  let occupation = '';
  
  // ターゲットグループの推定
  if (content.includes('学生') || content.includes('大学')) {
    targetGroup = '学生';
    occupation = '学生';
  } else if (content.includes('既婚') || content.includes('妻') || content.includes('嫁')) {
    targetGroup = '既婚者';
  } else if (content.includes('初心者') || content.includes('始めた')) {
    targetGroup = '初心者';
  } else if (content.includes('上級者') || content.includes('ベテラン')) {
    targetGroup = '上級者';
  } else {
    targetGroup = '一般';
  }
  
  // 職業の推定
  if (content.includes('サラリーマン') || content.includes('会社')) {
    occupation = occupation || 'サラリーマン';
  } else if (content.includes('経営') || content.includes('社長')) {
    occupation = '経営者';
  } else if (content.includes('自営')) {
    occupation = '自営業';
  }
  
  return { targetGroup, occupation };
}

// EMLファイルの処理
async function processEmlFile(filePath, baseId) {
  try {
    const emlContent = await fs.readFile(filePath, 'utf-8');
    const parsed = await simpleParser(emlContent);
    
    const title = parsed.subject || 'タイトルなし';
    const rawContent = parsed.text || parsed.html || '';
    const content = sanitizeContent(rawContent);
    const date = parsed.date || new Date();
    
    // 冒頭200文字を抜粋（要約ではない）
    const summary = content.substring(0, 200) + (content.length > 200 ? '...' : '');
    
    // キーワード抽出
    const keywords = extractKeywords(title, content);
    
    // ターゲット情報
    const { targetGroup, occupation } = extractTargetInfo(content);
    
    // processed_knowledge.csv用データ
    const processedData = {
      id: baseId,
      title: title,
      content: content, // 全文をそのまま保持
      summary: summary,
      category: 'メルマガ',
      content_type: 'email',
      keywords: keywords,
      date: date.toISOString().split('T')[0],
      target_group: targetGroup,
      occupation: occupation,
      original_length: content.length,
      processed_at: new Date().toISOString()
    };
    
    // knowledge.csv用データ（簡易版）
    const simpleData = {
      id: baseId,
      category: '恋愛相談',
      question: title.replace(/[_\.]/g, ' '), // タイトルを質問形式に
      answer: content, // チバさんの回答全文
      keywords: keywords,
      source: 'メール',
      updated_at: date.toISOString().split('T')[0]
    };
    
    return { processedData, simpleData };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return null;
  }
}

// メイン処理
async function main() {
  console.log('📧 EMLファイル処理を開始します...\n');
  
  try {
    // EMLファイル一覧を取得
    const files = await fs.readdir(EML_DIR);
    const emlFiles = files.filter(f => f.endsWith('.eml'));
    
    console.log(`📁 ${emlFiles.length}個のEMLファイルを発見しました\n`);
    
    // 既存の最大IDを取得
    const maxId = await getMaxId();
    console.log(`🔢 開始ID: ${maxId + 1}\n`);
    
    // 処理結果を格納
    const processedDataList = [];
    const simpleDataList = [];
    
    // 各EMLファイルを処理
    for (let i = 0; i < emlFiles.length; i++) {
      const file = emlFiles[i];
      const filePath = path.join(EML_DIR, file);
      const id = maxId + i + 1;
      
      console.log(`処理中 [${i + 1}/${emlFiles.length}]: ${file}`);
      
      const result = await processEmlFile(filePath, id);
      if (result) {
        processedDataList.push(result.processedData);
        simpleDataList.push(result.simpleData);
      }
    }
    
    console.log(`\n✅ ${processedDataList.length}件のファイルを正常に処理しました\n`);
    
    // CSV生成
    if (processedDataList.length > 0) {
      // processed_knowledge.csv用
      const processedCsv = csv.stringify(processedDataList, {
        header: true,
        columns: [
          'id', 'title', 'content', 'summary', 'category', 'content_type',
          'keywords', 'date', 'target_group', 'occupation', 'original_length', 'processed_at'
        ]
      });
      
      // knowledge.csv用
      const simpleCsv = csv.stringify(simpleDataList, {
        header: true,
        columns: ['id', 'category', 'question', 'answer', 'keywords', 'source', 'updated_at']
      });
      
      // ファイル保存
      await fs.writeFile(path.join(OUTPUT_DIR, 'new_emails_processed.csv'), processedCsv);
      await fs.writeFile(path.join(OUTPUT_DIR, 'new_emails_simple.csv'), simpleCsv);
      
      console.log('📝 CSVファイルを生成しました:');
      console.log('  - data/new_emails_processed.csv');
      console.log('  - data/new_emails_simple.csv\n');
      
      // サマリー表示
      console.log('📊 処理サマリー:');
      console.log(`  - 総文字数: ${processedDataList.reduce((sum, d) => sum + d.original_length, 0).toLocaleString()}文字`);
      console.log(`  - 平均文字数: ${Math.round(processedDataList.reduce((sum, d) => sum + d.original_length, 0) / processedDataList.length).toLocaleString()}文字`);
      console.log(`  - 最長記事: ${Math.max(...processedDataList.map(d => d.original_length)).toLocaleString()}文字`);
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// mailparserパッケージの確認
async function checkDependencies() {
  try {
    require('mailparser');
  } catch (error) {
    console.log('📦 必要なパッケージをインストールしています...');
    const { execSync } = require('child_process');
    execSync('npm install mailparser', { stdio: 'inherit' });
    console.log('✅ インストール完了\n');
  }
}

// 実行
(async () => {
  await checkDependencies();
  await main();
})();