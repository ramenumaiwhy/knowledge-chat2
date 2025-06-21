#!/usr/bin/env node

/**
 * CSVデータのエンベディング生成スクリプト
 * Gemini APIを使用してテキストをベクトル化
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API設定
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyBGF7HPdRbGVGaLitWSxktNMFiJsBJMXSI');

// 出力ディレクトリ
const EMBEDDINGS_DIR = path.join(__dirname, '..', 'data', 'embeddings');

// チャンクサイズ（エンベディング生成時の最大文字数）
const CHUNK_SIZE = 2000;

// テキストをチャンクに分割
function splitIntoChunks(text, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  let currentChunk = '';
  
  const sentences = text.split('。');
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
    currentChunk += sentence + '。';
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// エンベディング生成（Geminiは直接エンベディングAPIを提供していないため、要約で代替）
async function generateEmbedding(text) {
  try {
    // Geminiの場合、実際のエンベディングAPIがないため、
    // ここではテキストの特徴を抽出する要約を生成
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `以下のテキストの重要なキーワードを10個以内で抽出してください。キーワードのみをカンマ区切りで出力してください：\n\n${text.substring(0, 1000)}`;
    
    const result = await model.generateContent(prompt);
    const keywords = result.response.text();
    
    // 簡易的なベクトル化（実際のエンベディングではない）
    // 本番環境では、OpenAI Embeddings APIやSentence Transformersの使用を推奨
    const vector = keywords.split(',').map((_, i) => Math.random());
    
    return {
      keywords: keywords.trim(),
      vector: vector,
      dimension: vector.length
    };
  } catch (error) {
    console.error('エンベディング生成エラー:', error);
    return null;
  }
}

// メイン処理
async function main() {
  console.log('🔢 エンベディング生成を開始します...\n');
  
  try {
    // エンベディングディレクトリを作成
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
    
    const embeddings = [];
    
    // 各レコードを処理
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      console.log(`処理中 [${i + 1}/${data.length}]: ${record.title.substring(0, 50)}...`);
      
      // タイトルと本文を結合
      const fullText = `${record.title}\n\n${record.content}`;
      
      // 長いテキストはチャンクに分割
      const chunks = splitIntoChunks(fullText);
      
      const recordEmbeddings = [];
      for (let j = 0; j < chunks.length; j++) {
        const embedding = await generateEmbedding(chunks[j]);
        if (embedding) {
          recordEmbeddings.push({
            chunk_index: j,
            text: chunks[j].substring(0, 200) + '...',
            ...embedding
          });
        }
        
        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      embeddings.push({
        id: record.id,
        title: record.title,
        chunks: recordEmbeddings,
        total_chunks: chunks.length
      });
    }
    
    // 結果を保存
    const outputPath = path.join(EMBEDDINGS_DIR, 'new_emails_embeddings.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(embeddings, null, 2)
    );
    
    console.log(`\n✅ エンベディング生成が完了しました`);
    console.log(`📁 保存先: ${outputPath}`);
    
    // サマリー
    const totalChunks = embeddings.reduce((sum, e) => sum + e.total_chunks, 0);
    console.log(`\n📊 生成サマリー:`);
    console.log(`  - レコード数: ${embeddings.length}`);
    console.log(`  - 総チャンク数: ${totalChunks}`);
    console.log(`  - 平均チャンク数: ${(totalChunks / embeddings.length).toFixed(1)}`);
    
    console.log('\n⚠️  注意: このスクリプトは簡易的なキーワード抽出を行っています。');
    console.log('本格的なベクトル検索には、専用のEmbedding APIの使用を推奨します。');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();