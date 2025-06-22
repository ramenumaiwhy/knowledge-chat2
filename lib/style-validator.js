const fs = require('fs').promises;
const path = require('path');
const kuromoji = require('kuromoji');

/**
 * Chiba Style Validator (改善版)
 * 生成されたテキストがチバさんのスタイルに準拠しているかを検証
 * より寛容で現実的なスコアリングシステム
 */
class ChibaStyleValidator {
  constructor() {
    this.styleDNA = null;
    this.initialized = false;
    this.tokenizer = null;
  }

  // スタイルDNAと形態素解析器を初期化
  async initialize() {
    try {
      // スタイルDNAを読み込む
      const dnaPath = path.join(__dirname, '../data/chiba-style-dna.json');
      const dnaContent = await fs.readFile(dnaPath, 'utf-8');
      this.styleDNA = JSON.parse(dnaContent);
      
      // 形態素解析器を初期化
      await this.initializeTokenizer();
      
      this.initialized = true;
    } catch (error) {
      console.error('初期化エラー:', error.message);
      throw error;
    }
  }

  // 形態素解析器の初期化
  async initializeTokenizer() {
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

  // 日本語テキストをトークン化
  tokenizeJapanese(text) {
    if (!this.tokenizer) return [];
    const tokens = this.tokenizer.tokenize(text);
    return tokens.map(token => token.surface_form);
  }

  // 語彙の真正性をスコアリング（改善版）
  scoreVocabularyAuthenticity(text, styleDNA) {
    const textWords = this.tokenizeJapanese(text);
    const chibaVocabulary = new Set(Object.keys(styleDNA.vocabulary.frequency));
    
    // チバ語彙の使用頻度
    let chibaWordCount = 0;
    let totalWordCount = 0;
    
    textWords.forEach(word => {
      totalWordCount++;
      if (chibaVocabulary.has(word)) {
        chibaWordCount++;
      }
    });
    
    // 特徴的な語彙の存在確認（より寛容に）
    const characteristicWords = [
      { word: 'ガンガン', weight: 3 },
      { word: 'ゴリゴリ', weight: 3 },
      { word: 'どんどん', weight: 2 },
      { word: '結論', weight: 2 },
      { word: 'なぜか', weight: 3 },
      { word: 'チバです', weight: 5 }
    ];
    
    let characteristicBonus = 0;
    characteristicWords.forEach(({ word, weight }) => {
      if (text.includes(word)) {
        characteristicBonus += weight;
      }
    });
    
    // スコア計算（0-25点、より寛容に）
    const vocabularyRatio = totalWordCount > 0 ? chibaWordCount / totalWordCount : 0;
    const baseScore = Math.min(vocabularyRatio * 100, 15); // 基礎点最大15点
    const bonusScore = Math.min(characteristicBonus, 10); // ボーナス最大10点
    
    return Math.round(baseScore + bonusScore);
  }

  // 段落構造の類似性をスコアリング（改善版）
  scoreStructuralSimilarity(text, styleDNA) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / (paragraphs.length || 1);
    
    // チバさんの平均段落長（108文字）との差異（より寛容に）
    const targetLength = styleDNA.paragraphPatterns.averageLength;
    const lengthDifference = Math.abs(avgParagraphLength - targetLength) / targetLength;
    const lengthScore = Math.max(0, 8 - lengthDifference * 5); // より寛容な計算
    
    // 文/段落比率
    const sentenceCount = text.split(/[。！？]/).filter(s => s.trim()).length;
    const sentencePerParagraph = sentenceCount / (paragraphs.length || 1);
    const targetRatio = styleDNA.paragraphPatterns.averageSentencesPerParagraph;
    const ratioDifference = Math.abs(sentencePerParagraph - targetRatio) / targetRatio;
    const ratioScore = Math.max(0, 7 - ratioDifference * 5); // より寛容な計算
    
    // 開始パターンの確認（重要）
    const startsWithChiba = text.startsWith('チバです') ? 10 : 0;
    
    return Math.round(lengthScore + ratioScore + startsWithChiba);
  }

  // 修辞技法の使用をスコアリング（改善版）
  scoreRhetoricalDevices(text, styleDNA) {
    let score = 0;
    
    // 自問自答パターン（より重要）
    const selfDialoguePatterns = [
      { pattern: 'なぜか？', weight: 10 },
      { pattern: 'どうしてか？', weight: 8 },
      { pattern: 'ということは？', weight: 7 },
      { pattern: 'では実際にどうなるか？', weight: 6 }
    ];
    
    selfDialoguePatterns.forEach(({ pattern, weight }) => {
      if (text.includes(pattern)) {
        score += weight;
      }
    });
    
    // 読者心理の先読み
    const anticipationPatterns = ['と思うかもしれません', 'と感じるかもしれません', 'という意見があるかもしれません'];
    const hasAnticipation = anticipationPatterns.some(pattern => text.includes(pattern));
    if (hasAnticipation) score += 5;
    
    // 対話的な問いかけ
    const dialogicalPatterns = ['どうでしょうか', 'いかがでしょうか', 'ありませんか'];
    const hasDialogical = dialogicalPatterns.some(pattern => text.includes(pattern));
    if (hasDialogical) score += 3;
    
    // 結論の明示
    if (text.includes('結論')) score += 5;
    
    return Math.min(score, 25); // 最大25点
  }

  // 感情的トーンと温かみをスコアリング（改善版）
  scoreEmotionalTone(text) {
    let score = 0;
    
    // 励ましの表現（より寛容に）
    const encouragingPatterns = ['大丈夫', '頑張', '応援', '一緒に', 'きっと', '必ず', '絶対', '間違いなく'];
    const encouragementCount = encouragingPatterns.filter(pattern => text.includes(pattern)).length;
    score += Math.min(encouragementCount * 4, 10);
    
    // 共感的表現
    const empatheticPatterns = ['そうですね', 'なるほど', '確かに', 'わかります', '私も', 'そうか'];
    const empathyCount = empatheticPatterns.filter(pattern => text.includes(pattern)).length;
    score += Math.min(empathyCount * 3, 8);
    
    // ポジティブな語彙
    const positivePatterns = ['楽しい', '面白い', '素晴らしい', '良い', '最高', '上達', '成功'];
    const positivityCount = positivePatterns.filter(pattern => text.includes(pattern)).length;
    score += Math.min(positivityCount * 2, 5);
    
    // 感嘆符の適度な使用
    const exclamationCount = (text.match(/！/g) || []).length;
    if (exclamationCount > 0 && exclamationCount <= 3) score += 2;
    
    return Math.min(score, 25); // 最大25点
  }

  // メインの検証メソッド
  async validate(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    // 各カテゴリのスコアを計算
    const vocabularyScore = this.scoreVocabularyAuthenticity(text, this.styleDNA);
    const structureScore = this.scoreStructuralSimilarity(text, this.styleDNA);
    const rhetoricScore = this.scoreRhetoricalDevices(text, this.styleDNA);
    const emotionScore = this.scoreEmotionalTone(text);

    // 総合スコアを計算
    const totalScore = vocabularyScore + structureScore + rhetoricScore + emotionScore;

    // 詳細なフィードバックを生成
    const feedback = this.generateDetailedFeedback({
      vocabulary: vocabularyScore,
      structure: structureScore,
      rhetoric: rhetoricScore,
      emotion: emotionScore
    }, totalScore);

    // 総合判定（より現実的な基準）
    const passingGrade = 50; // 60%から50%に調整
    const isAuthentic = totalScore >= passingGrade;

    return {
      scores: {
        vocabulary: vocabularyScore,
        structure: structureScore,
        rhetoric: rhetoricScore,
        emotion: emotionScore
      },
      totalScore,
      isAuthentic,
      grade: this.calculateGrade(totalScore),
      feedback
    };
  }

  // 成績評価を計算
  calculateGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  // 詳細なフィードバックを生成
  generateDetailedFeedback(scores, totalScore) {
    const feedback = [];

    // 各カテゴリに対するフィードバック
    if (scores.vocabulary < 15) {
      feedback.push('💡 語彙: チバさん特有の表現（ガンガン、ゴリゴリなど）をもう少し使ってみましょう。');
    } else if (scores.vocabulary >= 20) {
      feedback.push('✨ 語彙: チバさんらしい語彙選びができています！');
    }

    if (scores.structure < 15) {
      feedback.push('💡 構造: 短い段落（3-4文）と頻繁な改行を心がけましょう。');
    } else if (scores.structure >= 20) {
      feedback.push('✨ 構造: チバさんらしい段落構成です！');
    }

    if (scores.rhetoric < 10) {
      feedback.push('💡 修辞: 「なぜか？」などの自問自答を追加してみましょう。');
    } else if (scores.rhetoric >= 20) {
      feedback.push('✨ 修辞: 効果的な修辞技法が使われています！');
    }

    if (scores.emotion < 10) {
      feedback.push('💡 感情: もっと励ましや共感の表現を含めてみましょう。');
    } else if (scores.emotion >= 20) {
      feedback.push('✨ 感情: 温かみのある表現ができています！');
    }

    // 総合評価
    if (totalScore >= 80) {
      feedback.push('🎉 総評: 素晴らしい！チバさんのスタイルを完璧に再現しています。');
    } else if (totalScore >= 60) {
      feedback.push('👍 総評: 良いですね！チバさんらしさがよく表現されています。');
    } else if (totalScore >= 50) {
      feedback.push('📈 総評: 合格点です！もう少し改善すれば、さらにチバさんらしくなります。');
    } else if (totalScore >= 40) {
      feedback.push('💪 総評: あと一歩！重要な要素は含まれているので、細部を改善しましょう。');
    } else {
      feedback.push('🎯 総評: もっとチバさんのスタイルを意識してみましょう。特に自問自答と語彙選びが重要です。');
    }

    return feedback;
  }

  // A/B比較分析
  async compareTexts(originalText, styledText) {
    const originalResult = await this.validate(originalText);
    const styledResult = await this.validate(styledText);

    const improvement = {
      vocabulary: styledResult.scores.vocabulary - originalResult.scores.vocabulary,
      structure: styledResult.scores.structure - originalResult.scores.structure,
      rhetoric: styledResult.scores.rhetoric - originalResult.scores.rhetoric,
      emotion: styledResult.scores.emotion - originalResult.scores.emotion,
      total: styledResult.totalScore - originalResult.totalScore
    };

    return {
      original: originalResult,
      styled: styledResult,
      improvement,
      summary: this.generateComparisonSummary(improvement)
    };
  }

  // 比較サマリーを生成
  generateComparisonSummary(improvement) {
    const summary = [];

    if (improvement.total > 20) {
      summary.push('🚀 大幅な改善が見られます！');
    } else if (improvement.total > 10) {
      summary.push('✅ 良い改善が見られます。');
    } else if (improvement.total > 0) {
      summary.push('📊 若干の改善が見られます。');
    } else {
      summary.push('⚠️ 改善が必要です。');
    }

    const bestImprovement = Object.entries(improvement)
      .filter(([key]) => key !== 'total')
      .sort((a, b) => b[1] - a[1])[0];
    
    if (bestImprovement && bestImprovement[1] > 5) {
      const categoryNames = {
        vocabulary: '語彙',
        structure: '構造',
        rhetoric: '修辞技法',
        emotion: '感情表現'
      };
      summary.push(`特に${categoryNames[bestImprovement[0]]}が改善されました。`);
    }

    return summary;
  }
}

module.exports = ChibaStyleValidator;