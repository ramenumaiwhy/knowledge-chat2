const ChibaStyleInjector = require('../lib/style-injector');
const ChibaStyleValidator = require('../lib/style-validator');

/**
 * CSDS (Chiba Style DNA System) テストスイート
 */
class CSDSTestSuite {
  constructor() {
    this.injector = new ChibaStyleInjector();
    this.validator = new ChibaStyleValidator();
  }

  // テストケース
  getTestCases() {
    return [
      {
        name: '挨拶への応答',
        input: 'こんにちは',
        queryAnalysis: {
          type: 'greeting',
          keywords: ['こんにちは'],
          expandedKeywords: ['こんにちは', '挨拶'],
          originalQuery: 'こんにちは',
          isGreeting: true
        }
      },
      {
        name: 'ナンパの相談',
        input: 'ナンパがうまくいきません。どうすればいいですか？',
        queryAnalysis: {
          type: 'consultation',
          keywords: ['ナンパ', 'うまくいきません'],
          expandedKeywords: ['ナンパ', '声かけ', 'アプローチ', 'うまくいかない'],
          originalQuery: 'ナンパがうまくいきません。どうすればいいですか？',
          isGreeting: false
        }
      },
      {
        name: '一般的な質問',
        input: 'デートに誘うタイミングはいつがいいですか？',
        queryAnalysis: {
          type: 'question',
          keywords: ['デート', '誘う', 'タイミング'],
          expandedKeywords: ['デート', 'アポ', '誘う', 'タイミング'],
          originalQuery: 'デートに誘うタイミングはいつがいいですか？',
          isGreeting: false
        }
      }
    ];
  }

  // スタイル注入テスト
  async testStyleInjection() {
    console.log('🧪 スタイル注入テスト開始\n');
    
    await this.injector.initialize();
    const testCases = this.getTestCases();
    
    for (const testCase of testCases) {
      console.log(`\n📝 テストケース: ${testCase.name}`);
      console.log(`入力: "${testCase.input}"`);
      console.log('-'.repeat(50));
      
      // 基本的な回答を生成（シミュレート）
      const baseResponse = this.generateBaseResponse(testCase.input);
      console.log('【元の回答】');
      console.log(baseResponse);
      
      // スタイル注入を適用
      const styledResponse = await this.injector.injectStyle(baseResponse, testCase.queryAnalysis);
      console.log('\n【スタイル注入後】');
      console.log(styledResponse);
    }
  }

  // 基本的な回答を生成（Gemini APIのシミュレート）
  generateBaseResponse(query) {
    const responses = {
      'こんにちは': 'こんにちは。今日はどのようなご質問でしょうか。ナンパやデートについて、何でもお聞きください。',
      'ナンパがうまくいきません。どうすればいいですか？': 'ナンパがうまくいかないときは、まず自分のアプローチ方法を見直すことが大切です。声かけの仕方、タイミング、場所選びなど、様々な要素があります。最初は失敗しても、経験を積むことで必ず上達します。',
      'デートに誘うタイミングはいつがいいですか？': 'デートに誘うタイミングは、相手との関係性によって変わります。一般的には、何度か会話を重ねて、お互いに興味を持っていることが確認できたタイミングが良いでしょう。急ぎすぎず、かといって遅すぎないタイミングを見極めることが重要です。'
    };
    
    return responses[query] || '質問にお答えします。具体的な状況を教えていただければ、より詳しいアドバイスができます。';
  }

  // スタイル検証テスト
  async testStyleValidation() {
    console.log('\n\n🧪 スタイル検証テスト開始\n');
    
    await this.validator.initialize();
    
    // テスト用テキスト
    const testTexts = [
      {
        name: '良いチバスタイルの例',
        text: `チバです。

なるほど、
ナンパがうまくいかないんですね。


でも大丈夫です。
実は私も最初はそうでした。


なぜか？
それは経験が足りないだけだからです。


ガンガン声をかけていけば、
必ず上達します。


と思うかもしれませんが、
これは本当です。


結論。
失敗を恐れずにゴリゴリ活動することが、
成功への第一歩です。`
      },
      {
        name: '悪いスタイルの例',
        text: 'こんにちは。ナンパについてのアドバイスですね。まず最初に言えることは、自信を持つことが大切だということです。女性は自信のある男性に惹かれる傾向があります。また、清潔感も重要です。服装や髪型に気を使い、良い印象を与えることを心がけましょう。'
      }
    ];
    
    for (const testText of testTexts) {
      console.log(`\n📝 テストケース: ${testText.name}`);
      console.log('-'.repeat(50));
      
      const result = await this.validator.validate(testText.text);
      
      console.log('\n【検証結果】');
      console.log(`総合スコア: ${result.totalScore}/100`);
      console.log(`成績: ${result.grade}`);
      console.log(`チバらしさ判定: ${result.isAuthentic ? '✅ 合格' : '❌ 不合格'}`);
      
      console.log('\n【詳細スコア】');
      console.log(`語彙: ${result.scores.vocabulary}/25`);
      console.log(`構造: ${result.scores.structure}/25`);
      console.log(`修辞: ${result.scores.rhetoric}/25`);
      console.log(`感情: ${result.scores.emotion}/25`);
      
      console.log('\n【特徴的な要素】');
      const chibaOpening = testText.text.startsWith('チバです');
      const paragraphCount = testText.text.split(/\n\n+/).filter(p => p.trim()).length;
      const selfDialogueCount = (testText.text.match(/なぜか？|どうなるか？|ということは？/g) || []).length;
      const anticipationCount = (testText.text.match(/と思うかもしれません|と感じるかもしれません/g) || []).length;
      const characteristicWords = ['ガンガン', 'ゴリゴリ', 'どんどん', '結論'].filter(word => testText.text.includes(word));
      
      console.log(`チバで始まる: ${chibaOpening ? '✅' : '❌'}`);
      console.log(`段落数: ${paragraphCount}`);
      console.log(`自問自答: ${selfDialogueCount}回`);
      console.log(`読者心理先読み: ${anticipationCount}回`);
      console.log(`特徴的な語彙: ${characteristicWords.join(', ')}`);
      
      console.log('\n【フィードバック】');
      result.feedback.forEach(fb => console.log(`- ${fb}`));
    }
  }

  // A/Bテストシミュレーション
  async testABComparison() {
    console.log('\n\n🧪 A/Bテスト比較\n');
    
    const query = 'ナンパで声をかけるときのコツを教えてください';
    const queryAnalysis = {
      type: 'question',
      keywords: ['ナンパ', '声', 'かける', 'コツ'],
      expandedKeywords: ['ナンパ', '声かけ', 'アプローチ', 'コツ', '方法'],
      originalQuery: query,
      isGreeting: false
    };
    
    const baseResponse = `声をかけるときのコツは、自然体でいることです。
相手の状況を見て、適切なタイミングで声をかけましょう。
最初は「すみません」から始めて、相手の反応を見ながら会話を進めていくのが良いでしょう。
笑顔を忘れずに、相手に圧迫感を与えないように気をつけてください。`;
    
    // 3つのバリエーションを生成
    console.log('【オリジナル】');
    console.log(baseResponse);
    
    // 弱いスタイル注入
    queryAnalysis.styleIntensity = 0.3;
    const lightStyle = await this.injector.injectStyle(baseResponse, queryAnalysis);
    console.log('\n【軽いスタイル注入（30%）】');
    console.log(lightStyle);
    
    // 標準スタイル注入
    queryAnalysis.styleIntensity = 0.7;
    const normalStyle = await this.injector.injectStyle(baseResponse, queryAnalysis);
    console.log('\n【標準スタイル注入（70%）】');
    console.log(normalStyle);
    
    // 強いスタイル注入
    queryAnalysis.styleIntensity = 1.0;
    const strongStyle = await this.injector.injectStyle(baseResponse, queryAnalysis);
    console.log('\n【強いスタイル注入（100%）】');
    console.log(strongStyle);
    
    // 各バリエーションを検証
    console.log('\n【スコア比較】');
    for (const [name, text] of [
      ['オリジナル', baseResponse],
      ['軽いスタイル', lightStyle],
      ['標準スタイル', normalStyle],
      ['強いスタイル', strongStyle]
    ]) {
      const result = await this.validator.validate(text);
      console.log(`${name}: ${result.totalScore}/100 (${result.grade})`);
    }
  }

  // 統合テスト
  async runIntegrationTest() {
    console.log('\n\n🧪 統合テスト開始\n');
    
    // Webhook serverのシミュレーション
    const testQuery = 'ナンパ初心者です。まず何から始めればいいですか？';
    const queryAnalysis = {
      type: 'consultation',
      keywords: ['ナンパ', '初心者', '始める'],
      expandedKeywords: ['ナンパ', '声かけ', '初心者', 'ビギナー', '始める', 'スタート'],
      originalQuery: testQuery,
      isGreeting: false
    };
    
    console.log(`ユーザー入力: "${testQuery}"`);
    
    // 検索結果のシミュレート
    const searchResults = [
      {
        title: 'ナンパ初心者へのアドバイス',
        content: 'ナンパを始めるには、まず場所選びが重要です...',
        summary: '初心者向けのナンパアドバイス',
        score: 85
      }
    ];
    
    // プロンプト生成
    const prompt = this.injector.generateStyledPrompt(
      testQuery,
      queryAnalysis,
      searchResults.map(r => `${r.title}\n${r.summary}\n${r.content}`).join('\n')
    );
    
    console.log('\n【生成されたプロンプト】');
    console.log(prompt.substring(0, 500) + '...');
    
    // レスポンス生成のシミュレート
    const simulatedResponse = `ナンパ初心者の方ですね。
まず最初は、人が多い場所で練習することをお勧めします。
駅前や繁華街など、声をかけやすい環境から始めましょう。
最初は緊張するかもしれませんが、数をこなすことで慣れていきます。`;
    
    // スタイル注入
    const styledResponse = await this.injector.injectStyle(simulatedResponse, queryAnalysis);
    
    console.log('\n【最終的な回答】');
    console.log(styledResponse);
    
    // 検証
    const validationResult = await this.validator.validate(styledResponse);
    console.log('\n【品質チェック】');
    console.log(`スコア: ${validationResult.totalScore}/100 (${validationResult.grade})`);
    console.log(`判定: ${validationResult.isAuthentic ? '✅ チバらしい' : '❌ 改善が必要'}`);
  }

  // 全テストを実行
  async runAllTests() {
    console.log('🚀 CSDS (Chiba Style DNA System) テスト開始\n');
    console.log('=' .repeat(60));
    
    try {
      await this.testStyleInjection();
      await this.testStyleValidation();
      await this.testABComparison();
      await this.runIntegrationTest();
      
      console.log('\n\n✅ 全テスト完了！');
    } catch (error) {
      console.error('\n❌ テストエラー:', error.message);
    }
  }
}

// メイン実行
async function main() {
  const testSuite = new CSDSTestSuite();
  await testSuite.runAllTests();
}

if (require.main === module) {
  main();
}

module.exports = CSDSTestSuite;