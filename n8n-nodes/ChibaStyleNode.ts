import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

// Import style processing modules
import * as fs from 'fs';
import * as path from 'path';

interface StyleDNA {
    vocabulary: string[];
    structures: Array<{
        pattern: string;
        weight: number;
    }>;
    rhetorical_devices: Array<{
        name: string;
        patterns: string[];
        insertion_points: string[];
        frequency: number;
    }>;
    emotion_markers: string[];
}

interface ValidationResult {
    totalScore: number;
    scores: {
        vocabulary: number;
        structure: number;
        rhetoric: number;
        emotion: number;
    };
    grade: string;
    isAuthentic: boolean;
    feedback: string[];
}

export class ChibaStyleNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Chiba Style',
        name: 'chibaStyle',
        icon: 'fa:magic',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Apply Chiba style DNA to text for authentic communication',
        defaults: {
            name: 'Chiba Style',
            color: '#FF6B6B',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Apply Style',
                        value: 'inject',
                        description: 'Apply Chiba style to text',
                    },
                    {
                        name: 'Validate Style',
                        value: 'validate',
                        description: 'Check if text matches Chiba style',
                    },
                    {
                        name: 'Apply and Validate',
                        value: 'both',
                        description: 'Apply style and validate result',
                    },
                ],
                default: 'both',
                description: 'The operation to perform',
            },
            {
                displayName: 'Text Field',
                name: 'textField',
                type: 'string',
                default: 'text',
                required: true,
                description: 'The field containing the text to process',
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
                displayOptions: {
                    show: {
                        operation: ['inject', 'both'],
                    },
                },
                description: 'How strongly to apply the style (0-1)',
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
                description: 'Type of query for optimized styling',
            },
            {
                displayName: 'Advanced Options',
                name: 'advancedOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Min Score',
                        name: 'minScore',
                        type: 'number',
                        default: 50,
                        description: 'Minimum acceptable style score',
                    },
                    {
                        displayName: 'Max Retries',
                        name: 'maxRetries',
                        type: 'number',
                        default: 3,
                        description: 'Maximum attempts to achieve min score',
                    },
                    {
                        displayName: 'Include Metrics',
                        name: 'includeMetrics',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to include performance metrics',
                    },
                    {
                        displayName: 'Preserve Original',
                        name: 'preserveOriginal',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to keep the original text',
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        
        // Load style DNA
        let styleDNA: StyleDNA;
        try {
            const dnaPath = path.join('/home/node/data', 'chiba-style-dna.json');
            const dnaContent = await fs.promises.readFile(dnaPath, 'utf8');
            styleDNA = JSON.parse(dnaContent);
        } catch (error) {
            throw new NodeOperationError(
                this.getNode(),
                'Failed to load Chiba style DNA: ' + error.message,
            );
        }

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const operation = this.getNodeParameter('operation', itemIndex) as string;
                const textField = this.getNodeParameter('textField', itemIndex) as string;
                const styleIntensity = this.getNodeParameter('styleIntensity', itemIndex, 0.7) as number;
                const queryType = this.getNodeParameter('queryType', itemIndex) as string;
                
                const advancedOptions = this.getNodeParameter('advancedOptions', itemIndex) as {
                    minScore?: number;
                    maxRetries?: number;
                    includeMetrics?: boolean;
                    preserveOriginal?: boolean;
                };

                const originalText = items[itemIndex].json[textField] as string;
                if (!originalText) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `Field "${textField}" not found or empty in item ${itemIndex}`,
                    );
                }

                const startTime = Date.now();
                let result: any = {
                    ...items[itemIndex].json,
                };

                if (advancedOptions.preserveOriginal) {
                    result.originalText = originalText;
                }

                let styledText = originalText;
                let attempts = 0;
                let currentScore = 0;
                let validation: ValidationResult | null = null;

                // Apply style with retries if needed
                if (operation === 'inject' || operation === 'both') {
                    const maxRetries = advancedOptions.maxRetries || 3;
                    const minScore = advancedOptions.minScore || 50;

                    do {
                        attempts++;
                        styledText = await this.applyStyle(
                            originalText,
                            styleDNA,
                            styleIntensity + (attempts - 1) * 0.1, // Increase intensity on retries
                            queryType,
                        );

                        if (operation === 'both' || attempts > 1) {
                            validation = await this.validateStyle(styledText, styleDNA);
                            currentScore = validation.totalScore;
                        }
                    } while (
                        currentScore < minScore &&
                        attempts < maxRetries &&
                        (operation === 'both' || attempts > 1)
                    );

                    result[textField] = styledText;
                    result.styledText = styledText;
                }

                // Validate style
                if (operation === 'validate' || operation === 'both') {
                    if (!validation) {
                        validation = await this.validateStyle(
                            operation === 'validate' ? originalText : styledText,
                            styleDNA,
                        );
                    }
                    result.validation = validation;
                }

                // Add metrics if requested
                if (advancedOptions.includeMetrics) {
                    result.metrics = {
                        processingTime: Date.now() - startTime,
                        attempts: attempts,
                        finalIntensity: styleIntensity + (attempts - 1) * 0.1,
                        queryType: queryType,
                        operation: operation,
                    };
                }

                returnData.push({
                    json: result,
                    pairedItem: {
                        item: itemIndex,
                    },
                });

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                            ...items[itemIndex].json,
                        },
                        pairedItem: {
                            item: itemIndex,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }

    private async applyStyle(
        text: string,
        styleDNA: StyleDNA,
        intensity: number,
        queryType: string,
    ): Promise<string> {
        let styledText = text;

        // Apply greeting pattern for greeting queries
        if (queryType === 'greeting' && !text.startsWith('チバです')) {
            styledText = 'チバです。\n\n' + styledText;
        }

        // Add rhetorical devices based on intensity
        for (const device of styleDNA.rhetorical_devices) {
            if (Math.random() < device.frequency * intensity) {
                // Apply rhetorical pattern
                if (device.name === 'self_questioning' && !styledText.includes('なぜか？')) {
                    const insertPoint = this.findInsertPoint(styledText, device.insertion_points);
                    if (insertPoint !== -1) {
                        styledText = styledText.slice(0, insertPoint) + '\n\nなぜか？\n' + 
                                   styledText.slice(insertPoint);
                    }
                }
            }
        }

        // Apply vocabulary replacements
        const vocabularyMap: { [key: string]: string } = {
            '頑張': 'ガンガン',
            'たくさん': 'ガッツリ',
            '進め': 'ゴリゴリ',
            'しっかり': 'ガッチリ',
        };

        for (const [original, replacement] of Object.entries(vocabularyMap)) {
            if (styledText.includes(original) && Math.random() < intensity) {
                styledText = styledText.replace(new RegExp(original, 'g'), replacement);
            }
        }

        // Add emotion markers
        if (Math.random() < intensity * 0.5) {
            const emotions = styleDNA.emotion_markers;
            const emotion = emotions[Math.floor(Math.random() * emotions.length)];
            if (!styledText.includes(emotion)) {
                styledText += '\n\n' + emotion;
            }
        }

        // Add conclusion pattern if it's a consultation
        if (queryType === 'consultation' && !styledText.includes('結論')) {
            styledText += '\n\n結論。\n失敗を恐れずにガンガン挑戦することが大切です。';
        }

        // Apply paragraph structure
        styledText = this.applyParagraphStructure(styledText, styleDNA.structures);

        return styledText;
    }

    private async validateStyle(text: string, styleDNA: StyleDNA): Promise<ValidationResult> {
        const scores = {
            vocabulary: 0,
            structure: 0,
            rhetoric: 0,
            emotion: 0,
        };

        // Vocabulary scoring
        const vocabCount = styleDNA.vocabulary.filter(word => text.includes(word)).length;
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
        const emotionCount = styleDNA.emotion_markers.filter(marker => text.includes(marker)).length;
        scores.emotion = Math.min(25, emotionCount * 8);

        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
        const grade = this.calculateGrade(totalScore);

        const feedback = [];
        if (scores.vocabulary < 10) feedback.push('チバ特有の語彙をもっと使用してください');
        if (scores.structure < 10) feedback.push('段落構造を改善してください');
        if (scores.rhetoric < 10) feedback.push('修辞技法を追加してください');
        if (scores.emotion < 10) feedback.push('感情表現を増やしてください');

        return {
            totalScore,
            scores,
            grade,
            isAuthentic: totalScore >= 50,
            feedback,
        };
    }

    private findInsertPoint(text: string, insertionPoints: string[]): number {
        // Simple implementation - find middle of text
        const sentences = text.split('。');
        if (sentences.length > 2) {
            const middleIndex = Math.floor(sentences.length / 2);
            return text.indexOf(sentences[middleIndex]) + sentences[middleIndex].length + 1;
        }
        return -1;
    }

    private applyParagraphStructure(text: string, structures: any[]): string {
        // Ensure proper paragraph breaks
        let structured = text.replace(/。/g, '。\n');
        structured = structured.replace(/\n+/g, '\n\n');
        structured = structured.trim();
        
        return structured;
    }

    private calculateGrade(score: number): string {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        if (score >= 50) return 'E';
        return 'F';
    }
}