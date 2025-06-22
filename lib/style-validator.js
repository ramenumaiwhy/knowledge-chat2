const fs = require('fs').promises;
const path = require('path');

/**
 * Chiba Style Validator
 * 生成されたテキストがチバさんのスタイルに準拠しているかを検証
 */
class ChibaStyleValidator {
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
    } catch (error) {
      console.error('スタイルDNA読み込みエラー:', error.message);
      throw error;
    }
  }

  // 語彙の真正性をチェック
  checkVocabularyAuthenticity(text) {
    let score = 0;
    let totalChecks = 0;

    // 特徴的な語彙の出現をチェック
    const targetVocabulary = [
      { word: 'チバです', weight: 10 },
      { word: '結論', weight: 8 },
      { word: 'なぜか？', weight: 8 },
      { word: 'ガンガン', weight: 6 },
      { word: 'ゴリゴリ', weight: 6 },
      { word: 'どんどん', weight: 5 },
      { word: 'と思うかもしれません', weight: 7 },
      { word: 'ということは？', weight: 7 },
      { word: 'からです。', weight: 5 },
      { word: 'のです。', weight: 5 }
    ];

    targetVocabulary.forEach(item => {
      totalChecks += item.weight;
      if (text.includes(item.word)) {
        score += item.weight;
      }
    });

    // 語彙の多様性をチェック
    const vocabularyDiversity = this.calculateVocabularyDiversity(text);
    score += vocabularyDiversity * 10;
    totalChecks += 10;

    return (score / totalChecks) * 100;
  }

  // 語彙の多様性を計算
  calculateVocabularyDiversity(text) {
    const chibaWords = ['ガンガン', 'ゴリゴリ', 'どんどん', 'ダッサイ', '断言します'];
    const foundWords = chibaWords.filter(word => text.includes(word));
    return Math.min(foundWords.length / chibaWords.length, 1);
  }

  // 構造的類似性をチェック
  checkStructuralSimilarity(text) {
    let score = 0;
    let totalChecks = 0;

    // 段落の長さ分布（改善された分析結果に基づく）
    const paragraphs = text.split(/\n{2,}/);
    const avgLength = paragraphs.length > 0 
      ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
      : 0;
    
    // チバさんの平均段落長（108文字）との類似度
    const targetLength = 108;
    const lengthSimilarity = 1 - Math.min(Math.abs(avgLength - targetLength) / targetLength, 1);
    score += Math.max(0, lengthSimilarity) * 30;
    totalChecks += 30;

    // 改行パターン（チバさんは頻繁に改行）
    const lineBreaks = (text.match(/\n/g) || []).length;
    const expectedBreaks = text.length / 30; // 約30文字ごとに改行
    const breakSimilarity = 1 - Math.min(Math.abs(lineBreaks - expectedBreaks) / expectedBreaks, 1);
    score += Math.max(0, breakSimilarity) * 20;
    totalChecks += 20;

    // 文末表現の分布
    const endingScore = this.checkSentenceEndings(text);
    score += endingScore * 50;
    totalChecks += 50;

    return (score / totalChecks) * 100;
  }

  // 文末表現をチェック
  checkSentenceEndings(text) {
    const sentences = text.split(/[。！？]/).filter(s => s.trim());
    const endings = {
      'です': 0,
      'ます': 0,
      'でしょう': 0,
      'かもしれません': 0,
      'ですね': 0
    };

    sentences.forEach(sentence => {
      Object.keys(endings).forEach(ending => {
        if (sentence.trim().endsWith(ending)) {
          endings[ending]++;
        }
      });
    });

    // チバさんの文末表現分布との比較
    const totalEndings = Object.values(endings).reduce((a, b) => a + b, 0);
    if (totalEndings === 0) return 0;

    const expectedRatios = {
      'です': 0.48,
      'ます': 0.48,
      'でしょう': 0.02,
      'かもしれません': 0.01,
      'ですね': 0.01
    };

    let similarity = 0;
    Object.keys(endings).forEach(ending => {
      const actualRatio = endings[ending] / totalEndings;
      const expectedRatio = expectedRatios[ending];
      similarity += 1 - Math.abs(actualRatio - expectedRatio);
    });

    return similarity / Object.keys(endings).length;
  }

  // 修辞技法をチェック
  checkRhetoricalDevices(text) {
    let score = 0;
    let totalChecks = 0;

    // 自問自答パターン
    const selfDialoguePatterns = ['なぜか？', 'どうなるか？', 'ということは？', 'それは何か？'];
    const selfDialogueCount = selfDialoguePatterns.reduce((count, pattern) => {
      return count + (text.match(new RegExp(pattern, 'g')) || []).length;
    }, 0);
    
    score += Math.min(selfDialogueCount * 10, 30);
    totalChecks += 30;

    // 読者心理の先読み
    const anticipationPatterns = [
      'と思うかもしれません',
      'と感じるかもしれません',
      'という意見があるかもしれません'
    ];
    const anticipationCount = anticipationPatterns.reduce((count, pattern) => {
      return count + (text.includes(pattern) ? 1 : 0);
    }, 0);
    
    score += Math.min(anticipationCount * 15, 30);
    totalChecks += 30;

    // 段落の遷移表現
    const transitionWords = ['さて、', 'ですが。', 'つまり', 'なぜなら', 'では'];
    const transitionCount = transitionWords.reduce((count, word) => {
      return count + (text.includes(word) ? 1 : 0);
    }, 0);
    
    score += Math.min(transitionCount * 8, 40);
    totalChecks += 40;

    return (score / totalChecks) * 100;
  }

  // 感情的トーンをチェック
  checkEmotionalTone(text) {
    let score = 0;
    let totalChecks = 0;

    // ポジティブな励まし表現
    const encouragingPhrases = [
      '大丈夫です',
      '応援しています',
      '頑張って',
      'できます',
      '素晴らしい'
    ];
    const encouragementCount = encouragingPhrases.reduce((count, phrase) => {
      return count + (text.includes(phrase) ? 1 : 0);
    }, 0);
    
    score += Math.min(encouragementCount * 10, 30);
    totalChecks += 30;

    // 共感表現
    const empathyPhrases = [
      'わかります',
      'そうですね',
      'なるほど',
      '気持ちは'
    ];
    const empathyCount = empathyPhrases.reduce((count, phrase) => {
      return count + (text.includes(phrase) ? 1 : 0);
    }, 0);
    
    score += Math.min(empathyCount * 10, 30);
    totalChecks += 30;

    // 断定的表現
    const assertivePhrases = [
      '断言します',
      '間違いなく',
      '結論',
      '確実に'
    ];
    const assertiveCount = assertivePhrases.reduce((count, phrase) => {
      return count + (text.includes(phrase) ? 1 : 0);
    }, 0);
    
    score += Math.min(assertiveCount * 10, 40);
    totalChecks += 40;

    return (score / totalChecks) * 100;
  }

  // 総合スコアを計算
  calculateOverallScore(scores) {
    const weights = {
      vocabulary: 0.25,
      structure: 0.25,
      rhetoric: 0.25,
      emotion: 0.25
    };

    let weightedSum = 0;
    Object.entries(scores).forEach(([key, value]) => {
      weightedSum += value * weights[key];
    });

    return Math.round(weightedSum);
  }

  // メインの検証メソッド
  async validate(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    const scores = {
      vocabulary: this.checkVocabularyAuthenticity(text),
      structure: this.checkStructuralSimilarity(text),
      rhetoric: this.checkRhetoricalDevices(text),
      emotion: this.checkEmotionalTone(text)
    };

    const overallScore = this.calculateOverallScore(scores);

    return {
      scores,
      overallScore,
      isAuthentic: overallScore >= 60, // 基準を現実的に調整
      feedback: this.generateFeedback(scores, overallScore)
    };
  }

  // フィードバックを生成
  generateFeedback(scores, overallScore) {
    const feedback = [];

    if (scores.vocabulary < 60) {
      feedback.push('チバさん特有の語彙（ガンガン、ゴリゴリなど）をもっと使用してください。');
    }

    if (scores.structure < 60) {
      feedback.push('段落を短くし、改行を増やしてください。');
    }

    if (scores.rhetoric < 60) {
      feedback.push('「なぜか？」などの自問自答や読者心理の先読みを追加してください。');
    }

    if (scores.emotion < 60) {
      feedback.push('もっと励ましや共感の表現を含めてください。');
    }

    if (overallScore >= 80) {
      feedback.push('素晴らしい！チバさんらしさが十分に表現されています。');
    } else if (overallScore >= 60) {
      feedback.push('良いですが、もう少しチバさんらしさを強化できます。');
    } else if (overallScore >= 40) {
      feedback.push('チバさんのスタイル要素が一部含まれていますが、改善の余地があります。');
    } else {
      feedback.push('チバさんのスタイルをもっと研究する必要があります。');
    }

    return feedback;
  }

  // 詳細なレポートを生成
  generateDetailedReport(text, validationResult) {
    const report = {
      summary: {
        text: text.substring(0, 100) + '...',
        length: text.length,
        overallScore: validationResult.overallScore,
        isAuthentic: validationResult.isAuthentic
      },
      detailedScores: validationResult.scores,
      specificFindings: {
        chibaOpening: text.startsWith('チバです'),
        paragraphCount: text.split(/\n{2,}/).length,
        selfDialogueCount: (text.match(/なぜか？|どうなるか？|ということは？/g) || []).length,
        anticipationCount: (text.match(/と思うかもしれません|と感じるかもしれません/g) || []).length,
        characteristicWords: this.findCharacteristicWords(text)
      },
      recommendations: validationResult.feedback
    };

    return report;
  }

  // 特徴的な単語を検出
  findCharacteristicWords(text) {
    const words = ['ガンガン', 'ゴリゴリ', 'どんどん', 'ダッサイ', '断言します', '結論'];
    return words.filter(word => text.includes(word));
  }
}

module.exports = ChibaStyleValidator;