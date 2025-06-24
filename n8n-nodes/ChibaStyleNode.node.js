// ChibaStyleNode - JavaScript version for n8n
const fs = require('fs');
const path = require('path');

class ChibaStyleNode {
    constructor() {
        this.loadStyleDNA();
    }

    loadStyleDNA() {
        try {
            const dnaPath = path.join('/home/node/data', 'chiba-style-dna.json');
            const dnaContent = fs.readFileSync(dnaPath, 'utf8');
            this.styleDNA = JSON.parse(dnaContent);
        } catch (error) {
            console.error('Failed to load style DNA:', error);
            // Fallback DNA structure
            this.styleDNA = {
                vocabulary: ['ガンガン', 'どんどん', 'ガッツリ', 'ゴリゴリ', 'しっかり', '結論'],
                structures: [
                    { pattern: 'short_paragraph', weight: 0.7 },
                    { pattern: 'question_answer', weight: 0.3 }
                ],
                rhetorical_devices: [
                    {
                        name: 'self_questioning',
                        patterns: ['なぜか？'],
                        insertion_points: ['middle'],
                        frequency: 0.3
                    }
                ],
                emotion_markers: ['失敗を恐れずに', '必ず上達します', 'まずは行動あるのみ']
            };
        }
    }

    async execute(items) {
        const returnData = [];
        
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const item = items[itemIndex];
                const operation = this.getNodeParameter('operation', itemIndex) || 'both';
                const textField = this.getNodeParameter('textField', itemIndex) || 'text';
                const styleIntensity = this.getNodeParameter('styleIntensity', itemIndex) || 0.7;
                const queryType = this.getNodeParameter('queryType', itemIndex) || 'general';
                
                const originalText = item.json[textField];
                if (!originalText) {
                    throw new Error(`Field "${textField}" not found in item ${itemIndex}`);
                }

                const result = {
                    ...item.json,
                    originalText: originalText
                };

                if (operation === 'inject' || operation === 'both') {
                    result.styledText = this.applyStyle(originalText, styleIntensity, queryType);
                    result[textField] = result.styledText;
                }

                if (operation === 'validate' || operation === 'both') {
                    const textToValidate = operation === 'validate' ? originalText : result.styledText;
                    result.validation = this.validateStyle(textToValidate);
                }

                returnData.push({
                    json: result,
                    pairedItem: itemIndex
                });

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                            ...items[itemIndex].json
                        },
                        pairedItem: itemIndex
                    });
                } else {
                    throw error;
                }
            }
        }

        return [returnData];
    }

    applyStyle(text, intensity, queryType) {
        let styledText = text;

        // Apply greeting pattern
        if (queryType === 'greeting' && !text.startsWith('チバです')) {
            styledText = 'チバです。\n\n' + styledText;
        }

        // Add rhetorical devices
        if (Math.random() < intensity * 0.3 && !styledText.includes('なぜか？')) {
            const insertPoint = Math.floor(styledText.length / 2);
            styledText = styledText.slice(0, insertPoint) + '\n\nなぜか？\n' + styledText.slice(insertPoint);
        }

        // Apply vocabulary replacements
        const replacements = {
            '頑張': 'ガンガン',
            'たくさん': 'ガッツリ',
            '進め': 'ゴリゴリ',
            'しっかり': 'ガッチリ'
        };

        for (const [original, replacement] of Object.entries(replacements)) {
            if (styledText.includes(original) && Math.random() < intensity) {
                styledText = styledText.replace(new RegExp(original, 'g'), replacement);
            }
        }

        // Add emotion markers
        if (Math.random() < intensity * 0.5) {
            const emotions = this.styleDNA.emotion_markers;
            const emotion = emotions[Math.floor(Math.random() * emotions.length)];
            if (!styledText.includes(emotion)) {
                styledText += '\n\n' + emotion;
            }
        }

        // Add conclusion for consultations
        if (queryType === 'consultation' && !styledText.includes('結論')) {
            styledText += '\n\n結論。\n失敗を恐れずにガンガン挑戦することが大切です。';
        }

        // Apply paragraph structure
        styledText = styledText.replace(/。/g, '。\n');
        styledText = styledText.replace(/\n+/g, '\n\n');
        styledText = styledText.trim();

        return styledText;
    }

    validateStyle(text) {
        const scores = {
            vocabulary: 0,
            structure: 0,
            rhetoric: 0,
            emotion: 0
        };

        // Vocabulary scoring
        const vocabCount = this.styleDNA.vocabulary.filter(word => text.includes(word)).length;
        scores.vocabulary = Math.min(25, vocabCount * 5);

        // Structure scoring
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        if (paragraphs.length >= 3) scores.structure += 10;
        if (text.startsWith('チバです')) scores.structure += 10;
        if (paragraphs.some(p => p.length < 50)) scores.structure += 5;

        // Rhetoric scoring
        if (text.includes('なぜか？')) scores.rhetoric += 15;
        if (text.includes('かもしれません')) scores.rhetoric += 5;
        if (text.includes('と思うかもしれません')) scores.rhetoric += 5;

        // Emotion scoring
        const emotionCount = this.styleDNA.emotion_markers.filter(marker => text.includes(marker)).length;
        scores.emotion = Math.min(25, emotionCount * 8);

        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
        const grade = this.calculateGrade(totalScore);

        return {
            totalScore,
            scores,
            grade,
            isAuthentic: totalScore >= 50,
            feedback: this.generateFeedback(scores)
        };
    }

    calculateGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        if (score >= 50) return 'E';
        return 'F';
    }

    generateFeedback(scores) {
        const feedback = [];
        if (scores.vocabulary < 10) feedback.push('チバ特有の語彙をもっと使用してください');
        if (scores.structure < 10) feedback.push('段落構造を改善してください');
        if (scores.rhetoric < 10) feedback.push('修辞技法を追加してください');
        if (scores.emotion < 10) feedback.push('感情表現を増やしてください');
        return feedback;
    }

    // Mock n8n methods for standalone testing
    getNodeParameter(name, itemIndex) {
        // This will be overridden by n8n
        return undefined;
    }

    continueOnFail() {
        return true;
    }
}

// Export for n8n
class ChibaStyleNodeExport {
    constructor() {
        this.description = {
        displayName: 'Chiba Style',
        name: 'chibaStyle',
        icon: 'fa:magic',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Apply Chiba style DNA to text',
        defaults: {
            name: 'Chiba Style',
            color: '#FF6B6B',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    {
                        name: 'Apply Style',
                        value: 'inject',
                    },
                    {
                        name: 'Validate Style',
                        value: 'validate',
                    },
                    {
                        name: 'Apply and Validate',
                        value: 'both',
                    },
                ],
                default: 'both',
            },
            {
                displayName: 'Text Field',
                name: 'textField',
                type: 'string',
                default: 'text',
                required: true,
            },
            {
                displayName: 'Style Intensity',
                name: 'styleIntensity',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                    maxValue: 1,
                    numberStepSize: 0.1,
                },
                default: 0.7,
            },
            {
                displayName: 'Query Type',
                name: 'queryType',
                type: 'options',
                options: [
                    {
                        name: 'General',
                        value: 'general',
                    },
                    {
                        name: 'Greeting',
                        value: 'greeting',
                    },
                    {
                        name: 'Consultation',
                        value: 'consultation',
                    },
                    {
                        name: 'Question',
                        value: 'question',
                    },
                ],
                default: 'general',
            },
        ],
    };
    }
    
    async execute() {
        const node = new ChibaStyleNode();
        // Bind n8n context methods
        node.getNodeParameter = this.getNodeParameter.bind(this);
        node.continueOnFail = this.continueOnFail.bind(this);
        
        const items = this.getInputData();
        return node.execute(items);
    }
}

module.exports = { ChibaStyleNode: ChibaStyleNodeExport };