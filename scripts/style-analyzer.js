const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');
const kuromoji = require('kuromoji');

/**
 * Chiba Style DNA Analyzer
 * チバさんの文体特徴を分析し、スタイルDNAを抽出する
 */
class ChibaStyleAnalyzer {
  constructor() {
    this.tokenizer = null;
    this.styleDNA = {
      vocabulary: {
        emotional: {},
        philosophical: {},
        unique: {},
        frequency: {}
      },
      structure: {
        sentencePatterns: [],
        paragraphPatterns: [],
        punctuationPatterns: {}
      },
      rhetoric: {
        questions: [],
        anticipation: [],
        selfDialogue: [],
        transitions: []
      },
      particlePatterns: {
        bigrams: {},
        sequences: []
      }
    };
  }

  // 形態素解析器の初期化
  async initialize() {
    return new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
        if (err) {
          reject(err);
        } else {
          this.tokenizer = tokenizer;
          resolve();
        }
      });
    });
  }

  // チバさん特有の語彙辞書
  getCharacteristicVocabulary() {
    return {
      emotional: {
        disgust: ['ゲボが出る', '心底嫌い', 'ダッサイ', 'ゲボが出るくらい'],
        encouragement: ['ガンガン', 'ゴリゴリ', 'どんどん', 'ゴリゴリに活動'],
        surprise: ['はあ！？', '意味が分からない', 'なぜか？'],
        confidence: ['断言します', '結論', '間違いなく']
      },
      philosophical: [
        '止揚する', 'アウフヘーベン', '無頼', '究極の無頼',
        '血肉として', '本質的', '控えめに言って'
      ],
      unique: [
        'Work Hard,Play Hard', 'システムを作ること', '実力を得ること',
        'からです。', 'というわけです。', 'なのです。',
        'そう思うかもしれません', 'と思うかもしれません'
      ],
      transitions: [
        'さて、', 'ですが。', 'なぜか？', 'ということは？',
        'では実際に', 'つまり', 'もちろん'
      ]
    };
  }

  // テキストから段落構造を分析
  analyzeParagraphStructure(text) {
    // CSVでは改行情報が失われているため、文の区切りでチバさんらしい短い段落を推定
    // チバさんの特徴: 1-3文で改行、短い段落構成
    const sentences = text.split(/[。！？]/).filter(s => s.trim());
    const patterns = [];
    
    // 3文ずつグループ化して擬似的な段落を作成
    for (let i = 0; i < sentences.length; i += 2) {
      const paragraphSentences = sentences.slice(i, Math.min(i + 3, sentences.length));
      const para = paragraphSentences.join('。') + '。';
      
      if (para.length > 10) { // 極端に短い段落を除外
        patterns.push({
          length: para.length,
          sentenceCount: paragraphSentences.length,
          startsWithTransition: this.startsWithTransition(para),
          endsWithRhetorical: this.endsWithRhetoricalQuestion(para),
          hasLineBreaks: 0 // CSVでは改行情報なし
        });
      }
    }

    return patterns;
  }

  // 文が遷移語で始まるかチェック
  startsWithTransition(text) {
    const transitions = ['さて', 'ですが', 'なぜなら', 'つまり', 'ただ', 'では'];
    return transitions.some(t => text.trim().startsWith(t));
  }

  // 修辞疑問で終わるかチェック
  endsWithRhetoricalQuestion(text) {
    return /[かな？|でしょうか？|ですか？|のか？]$/.test(text.trim());
  }

  // 助詞の連続パターンを分析
  analyzeParticlePatterns(text) {
    if (!this.tokenizer) return {};
    
    const tokens = this.tokenizer.tokenize(text);
    const particles = tokens.filter(t => t.pos === '助詞');
    const bigrams = {};
    
    for (let i = 0; i < particles.length - 1; i++) {
      const bigram = `${particles[i].surface_form}+${particles[i + 1].surface_form}`;
      bigrams[bigram] = (bigrams[bigram] || 0) + 1;
    }
    
    return bigrams;
  }

  // 特徴的な文末表現を抽出
  analyzeSentenceEndings(text) {
    const sentences = text.split(/[。！？]/);
    const endings = {};
    
    sentences.forEach(sentence => {
      if (sentence.trim()) {
        const ending = this.extractEnding(sentence.trim());
        if (ending) {
          endings[ending] = (endings[ending] || 0) + 1;
        }
      }
    });
    
    return endings;
  }

  // 文末表現を抽出
  extractEnding(sentence) {
    const patterns = [
      /です。?$/,
      /ます。?$/,
      /ですね。?$/,
      /でしょう。?$/,
      /かもしれません。?$/,
      /と思います。?$/,
      /からです。?$/,
      /のです。?$/,
      /ということです。?$/
    ];
    
    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (match) return match[0];
    }
    
    return null;
  }

  // 自問自答パターンを検出
  detectSelfDialogue(text) {
    const patterns = [];
    const questionMarkers = [
      'なぜか？', 'なぜか?', 'なぜなら',
      'どうなるか？', 'どうなるか?',
      'ということは？', 'ということは?',
      'それは何か？', 'それは何か?',
      'どういうことか？', 'どういうことか?'
    ];
    
    questionMarkers.forEach(marker => {
      const index = text.indexOf(marker);
      if (index !== -1) {
        // マーカーを含む文脈を抽出
        const start = Math.max(0, text.lastIndexOf('。', index - 1) + 1);
        const end = text.indexOf('。', index);
        if (end !== -1) {
          patterns.push(text.substring(start, end + 1).trim());
        }
      }
    });
    
    return [...new Set(patterns)]; // 重複を除去
  }

  // 読者心理の先読みパターンを検出
  detectReaderAnticipation(text) {
    const patterns = [];
    const anticipationMarkers = [
      'と思うかもしれません',
      'と思うかもしれませんが',
      'という意見があるかもしれませんが',
      'と感じるかもしれません',
      'はあ！？と思うかもしれません'
    ];
    
    anticipationMarkers.forEach(marker => {
      if (text.includes(marker)) {
        const regex = new RegExp(`[^。]*${marker}[^。]*。`, 'g');
        const matches = text.match(regex);
        if (matches) {
          patterns.push(...matches);
        }
      }
    });
    
    return patterns;
  }

  // CSVファイルからチバさんのテキストを読み込み
  async loadChibaTexts() {
    const csvPath = path.join(__dirname, '../data/processed_knowledge.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // チバさんのメルマガコンテンツをフィルタリング
    return records
      .filter(r => r.content && r.content.includes('チバです'))
      .map(r => r.content);
  }

  // メインの分析処理
  async analyze() {
    console.log('🔍 チバさんのスタイルDNA分析を開始...\n');
    
    await this.initialize();
    const texts = await this.loadChibaTexts();
    console.log(`📚 ${texts.length}件のテキストを分析します\n`);
    
    const vocab = this.getCharacteristicVocabulary();
    
    texts.forEach((text, index) => {
      console.log(`分析中... ${index + 1}/${texts.length}`);
      
      // 語彙頻度分析
      Object.entries(vocab.emotional).forEach(([emotion, words]) => {
        words.forEach(word => {
          if (text.includes(word)) {
            this.styleDNA.vocabulary.frequency[word] = 
              (this.styleDNA.vocabulary.frequency[word] || 0) + 1;
          }
        });
      });
      
      // 段落構造分析
      const paragraphPatterns = this.analyzeParagraphStructure(text);
      this.styleDNA.structure.paragraphPatterns.push(...paragraphPatterns);
      
      // 助詞パターン分析
      const particleBigrams = this.analyzeParticlePatterns(text);
      Object.entries(particleBigrams).forEach(([bigram, count]) => {
        this.styleDNA.particlePatterns.bigrams[bigram] = 
          (this.styleDNA.particlePatterns.bigrams[bigram] || 0) + count;
      });
      
      // 文末表現分析
      const endings = this.analyzeSentenceEndings(text);
      Object.entries(endings).forEach(([ending, count]) => {
        this.styleDNA.structure.punctuationPatterns[ending] = 
          (this.styleDNA.structure.punctuationPatterns[ending] || 0) + count;
      });
      
      // 修辞技法分析
      const selfDialogue = this.detectSelfDialogue(text);
      const anticipation = this.detectReaderAnticipation(text);
      
      if (selfDialogue.length > 0) {
        this.styleDNA.rhetoric.selfDialogue.push(...selfDialogue);
      }
      if (anticipation.length > 0) {
        this.styleDNA.rhetoric.anticipation.push(...anticipation);
      }
    });
    
    // 統計情報の計算
    this.calculateStatistics();
    
    return this.styleDNA;
  }

  // 統計情報を計算
  calculateStatistics() {
    // 段落の平均長と分布
    const paragraphLengths = this.styleDNA.structure.paragraphPatterns.map(p => p.length);
    const avgParagraphLength = paragraphLengths.length > 0
      ? paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length
      : 0;
    
    // 文の数の平均
    const avgSentenceCount = this.styleDNA.structure.paragraphPatterns.length > 0
      ? this.styleDNA.structure.paragraphPatterns.reduce((sum, p) => sum + p.sentenceCount, 0) / this.styleDNA.structure.paragraphPatterns.length
      : 0;
    
    // 最頻出の助詞パターン上位10
    const topParticleBigrams = Object.entries(this.styleDNA.particlePatterns.bigrams)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // 最頻出の文末表現上位10
    const topEndings = Object.entries(this.styleDNA.structure.punctuationPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    this.styleDNA.statistics = {
      avgParagraphLength: Math.round(avgParagraphLength),
      avgSentenceCount: Math.round(avgSentenceCount * 10) / 10,
      topParticleBigrams,
      topEndings,
      totalSelfDialogue: this.styleDNA.rhetoric.selfDialogue.length,
      totalAnticipation: this.styleDNA.rhetoric.anticipation.length
    };
  }

  // 分析結果を保存
  async saveStyleDNA() {
    const outputPath = path.join(__dirname, '../data/chiba-style-dna.json');
    await fs.writeFile(outputPath, JSON.stringify(this.styleDNA, null, 2), 'utf-8');
    console.log(`\n✅ スタイルDNAを保存しました: ${outputPath}`);
  }

  // レポートを生成
  generateReport() {
    console.log('\n📊 チバスタイルDNA分析レポート');
    console.log('=' .repeat(50));
    
    console.log('\n【特徴的な語彙トップ10】');
    Object.entries(this.styleDNA.vocabulary.frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([word, count], i) => {
        console.log(`${i + 1}. "${word}" - ${count}回`);
      });
    
    console.log('\n【助詞連続パターントップ10】');
    this.styleDNA.statistics.topParticleBigrams.forEach(([pattern, count], i) => {
      console.log(`${i + 1}. "${pattern}" - ${count}回`);
    });
    
    console.log('\n【文末表現トップ10】');
    this.styleDNA.statistics.topEndings.forEach(([ending, count], i) => {
      console.log(`${i + 1}. "${ending}" - ${count}回`);
    });
    
    console.log('\n【段落構造】');
    console.log(`平均段落長: ${this.styleDNA.statistics.avgParagraphLength}文字`);
    console.log(`平均文数/段落: ${this.styleDNA.statistics.avgSentenceCount}文`);
    
    console.log('\n【修辞技法】');
    console.log(`自問自答パターン: ${this.styleDNA.statistics.totalSelfDialogue}個`);
    console.log(`読者心理先読み: ${this.styleDNA.statistics.totalAnticipation}個`);
  }
}

// メイン実行
async function main() {
  try {
    const analyzer = new ChibaStyleAnalyzer();
    await analyzer.analyze();
    await analyzer.saveStyleDNA();
    analyzer.generateReport();
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = ChibaStyleAnalyzer;