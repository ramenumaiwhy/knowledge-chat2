const { IExecuteFunctions } = require('n8n-core');
const { INodeExecutionData, INodeType, INodeTypeDescription } = require('n8n-workflow');
const ChibaStyleInjector = require('../lib/style-injector');
const ChibaStyleValidator = require('../lib/style-validator');

class ChibaStyleNode {
  description = {
    displayName: 'Chiba Style DNA',
    name: 'chibaStyle',
    icon: 'fa:magic',
    group: ['transform'],
    version: 1,
    description: 'Apply and validate Chiba style to text',
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
            description: 'Apply Chiba style to text',
          },
          {
            name: 'Validate Style',
            value: 'validate',
            description: 'Check if text matches Chiba style',
          },
          {
            name: 'Inject and Validate',
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
        description: 'The field containing the text to process',
      },
      {
        displayName: 'Query Type',
        name: 'queryType',
        type: 'options',
        options: [
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
          {
            name: 'General',
            value: 'general',
          },
        ],
        default: 'general',
        displayOptions: {
          show: {
            operation: ['inject', 'both'],
          },
        },
        description: 'The type of query for style injection',
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
        description: 'How strongly to apply Chiba style (0-1)',
      },
      {
        displayName: 'Minimum Score',
        name: 'minScore',
        type: 'number',
        typeOptions: {
          minValue: 0,
          maxValue: 100,
        },
        default: 50,
        displayOptions: {
          show: {
            operation: ['validate', 'both'],
          },
        },
        description: 'Minimum score to pass validation',
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: 'number',
        typeOptions: {
          minValue: 0,
          maxValue: 5,
        },
        default: 3,
        displayOptions: {
          show: {
            operation: ['both'],
          },
        },
        description: 'Maximum number of retries if validation fails',
      },
    ],
  };

  async execute(context) {
    const items = context.getInputData();
    const operation = context.getNodeParameter('operation', 0);
    const returnData = [];
    
    const injector = new ChibaStyleInjector();
    const validator = new ChibaStyleValidator();
    
    // 初期化
    await injector.initialize();
    await validator.initialize();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const textField = context.getNodeParameter('textField', i);
      const text = item.json[textField];
      
      if (!text) {
        throw new Error(`Text field "${textField}" not found in input`);
      }

      let result = {
        originalText: text,
      };

      if (operation === 'inject' || operation === 'both') {
        const queryType = context.getNodeParameter('queryType', i);
        const styleIntensity = context.getNodeParameter('styleIntensity', i);
        
        const queryAnalysis = {
          type: queryType,
          keywords: [],
          expandedKeywords: [],
          originalQuery: text,
          isGreeting: queryType === 'greeting',
          styleIntensity,
        };

        result.styledText = await injector.injectStyle(text, queryAnalysis);
      }

      if (operation === 'validate' || operation === 'both') {
        const textToValidate = result.styledText || text;
        const validationResult = await validator.validate(textToValidate);
        
        result.validation = {
          totalScore: validationResult.totalScore,
          grade: validationResult.grade,
          isAuthentic: validationResult.isAuthentic,
          scores: validationResult.scores,
          feedback: validationResult.feedback,
        };
      }

      if (operation === 'both') {
        const minScore = context.getNodeParameter('minScore', i);
        const maxRetries = context.getNodeParameter('maxRetries', i);
        
        let attempts = 0;
        while (result.validation.totalScore < minScore && attempts < maxRetries) {
          attempts++;
          
          // スタイル強度を徐々に上げて再試行
          const newIntensity = Math.min(1, 0.7 + (attempts * 0.1));
          const queryAnalysis = {
            type: context.getNodeParameter('queryType', i),
            keywords: [],
            expandedKeywords: [],
            originalQuery: text,
            isGreeting: context.getNodeParameter('queryType', i) === 'greeting',
            styleIntensity: newIntensity,
          };
          
          result.styledText = await injector.injectStyle(text, queryAnalysis);
          const newValidation = await validator.validate(result.styledText);
          
          result.validation = {
            totalScore: newValidation.totalScore,
            grade: newValidation.grade,
            isAuthentic: newValidation.isAuthentic,
            scores: newValidation.scores,
            feedback: newValidation.feedback,
          };
          
          result.attempts = attempts + 1;
          result.finalIntensity = newIntensity;
        }
      }

      returnData.push({
        json: {
          ...item.json,
          chibaStyle: result,
        },
      });
    }

    return [returnData];
  }
}

module.exports = {
  nodeClass: ChibaStyleNode,
};