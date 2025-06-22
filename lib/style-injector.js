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
      casualness: 0.8,
      assertiveness: 0.8,
      philosophicalDepth: 0.7,
      emotionalExpression: 0.8
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
    // すでに句点がついている文の処理
    let optimized = text
      .replace(/(。|！|？)(?!$)/g, '$1\n') // 文末以外の句点後に改行
      .replace(/。\n。/g, '。\n') // 二重句点を防ぐ
      .replace(/\n+$/g, ''); // 末尾の余分な改行を削除

    // チバさんの特徴的な短い段落構成（平均3.2文/段落）
    const sentences = optimized.split('\n').filter(s => s.trim());
    const newParagraphs = [];
    
    // 意味的なまとまりを考慮した段落分け
    let currentParagraph = [];
    let i = 0;
    
    while (i < sentences.length) {
      const sentence = sentences[i];
      currentParagraph.push(sentence);
      
      // 段落を区切るタイミングを判定
      const shouldBreak = this.shouldBreakParagraph(sentence, sentences[i + 1], currentParagraph.length);
      
      if (shouldBreak || i === sentences.length - 1) {
        if (currentParagraph.length > 0) {
          newParagraphs.push(currentParagraph.join('\n'));
          currentParagraph = [];
        }
      }
      
      i++;
    }

    // 段落間に空白行を二つ挿入（チバさんの特徴）
    return newParagraphs.join('\n\n\n');
  }
  
  // 段落を区切るべきかを判定
  shouldBreakParagraph(currentSentence, nextSentence, paragraphLength) {
    // チバさんの平均は3.2文/段落なので、3-4文で区切ることが多い
    if (paragraphLength >= 4) return true;
    
    // 1文でも区切ることがある（20%の確率）
    if (paragraphLength === 1 && Math.random() < 0.2) return true;
    
    // 話題の転換を示すキーワード
    const transitionKeywords = ['なぜか？', 'では', 'さて', '結論', 'つまり', 'ところで'];
    if (nextSentence && transitionKeywords.some(keyword => nextSentence.startsWith(keyword))) {
      return true;
    }
    
    // 疑問文の後は区切りやすい
    if (currentSentence.endsWith('？')) return true;
    
    // 2-3文の場合は確率的に区切る（チバさんらしさ）
    if (paragraphLength >= 2 && Math.random() < 0.5) return true;
    
    return false;
  }

  // 自問自答パターンを挿入
  insertSelfDialogue(text, intensity = 0.5) {
    // 適度な確率で自問自答を挿入
    const shouldInsert = Math.random() < intensity;
    if (!shouldInsert) return text;

    const patterns = [
      { 
        trigger: /理由|原因|なぜなら/,
        questions: ['なぜか？', 'どうしてか？'],
        position: 'before'
      },
      { 
        trigger: /つまり|要するに|結局/,
        questions: ['ということは？', 'どういうことか？'],
        position: 'before'
      },
      { 
        trigger: /でも|しかし|ただし/,
        questions: ['では実際にどうなるか？', 'それでも大丈夫か？'],
        position: 'after'
      }
    ];

    let modified = text;
    let inserted = false;

    // 文を適切に分割
    const sentences = modified.split(/(?<=[。！？])/);
    
    // 自然な位置を探して挿入
    for (let i = 0; i < sentences.length && !inserted; i++) {
      const sentence = sentences[i];
      
      for (const pattern of patterns) {
        if (pattern.trigger.test(sentence)) {
          const question = pattern.questions[Math.floor(Math.random() * pattern.questions.length)];
          
          if (pattern.position === 'before' && i > 0) {
            // トリガーの前に挿入
            sentences[i - 1] += '\n\n' + question + '\n';
            inserted = true;
            break;
          } else if (pattern.position === 'after' && i < sentences.length - 1) {
            // トリガーの後に挿入
            sentences[i] += '\n\n' + question + '\n';
            inserted = true;
            break;
          }
        }
      }
    }
    
    // 適切な位置が見つからない場合は、文章の中盤に控えめに挿入
    if (!inserted && sentences.length > 4) {
      const insertIndex = Math.floor(sentences.length * 0.4);
      sentences[insertIndex] += '\n\nなぜか？\n';
    }

    return sentences.join('');
  }

  // 読者心理の先読みパターンを挿入
  insertReaderAnticipation(text, intensity = 0.5) {
    if (Math.random() > intensity) return text;

    const anticipationPatterns = [
      'と思うかもしれません',
      'と感じるかもしれません',
      'という意見があるかもしれませんが'
    ];

    // 文を正しく分割
    const sentenceRegex = /([^。！？]+[。！？])/g;
    const sentences = text.match(sentenceRegex) || [];
    
    if (sentences.length > 3) {
      const insertIndex = Math.floor(sentences.length * 0.6);
      const pattern = anticipationPatterns[Math.floor(Math.random() * anticipationPatterns.length)];
      
      // 文末の句点を一時的に削除してパターンを追加
      if (sentences[insertIndex]) {
        // 文の内容を確認して適切な位置に挿入
        const sentence = sentences[insertIndex].replace(/[。！？]$/, '');
        if (sentence.length > 10) { // 短すぎる文には挿入しない
          sentences[insertIndex] = sentence + pattern + '。';
        }
      }
    }

    return sentences.join('');
  }

  // チバ特有の語彙を強化
  enhanceVocabulary(text, intensity = 0.6) {
    // コンテキストに応じた置換（確率を大幅に下げて自然に）
    const contextualReplacements = [
      { from: /たくさん/g, to: 'ガンガン', probability: 0.3, context: ['声をかけ', '活動', '行動'] },
      { from: /積極的に/g, to: 'ゴリゴリに', probability: 0.4, context: ['活動', 'アプローチ', '声かけ'] },
      { from: /とても/g, to: 'めちゃくちゃ', probability: 0.15, context: ['楽しい', '面白い', '良い'] },
      { from: /絶対に/g, to: '間違いなく', probability: 0.3, context: ['成功', '上達', 'できる'] },
      { from: /つまり/g, to: '結論。', probability: 0.2, context: null } // 文頭のみ
    ];

    let enhanced = text;
    
    // より自然な置換のために、文脈を確認
    contextualReplacements.forEach(rep => {
      if (Math.random() < (rep.probability * intensity)) {
        // 文脈チェック
        if (rep.context) {
          // 置換対象の周辺に文脈キーワードがあるか確認
          const contextPattern = new RegExp(`(${rep.from.source})[^。]{0,20}(${rep.context.join('|')})|` +
                                          `(${rep.context.join('|')})[^。]{0,20}(${rep.from.source})`, 'g');
          if (contextPattern.test(enhanced)) {
            enhanced = enhanced.replace(rep.from, rep.to);
          }
        } else if (rep.from.source === 'つまり') {
          // 「つまり」は文頭でのみ「結論。」に置換
          enhanced = enhanced.replace(/^つまり|[\n。]つまり/g, (match) => {
            return match.replace('つまり', '結論。');
          });
        } else {
          // 文脈指定なしの場合は確率的に置換
          enhanced = enhanced.replace(rep.from, rep.to);
        }
      }
    });
    
    // 「なぜか？」の挿入（より控えめに）
    if (enhanced.includes('理由は') && Math.random() < 0.3) {
      enhanced = enhanced.replace(/理由は/g, 'なぜか？\nそれは');
    }

    return enhanced;
  }

  // 文末表現をチバスタイルに調整
  adjustSentenceEndings(text) {
    // チバさんの実際の文末表現分布に基づく
    const chibaEndings = {
      'です。': { weight: 0.48, alternatives: ['です。', 'というわけです。'] },
      'ます。': { weight: 0.48, alternatives: ['ます。', 'ということです。'] },
      'でしょう。': { weight: 0.02, alternatives: ['でしょう。'] },
      'ですね。': { weight: 0.02, alternatives: ['ですね。'] }
    };

    // 二重句点を防ぐための前処理
    let adjusted = text.replace(/。{2,}/g, '。');
    
    // 文末表現の調整
    Object.entries(chibaEndings).forEach(([ending, config]) => {
      // 文末のみを対象にし、特定のパターンは除外
      const regex = new RegExp(`([^。！？]+)(${ending.replace('.', '\\.')})(?=\s|$)`, 'g');
      adjusted = adjusted.replace(regex, (match, prefix, originalEnding) => {
        // 「チバです」は変更しない
        if (prefix.trim() === 'チバ') {
          return match;
        }
        
        // 短すぎる文（10文字未満）は変更しない
        if (prefix.length < 10) {
          return match;
        }
        
        if (Math.random() < 0.15) { // 15%の確率で代替表現を使用（控えめに）
          const alternative = config.alternatives[Math.floor(Math.random() * config.alternatives.length)];
          return prefix + alternative;
        }
        return match;
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
      // 最初の文を適切に結合
      if (styledText.startsWith('こんにちは') && opening.includes('こんにちは')) {
        // openingに既に「こんにちは」が含まれている場合、重複を避ける
        styledText = opening + styledText.replace(/^こんにちは[。、]?\s*/, '');
      } else {
        styledText = opening + styledText;
      }
    }

    // 各種スタイル要素を適用（順序を最適化）
    styledText = this.enhanceVocabulary(styledText, intensity.emotionalExpression);
    styledText = this.adjustSentenceEndings(styledText);
    styledText = this.insertSelfDialogue(styledText, intensity.philosophicalDepth);
    styledText = this.insertReaderAnticipation(styledText, intensity.assertiveness);
    styledText = this.optimizeParagraphStructure(styledText);
    
    // 最後に「結論。」を追加（チバさんの特徴）
    if (!styledText.includes('結論') && Math.random() < 0.7) {
      styledText += '\n\n\n結論。\n' + this.generateConclusion(queryAnalysis);
    }

    return styledText;
  }
  
  // 結論を生成
  generateConclusion(queryAnalysis) {
    const conclusions = {
      greeting: [
        'いつでもお気軽にご質問ください。',
        '一緒に頑張っていきましょう。'
      ],
      consultation: [
        '失敗を恐れずにゴリゴリ活動することが、成功への第一歩です。',
        'ガンガン行動して、結果を出していきましょう。',
        '経験を積めば、必ず上達します。'
      ],
      general: [
        'まずは行動してみることが大切です。',
        '実践あるのみです。',
        'どんどんチャレンジしていきましょう。'
      ]
    };
    
    const type = queryAnalysis.type === 'greeting' ? 'greeting' : 
                 queryAnalysis.type === 'consultation' ? 'consultation' : 'general';
    
    const options = conclusions[type];
    return options[Math.floor(Math.random() * options.length)];
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