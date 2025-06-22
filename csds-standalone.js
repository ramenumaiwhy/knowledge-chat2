const ChibaStyleInjector = require('./lib/style-injector');
const ChibaStyleValidator = require('./lib/style-validator');

/**
 * CSDSスタンドアロン実装
 * n8n依存なしで動作する版
 */
class CSDSStandalone {
  constructor() {
    this.injector = new ChibaStyleInjector();
    this.validator = new ChibaStyleValidator();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.injector.initialize();
    await this.validator.initialize();
    this.initialized = true;
  }

  /**
   * テキストを処理（n8nノードのexecuteメソッドを模倣）
   */
  async processText(text, options = {}) {
    await this.initialize();
    
    const {
      operation = 'both',
      queryType = 'general',
      styleIntensity = 0.7,
      minScore = 50,
      maxRetries = 3
    } = options;

    const result = {
      originalText: text,
      operation,
      timestamp: new Date().toISOString()
    };

    // クエリ分析オブジェクトを構築
    const queryAnalysis = {
      type: queryType,
      keywords: [],
      expandedKeywords: [],
      originalQuery: text,
      isGreeting: queryType === 'greeting',
      styleIntensity
    };

    // スタイル注入
    if (operation === 'inject' || operation === 'both') {
      result.styledText = await this.injector.injectStyle(text, queryAnalysis);
    }

    // スタイル検証
    if (operation === 'validate' || operation === 'both') {
      const textToValidate = result.styledText || text;
      const validationResult = await this.validator.validate(textToValidate);
      
      result.validation = {
        totalScore: validationResult.totalScore,
        grade: validationResult.grade,
        isAuthentic: validationResult.isAuthentic,
        scores: validationResult.scores,
        feedback: validationResult.feedback
      };
    }

    // 両方の操作でリトライ処理
    if (operation === 'both' && result.validation.totalScore < minScore) {
      result.attempts = 1;
      
      for (let i = 1; i < maxRetries && result.validation.totalScore < minScore; i++) {
        result.attempts++;
        
        // スタイル強度を上げて再試行
        const newIntensity = Math.min(1, styleIntensity + (i * 0.1));
        queryAnalysis.styleIntensity = newIntensity;
        
        result.styledText = await this.injector.injectStyle(text, queryAnalysis);
        const newValidation = await this.validator.validate(result.styledText);
        
        result.validation = {
          totalScore: newValidation.totalScore,
          grade: newValidation.grade,
          isAuthentic: newValidation.isAuthentic,
          scores: newValidation.scores,
          feedback: newValidation.feedback
        };
        
        result.finalIntensity = newIntensity;
      }
    }

    return result;
  }

  /**
   * バッチ処理
   */
  async processBatch(texts, options = {}) {
    const results = [];
    
    for (let i = 0; i < texts.length; i++) {
      console.log(`処理中 ${i + 1}/${texts.length}...`);
      const result = await this.processText(texts[i], options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 比較分析
   */
  async compareTexts(originalText, styledTexts) {
    await this.initialize();
    
    const results = {
      original: await this.validator.validate(originalText),
      styled: []
    };
    
    for (const styledText of styledTexts) {
      const validation = await this.validator.validate(styledText);
      results.styled.push({
        text: styledText,
        validation
      });
    }
    
    // 最高スコアのテキストを特定
    results.best = results.styled.reduce((best, current) => {
      return current.validation.totalScore > best.validation.totalScore ? current : best;
    });
    
    return results;
  }

  /**
   * パフォーマンステスト
   */
  async performanceTest(text, iterations = 10) {
    const times = [];
    const scores = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const result = await this.processText(text, { operation: 'both' });
      const time = Date.now() - start;
      
      times.push(time);
      scores.push(result.validation.totalScore);
    }
    
    return {
      avgTime: times.reduce((a, b) => a + b) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      avgScore: scores.reduce((a, b) => a + b) / scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores)
    };
  }
}

// CLIインターフェース
if (require.main === module) {
  const csds = new CSDSStandalone();
  
  async function cli() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log(`
使い方:
  node csds-standalone.js [オプション] "テキスト"

オプション:
  --inject     スタイル注入のみ
  --validate   検証のみ
  --both       両方（デフォルト）
  --type       クエリタイプ (greeting|consultation|question|general)
  --intensity  スタイル強度 (0-1, デフォルト: 0.7)
  --min-score  最低スコア (デフォルト: 50)
  --retries    最大リトライ回数 (デフォルト: 3)

例:
  node csds-standalone.js --type greeting "こんにちは"
  node csds-standalone.js --intensity 0.9 "ナンパのコツを教えて"
      `);
      process.exit(0);
    }
    
    // オプション解析
    const options = {
      operation: 'both',
      queryType: 'general',
      styleIntensity: 0.7,
      minScore: 50,
      maxRetries: 3
    };
    
    let text = '';
    
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--inject':
          options.operation = 'inject';
          break;
        case '--validate':
          options.operation = 'validate';
          break;
        case '--both':
          options.operation = 'both';
          break;
        case '--type':
          options.queryType = args[++i];
          break;
        case '--intensity':
          options.styleIntensity = parseFloat(args[++i]);
          break;
        case '--min-score':
          options.minScore = parseInt(args[++i]);
          break;
        case '--retries':
          options.maxRetries = parseInt(args[++i]);
          break;
        default:
          text = args[i];
      }
    }
    
    if (!text) {
      console.error('エラー: テキストが指定されていません');
      process.exit(1);
    }
    
    try {
      console.log('処理中...\n');
      const result = await csds.processText(text, options);
      
      console.log('=== 結果 ===');
      console.log('元のテキスト:', result.originalText);
      
      if (result.styledText) {
        console.log('\nスタイル適用後:');
        console.log(result.styledText);
      }
      
      if (result.validation) {
        console.log('\n検証結果:');
        console.log(`総合スコア: ${result.validation.totalScore}/100 (${result.validation.grade})`);
        console.log(`判定: ${result.validation.isAuthentic ? '✅ チバらしい' : '❌ 改善が必要'}`);
        console.log('\n詳細スコア:');
        console.log(`- 語彙: ${result.validation.scores.vocabulary}/25`);
        console.log(`- 構造: ${result.validation.scores.structure}/25`);
        console.log(`- 修辞: ${result.validation.scores.rhetoric}/25`);
        console.log(`- 感情: ${result.validation.scores.emotion}/25`);
        
        if (result.attempts) {
          console.log(`\n試行回数: ${result.attempts}`);
          console.log(`最終強度: ${result.finalIntensity || options.styleIntensity}`);
        }
      }
      
    } catch (error) {
      console.error('エラー:', error.message);
      process.exit(1);
    }
  }
  
  cli();
}

module.exports = CSDSStandalone;