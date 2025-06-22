const { IExecuteFunctions } = require('n8n-core');
const { INodeExecutionData, INodeType, INodeTypeDescription } = require('n8n-workflow');

/**
 * CSDSをn8nで利用するためのカスタムノード
 */
class ChibaStyleNode {
  description = {
    displayName: 'Chiba Style DNA',
    name: 'chibaStyleDNA',
    group: ['transform'],
    version: 1,
    description: 'Apply Chiba\'s unique style to text using CSDS',
    defaults: {
      name: 'Chiba Style DNA',
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
            name: 'Inject Style',
            value: 'inject',
            description: 'Apply Chiba style to text'
          },
          {
            name: 'Validate Style',
            value: 'validate',
            description: 'Check if text matches Chiba style'
          },
          {
            name: 'Both',
            value: 'both',
            description: 'Inject and validate style'
          }
        ],
        default: 'both',
        description: 'The operation to perform'
      },
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        typeOptions: {
          rows: 10,
        },
        default: '',
        required: true,
        description: 'The text to process'
      },
      {
        displayName: 'Query Type',
        name: 'queryType',
        type: 'options',
        options: [
          {
            name: 'General',
            value: 'general'
          },
          {
            name: 'Greeting',
            value: 'greeting'
          },
          {
            name: 'Consultation',
            value: 'consultation'
          },
          {
            name: 'Question',
            value: 'question'
          }
        ],
        default: 'general',
        description: 'Type of query for better style adaptation'
      },
      {
        displayName: 'Style Intensity',
        name: 'styleIntensity',
        type: 'number',
        typeOptions: {
          minValue: 0,
          maxValue: 1,
          stepSize: 0.1
        },
        default: 0.7,
        description: 'How strongly to apply Chiba style (0-1)'
      },
      {
        displayName: 'Minimum Score',
        name: 'minScore',
        type: 'number',
        default: 50,
        description: 'Minimum acceptable style score (for retry logic)'
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: 'number',
        default: 3,
        description: 'Maximum number of style injection attempts'
      }
    ]
  };

  async execute(context) {
    const items = context.getInputData();
    const returnItems = [];

    // Load CSDS modules
    const ChibaStyleInjector = require('../lib/style-injector');
    const ChibaStyleValidator = require('../lib/style-validator');
    
    const injector = new ChibaStyleInjector();
    const validator = new ChibaStyleValidator();
    
    // Initialize modules
    await injector.initialize();
    await validator.initialize();

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const operation = context.getNodeParameter('operation', itemIndex);
        const text = context.getNodeParameter('text', itemIndex);
        const queryType = context.getNodeParameter('queryType', itemIndex);
        const styleIntensity = context.getNodeParameter('styleIntensity', itemIndex);
        const minScore = context.getNodeParameter('minScore', itemIndex);
        const maxRetries = context.getNodeParameter('maxRetries', itemIndex);

        // Build query analysis object
        const queryAnalysis = {
          type: queryType,
          keywords: [],
          expandedKeywords: [],
          originalQuery: text,
          isGreeting: queryType === 'greeting',
          styleIntensity
        };

        let result = {
          originalText: text,
          operation
        };

        // Style injection
        if (operation === 'inject' || operation === 'both') {
          result.styledText = await injector.injectStyle(text, queryAnalysis);
        }

        // Style validation
        if (operation === 'validate' || operation === 'both') {
          const textToValidate = result.styledText || text;
          const validationResult = await validator.validate(textToValidate);
          
          result.validation = {
            totalScore: validationResult.totalScore,
            grade: validationResult.grade,
            isAuthentic: validationResult.isAuthentic,
            scores: validationResult.scores,
            feedback: validationResult.feedback
          };
        }

        // Retry logic for both operations
        if (operation === 'both' && result.validation.totalScore < minScore) {
          result.attempts = 1;
          
          for (let i = 1; i < maxRetries && result.validation.totalScore < minScore; i++) {
            result.attempts++;
            
            // Increase style intensity
            const newIntensity = Math.min(1, styleIntensity + (i * 0.1));
            queryAnalysis.styleIntensity = newIntensity;
            
            result.styledText = await injector.injectStyle(text, queryAnalysis);
            const newValidation = await validator.validate(result.styledText);
            
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

        returnItems.push({
          json: result,
          pairedItem: itemIndex
        });

      } catch (error) {
        returnItems.push({
          json: {
            error: error.message,
            originalText: context.getNodeParameter('text', itemIndex)
          },
          pairedItem: itemIndex
        });
      }
    }

    return [returnItems];
  }
}

module.exports = {
  nodeClass: ChibaStyleNode
};