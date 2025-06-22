const ChibaStyleInjector = require('./lib/style-injector');
const ChibaStyleValidator = require('./lib/style-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * n8nワークフローシミュレーター
 * 実際のn8nワークフローの処理を再現
 */
class N8nWorkflowSimulator {
  constructor() {
    this.injector = new ChibaStyleInjector();
    this.validator = new ChibaStyleValidator();
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.metrics = [];
  }

  async initialize() {
    await this.injector.initialize();
    await this.validator.initialize();
    console.log('✅ n8nシミュレーター初期化完了');
  }

  // ワークフロー全体の実行
  async executeWorkflow(userMessage) {
    const startTime = Date.now();
    const workflowId = `sim-${Date.now()}`;
    
    console.log(`\n🔄 ワークフロー実行開始: "${userMessage}"`);
    
    try {
      // Step 1: クエリ分析
      const queryAnalysis = await this.analyzeQuery(userMessage);
      console.log(`   📊 クエリタイプ: ${queryAnalysis.type}`);
      
      // Step 2: 検索（Supabase + CSV並列）
      const searchResults = await this.performSearch(userMessage, queryAnalysis);
      console.log(`   🔍 検索結果: ${searchResults.length}件`);
      
      // Step 3: Gemini生成
      const generatedText = await this.generateResponse(userMessage, searchResults);
      console.log(`   🤖 初期生成完了 (${generatedText.length}文字)`);
      
      // Step 4: CSDSスタイル注入と検証
      const csdsResult = await this.applyCSDSWithRetry(generatedText, queryAnalysis);
      
      // Step 5: メトリクス記録
      const totalTime = Date.now() - startTime;
      const metrics = {
        workflowId,
        userMessage,
        queryType: queryAnalysis.type,
        searchResultsCount: searchResults.length,
        initialScore: csdsResult.initialScore,
        finalScore: csdsResult.finalScore,
        attempts: csdsResult.attempts,
        totalTime,
        timestamp: new Date().toISOString()
      };
      
      this.metrics.push(metrics);
      
      console.log(`\n✅ ワークフロー完了`);
      console.log(`   最終スコア: ${csdsResult.finalScore}/100`);
      console.log(`   処理時間: ${totalTime}ms`);
      console.log(`   試行回数: ${csdsResult.attempts}`);
      
      return {
        response: csdsResult.styledText,
        metrics
      };
      
    } catch (error) {
      console.error('❌ ワークフローエラー:', error.message);
      throw error;
    }
  }

  // Step 1: クエリ分析
  async analyzeQuery(userMessage) {
    let queryType = 'general';
    
    if (userMessage.match(/こんにちは|おはよう|こんばんは|はじめまして/)) {
      queryType = 'greeting';
    } else if (userMessage.match(/どうすれば|教えて|困って|悩んで/)) {
      queryType = 'consultation';
    } else if (userMessage.includes('？') || userMessage.includes('?')) {
      queryType = 'question';
    }
    
    const keywords = userMessage.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]{2,}/g) || [];
    
    return {
      type: queryType,
      keywords: keywords.slice(0, 5),
      expandedKeywords: this.expandKeywords(keywords),
      originalQuery: userMessage,
      isGreeting: queryType === 'greeting'
    };
  }

  // キーワード展開
  expandKeywords(keywords) {
    const synonyms = {
      'ナンパ': ['声かけ', 'アプローチ', 'ストリートナンパ'],
      'デート': ['アポ', 'お茶', '食事'],
      '女性': ['女の子', '女子', '彼女'],
      '失敗': ['うまくいかない', 'ダメ', '振られる']
    };
    
    const expanded = [...keywords];
    keywords.forEach(keyword => {
      if (synonyms[keyword]) {
        expanded.push(...synonyms[keyword]);
      }
    });
    
    return [...new Set(expanded)];
  }

  // Step 2: 検索処理
  async performSearch(userMessage, queryAnalysis) {
    // Supabaseシミュレート（実際にはCSV検索）
    try {
      const csvPath = path.join(__dirname, 'data', 'knowledge.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      const rows = csvContent.split('\n').slice(1);
      
      const results = [];
      const searchTerms = queryAnalysis.expandedKeywords.join('|').toLowerCase();
      
      rows.forEach(row => {
        const cols = row.split(',');
        if (cols.length > 3) {
          const question = cols[2] || '';
          const answer = cols[3] || '';
          const keywords = cols[4] || '';
          
          const searchText = `${question} ${answer} ${keywords}`.toLowerCase();
          if (searchText.match(new RegExp(searchTerms))) {
            results.push({
              title: question,
              content: answer,
              summary: keywords,
              score: 0.8
            });
          }
        }
      });
      
      return results.slice(0, 3);
    } catch (error) {
      console.log('   ⚠️ 検索エラー、フォールバック使用');
      return [];
    }
  }

  // Step 3: Gemini生成
  async generateResponse(userMessage, searchResults) {
    const context = searchResults.map(r => `- ${r.title}: ${r.content}`).join('\n');
    
    const prompt = `あなたはナンパ師「チバ」です。以下の特徴を守って回答してください：

【チバの文体特徴】
- 「チバです。」で始める
- 「なぜか？」などの自問自答を使う
- 「〜と思うかもしれません」で読者の心理を先読みする
- 「ガンガン」「ゴリゴリ」などの特徴的な語彙を使う
- 短い段落で改行を多用する

ユーザーの質問: ${userMessage}

参考情報:
${context || 'なし'}

自然で説得力のある回答を生成してください。`;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.log('   ⚠️ Gemini APIエラー、デフォルト応答使用');
      return `チバです。

${userMessage}についてのご質問ですね。

失敗を恐れずにガンガン挑戦することが大切です。
経験を積めば必ず上達します。

結論。
まずは行動あるのみです。`;
    }
  }

  // Step 4: CSDSスタイル注入と検証（リトライ付き）
  async applyCSDSWithRetry(text, queryAnalysis, maxRetries = 3) {
    let currentText = text;
    let bestResult = null;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      attempts++;
      
      // スタイル強度を段階的に上げる
      const styleIntensity = 0.7 + (attempts - 1) * 0.1;
      queryAnalysis.styleIntensity = styleIntensity;
      
      // スタイル注入
      const styledText = await this.injector.injectStyle(currentText, queryAnalysis);
      
      // 検証
      const validation = await this.validator.validate(styledText);
      
      console.log(`   🎨 試行${attempts}: スコア${validation.totalScore}/100 (強度${styleIntensity})`);
      
      if (!bestResult || validation.totalScore > bestResult.finalScore) {
        bestResult = {
          styledText,
          initialScore: attempts === 1 ? validation.totalScore : bestResult.initialScore,
          finalScore: validation.totalScore,
          attempts,
          validation
        };
      }
      
      // 目標スコア達成で終了
      if (validation.totalScore >= 60) {
        break;
      }
      
      // 再生成用のテキストを準備
      if (attempts < maxRetries) {
        currentText = await this.regenerateWithHigherIntensity(currentText);
      }
    }
    
    return bestResult;
  }

  // 低スコア時の再生成
  async regenerateWithHigherIntensity(text) {
    const prompt = `以下の回答をもっとチバらしく書き直してください。必ず「なぜか？」という自問自答を含め、「ガンガン」「ゴリゴリ」などの語彙を増やしてください：

${text}

重要：チバです。で始めて、結論。で終わること。`;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      return text; // エラー時は元のテキストを返す
    }
  }

  // メトリクスレポート生成
  generateReport() {
    if (this.metrics.length === 0) {
      return 'メトリクスデータがありません。';
    }
    
    const avgInitialScore = this.metrics.reduce((sum, m) => sum + m.initialScore, 0) / this.metrics.length;
    const avgFinalScore = this.metrics.reduce((sum, m) => sum + m.finalScore, 0) / this.metrics.length;
    const avgTime = this.metrics.reduce((sum, m) => sum + m.totalTime, 0) / this.metrics.length;
    const avgAttempts = this.metrics.reduce((sum, m) => sum + m.attempts, 0) / this.metrics.length;
    
    const report = `
# n8nワークフローシミュレーション結果

## サマリー
- テストケース数: ${this.metrics.length}
- 平均初期スコア: ${avgInitialScore.toFixed(1)}/100
- 平均最終スコア: ${avgFinalScore.toFixed(1)}/100
- 平均改善率: ${((avgFinalScore - avgInitialScore) / avgInitialScore * 100).toFixed(1)}%
- 平均処理時間: ${avgTime.toFixed(0)}ms
- 平均試行回数: ${avgAttempts.toFixed(1)}

## 詳細結果
${this.metrics.map(m => `
### ${m.userMessage}
- クエリタイプ: ${m.queryType}
- 検索結果数: ${m.searchResultsCount}
- 初期スコア: ${m.initialScore}/100
- 最終スコア: ${m.finalScore}/100
- 改善率: ${((m.finalScore - m.initialScore) / m.initialScore * 100).toFixed(1)}%
- 処理時間: ${m.totalTime}ms
- 試行回数: ${m.attempts}
`).join('')}
`;
    
    return report;
  }
}

module.exports = N8nWorkflowSimulator;