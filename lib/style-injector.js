const fs = require('fs').promises;
const path = require('path');

/**
 * Chiba Style Injector
 * チバさんのスタイルDNAを使用して、生成される文章にチバらしさを注入する
 */
class ChibaStyleInjector {
  constructor() {
    this.styleDNA = null;
    this.initialized = false;
  }

  // スタイルDNAを読み込む
  async initialize() {
    try {
      const dnaPath = path.join(__dirname, '../data/chiba-style-dna.json');
      const dnaContent = await fs.readFile(dnaPath, 'utf-8');
      this.styleDNA = JSON.parse(dnaContent);
      this.initialized = true;
      console.log('✅ チバスタイルDNAを読み込みました');
    } catch (error) {
      console.error('❌ スタイルDNA読み込みエラー:', error.message);
      throw error;
    }
  }

  // コンテキストに応じたスタイル強度を計算
  calculateStyleIntensity(queryAnalysis) {
    const baseIntensity = {
      casualness: 0.7,
      assertiveness: 0.6,
      philosophicalDepth: 0.5,
      emotionalExpression: 0.6
    };

    // 質問タイプに応じて調整
    if (queryAnalysis.type === 'greeting') {
      baseIntensity.casualness = 0.9;
      baseIntensity.assertiveness = 0.3;
    } else if (queryAnalysis.type === 'consultation') {
      baseIntensity.assertiveness = 0.8;
      baseIntensity.emotionalExpression = 0.7;
    } else if (queryAnalysis.type === 'question') {
      baseIntensity.philosophicalDepth = 0.7;
    }

    return baseIntensity;
  }

  // チバ特有の開始パターンを選択
  selectOpeningPattern(queryAnalysis) {
    const patterns = {
      greeting: [
        'チバです。\n\nこんにちは。',
        'チバです。\n\nお元気そうで何よりです。'
      ],
      consultation: [
        'チバです。\n\nなるほど、',
        'チバです。\n\nそうですね。',
        'チバです。\n\n興味深いご質問ですね。'
      ],
      general: [
        'チバです。\n\n',
        'チバです。\n\nさて、',
      ]
    };

    const type = queryAnalysis.type === 'greeting' ? 'greeting' : 
                 queryAnalysis.type === 'consultation' ? 'consultation' : 'general';
    
    const selectedPatterns = patterns[type];
    return selectedPatterns[Math.floor(Math.random() * selectedPatterns.length)];
  }

  // 段落構造を最適化
  optimizeParagraphStructure(text) {
    // 句読点での改行を適用
    let optimized = text
      .replace(/([。！？])\s*/g, '$1\n')
      .replace(/([、,])\s*/g, '$1');

    // 長い段落を分割
    const paragraphs = optimized.split('\n\n');
    const newParagraphs = [];

    paragraphs.forEach(para => {
      const sentences = para.split('\n').filter(s => s.trim());
      if (sentences.length > 5) {
        // 5文以上の段落は分割
        for (let i = 0; i < sentences.length; i += 3) {
          newParagraphs.push(sentences.slice(i, i + 3).join('\n'));
        }
      } else {
        newParagraphs.push(sentences.join('\n'));
      }
    });

    return newParagraphs.join('\n\n\n');
  }

  // 自問自答パターンを挿入
  insertSelfDialogue(text, intensity = 0.5) {
    if (Math.random() > intensity) return text;

    const patterns = [
      { trigger: 'なぜなら', insert: 'なぜか？' },
      { trigger: 'つまり', insert: 'ということは？' },
      { trigger: 'ですが', insert: 'では実際にどうなるか？' }
    ];

    let modified = text;
    patterns.forEach(pattern => {
      if (modified.includes(pattern.trigger) && Math.random() < 0.5) {
        const insertPoint = modified.indexOf(pattern.trigger);
        modified = modified.slice(0, insertPoint) + 
                  pattern.insert + '\n' + 
                  modified.slice(insertPoint);
      }
    });

    return modified;
  }

  // 読者心理の先読みパターンを挿入
  insertReaderAnticipation(text, intensity = 0.5) {
    if (Math.random() > intensity) return text;

    const anticipationPatterns = [
      'と思うかもしれません。',
      'と感じるかもしれません。',
      'という意見があるかもしれませんが、'
    ];

    // ランダムな位置に挿入（文の終わり付近）
    const sentences = text.split(/[。！？]/).filter(s => s.trim());
    if (sentences.length > 3) {
      const insertIndex = Math.floor(sentences.length * 0.6);
      const pattern = anticipationPatterns[Math.floor(Math.random() * anticipationPatterns.length)];
      sentences[insertIndex] += pattern;
    }

    return sentences.join('。') + '。';
  }

  // チバ特有の語彙を強化
  enhanceVocabulary(text, intensity = 0.6) {
    const replacements = [
      { from: /たくさん/g, to: 'ガンガン' },
      { from: /積極的に/g, to: 'ゴリゴリに' },
      { from: /どんどん/g, to: 'どんどん' }, // 既にある場合はそのまま
      { from: /嫌い/g, to: 'ダッサイ' },
      { from: /結論として/g, to: '結論' },
      { from: /断言しますが/g, to: '断言します' }
    ];

    let enhanced = text;
    replacements.forEach(rep => {
      if (Math.random() < intensity) {
        enhanced = enhanced.replace(rep.from, rep.to);
      }
    });

    return enhanced;
  }

  // 文末表現をチバスタイルに調整
  adjustSentenceEndings(text) {
    const chibaEndings = {
      'です。': { weight: 0.45, alternatives: ['です。', 'というわけです。', 'のです。'] },
      'ます。': { weight: 0.45, alternatives: ['ます。', 'ということです。'] },
      'でしょう。': { weight: 0.05, alternatives: ['でしょう。', 'かもしれません。'] },
      'ですね。': { weight: 0.05, alternatives: ['ですね。', 'ですよね。'] }
    };

    let adjusted = text;
    Object.entries(chibaEndings).forEach(([ending, config]) => {
      const regex = new RegExp(ending.replace('.', '\\.'), 'g');
      adjusted = adjusted.replace(regex, () => {
        if (Math.random() < 0.3) { // 30%の確率で代替表現を使用
          return config.alternatives[Math.floor(Math.random() * config.alternatives.length)];
        }
        return ending;
      });
    });

    return adjusted;
  }

  // メインのスタイル注入メソッド
  async injectStyle(text, queryAnalysis) {
    if (!this.initialized) {
      await this.initialize();
    }

    // スタイル強度を計算
    const intensity = this.calculateStyleIntensity(queryAnalysis);

    // 開始パターンを選択
    const opening = this.selectOpeningPattern(queryAnalysis);
    
    // テキストが「チバです。」で始まっていない場合は追加
    let styledText = text;
    if (!styledText.startsWith('チバです')) {
      styledText = opening + styledText;
    }

    // 各種スタイル要素を適用
    styledText = this.enhanceVocabulary(styledText, intensity.emotionalExpression);
    styledText = this.insertSelfDialogue(styledText, intensity.philosophicalDepth);
    styledText = this.insertReaderAnticipation(styledText, intensity.assertiveness);
    styledText = this.adjustSentenceEndings(styledText);
    styledText = this.optimizeParagraphStructure(styledText);

    return styledText;
  }

  // プロンプト生成（Few-shot examples付き）
  generateStyledPrompt(query, queryAnalysis, context) {
    const examples = this.getFewShotExamples(queryAnalysis.type);
    
    const prompt = `あなたはナンパ師「チバ」です。以下の特徴を持って回答してください。

【チバの文体特徴】
- 「チバです。」で始める
- 「なぜか？」などの自問自答を使う
- 「〜と思うかもしれません」で読者の心理を先読みする
- 「ガンガン」「ゴリゴリ」などの特徴的な語彙を使う
- 短い段落で改行を多用する
- 句読点ごとに改行する

【回答例】
${examples.map(ex => `Q: ${ex.question}\nA: ${ex.answer}`).join('\n\n')}

【今回の質問】
${query}

【参考情報】
${context}

上記の特徴を守りながら、自然で説得力のある回答を生成してください。`;

    return prompt;
  }

  // Few-shot例を取得
  getFewShotExamples(queryType) {
    const examples = {
      greeting: [
        {
          question: 'こんにちは',
          answer: `チバです。

こんにちは。
お元気そうで何よりです。


今日はどのようなご質問でしょうか。


ナンパのこと、
デートのこと、
女性とのコミュニケーションのこと、
どんなことでもお聞きください。`
        }
      ],
      consultation: [
        {
          question: 'ナンパで失敗ばかりです',
          answer: `チバです。

なるほど、
失敗が続いているんですね。


でも大丈夫です。
実は私も最初はそうでした。


なぜか？
それは経験が足りないだけだからです。


失敗を恐れずにガンガン声をかけていけば、
必ず上達します。


結論。
失敗は成功への第一歩です。`
        }
      ],
      general: [
        {
          question: 'デートの誘い方を教えて',
          answer: `チバです。

デートの誘い方ですね。


結論から言います。
シンプルに誘うのが一番です。


「今度お茶でもしない？」
これで十分です。


変に凝った誘い方をすると、
かえって警戒されます。


ゴリゴリに誘うのではなく、
さらっと自然に誘うのがコツです。`
        }
      ]
    };

    return examples[queryType] || examples.general;
  }
}

module.exports = ChibaStyleInjector;