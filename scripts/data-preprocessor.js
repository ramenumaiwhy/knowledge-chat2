const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');
const { stringify } = require('csv-stringify');

/**
 * データ前処理スクリプト
 * combined_blog_mail_pdf.csvを最適化してSupabase用に変換
 */

class DataPreprocessor {
  constructor() {
    this.duplicateHashes = new Set();
    this.processedData = [];
  }

  // 簡単なハッシュ関数
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash;
  }

  // 重複チェック
  isDuplicate(content) {
    const hash = this.simpleHash(content);
    if (this.duplicateHashes.has(hash)) {
      return true;
    }
    this.duplicateHashes.add(hash);
    return false;
  }

  // スマートな切り詰め（文の境界で切る）
  smartTruncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('。');
    const lastNewline = truncated.lastIndexOf('\n');
    
    const cutPoint = Math.max(lastSentence, lastNewline);
    
    if (cutPoint > maxLength * 0.7) {
      return truncated.substring(0, cutPoint + 1);
    }
    
    return truncated + '...';
  }

  // サマリー抽出
  extractSummary(content, maxLength = 200) {
    // 最初の段落または最初の200文字
    const firstParagraph = content.split('\n')[0];
    if (firstParagraph.length <= maxLength) {
      return firstParagraph;
    }
    return this.smartTruncate(firstParagraph, maxLength);
  }

  // キーワード抽出（簡易版）
  extractKeywords(content, maxCount = 10) {
    const keywords = [];
    
    // よく出現する単語を抽出
    const commonWords = ['ナンパ', 'チバ', '女性', '恋愛', 'トーク', 'テクニック', 
                        'アプローチ', 'スキル', 'コツ', 'ポイント', '方法', '経験'];
    
    commonWords.forEach(word => {
      if (content.includes(word)) {
        keywords.push(word);
      }
    });
    
    return keywords.slice(0, maxCount);
  }

  // データ品質チェック
  isValidEntry(entry) {
    if (!entry.content || entry.content.length < 500) return false;
    if (entry.content.length > 15000) return false;
    if (this.isDuplicate(entry.content)) return false;
    
    // メルマガのフッターのみの場合を除外
    if (entry.content.includes('解除URL') && entry.content.length < 1000) return false;
    
    return true;
  }

  // カテゴリ正規化
  normalizeCategory(category) {
    if (!category) return 'その他';
    
    const categoryMap = {
      'メール': 'メルマガ',
      'ブログ': 'ブログ',
      'PDF': '書籍・PDF',
      '': 'その他'
    };
    
    return categoryMap[category] || category;
  }

  // メイン処理
  async processCSV(inputPath, outputPath) {
    console.log('データ前処理開始...');
    
    const records = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(inputPath)
        .pipe(csv.parse({ 
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true
        }))
        .on('data', (data) => {
          try {
            if (this.isValidEntry(data)) {
              const processed = {
                id: parseInt(data.id) || records.length + 1,
                title: this.smartTruncate(data.title || 'タイトルなし', 200),
                content: this.smartTruncate(data.content, 4000),
                summary: this.extractSummary(data.content),
                category: this.normalizeCategory(data.category),
                content_type: data.category === 'メール' ? 'email' : 
                             data.category === 'ブログ' ? 'blog' : 'pdf',
                keywords: this.extractKeywords(data.content),
                date: data.date || data.updated_at || new Date().toISOString(),
                target_group: data.target_group || null,
                occupation: data.occupation || null,
                original_length: data.content.length,
                processed_at: new Date().toISOString()
              };
              
              records.push(processed);
            }
          } catch (error) {
            console.error('行の処理でエラー:', error);
          }
        })
        .on('end', () => {
          console.log(`処理完了: ${records.length}件のデータを処理`);
          
          // 重要度でソート（長さと内容の充実度で判定）
          records.sort((a, b) => {
            const scoreA = a.content.length + (a.keywords.length * 100);
            const scoreB = b.content.length + (b.keywords.length * 100);
            return scoreB - scoreA;
          });
          
          // 上位800件のみ保持
          const finalData = records.slice(0, 800);
          
          // CSV出力
          stringify(finalData, { 
            header: true,
            columns: [
              'id', 'title', 'content', 'summary', 'category', 
              'content_type', 'keywords', 'date', 'target_group', 
              'occupation', 'original_length', 'processed_at'
            ]
          }, (err, output) => {
            if (err) {
              reject(err);
            } else {
              fs.writeFileSync(outputPath, output);
              console.log(`最適化済みデータを出力: ${outputPath}`);
              console.log(`最終データ数: ${finalData.length}件`);
              
              // 統計情報出力
              this.printStatistics(finalData);
              resolve(finalData);
            }
          });
        })
        .on('error', reject);
    });
  }

  // 統計情報表示
  printStatistics(data) {
    const totalSize = data.reduce((sum, item) => sum + item.content.length, 0);
    const avgSize = Math.round(totalSize / data.length);
    
    const categories = {};
    data.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
    });
    
    console.log('\n=== 処理統計 ===');
    console.log(`総データ数: ${data.length}件`);
    console.log(`平均サイズ: ${avgSize}文字`);
    console.log(`総サイズ: ${(totalSize / 1024).toFixed(1)}KB`);
    console.log(`推定DB容量: ${((totalSize + data.length * 3080) / 1024 / 1024).toFixed(1)}MB`);
    console.log('\nカテゴリ別:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}件`);
    });
  }
}

// 実行部分
async function main() {
  const processor = new DataPreprocessor();
  const inputPath = path.join(__dirname, '../data/combined_blog_mail_pdf.csv');
  const outputPath = path.join(__dirname, '../data/processed_knowledge.csv');
  
  try {
    await processor.processCSV(inputPath, outputPath);
    console.log('\n✅ データ前処理が完了しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = DataPreprocessor;