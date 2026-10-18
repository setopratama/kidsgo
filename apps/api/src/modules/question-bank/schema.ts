/**
 * JSON Schema resmi Fastify untuk validasi berkas Bank Soal v1.0
 */

export const questionBankFileSchema = {
  $id: 'https://kidsgo.app/schemas/question-bank-v1.json',
  type: 'object',
  required: [
    'schema_version',
    'subject',
    'education_level',
    'semester',
    'topic',
    'difficulty',
    'questions',
  ],
  additionalProperties: false,
  properties: {
    schema_version: {
      type: 'string',
      const: '1.0',
    },
    subject: {
      type: 'string',
      enum: ['mathematics'],
    },
    education_level: {
      type: 'string',
      enum: ['TK_A', 'TK_B', 'SD_1', 'SD_2', 'SD_3', 'SD_4', 'SD_5', 'SD_6'],
    },
    semester: {
      type: 'integer',
      enum: [1, 2],
    },
    topic: {
      type: 'string',
      minLength: 2,
      maxLength: 50,
    },
    difficulty: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
    },
    level_number: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
    },
    level: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
    },
    level_name: {
      type: 'string',
    },
    target_level_id: {
      type: 'string',
    },
    questions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: [
          'question_id',
          'type',
          'question',
          'options',
          'correct_answer',
          'explanation',
          'tags',
        ],
        additionalProperties: false,
        properties: {
          level_number: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
          level: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
          question_id: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
          },
          type: {
            type: 'string',
            enum: ['multiple_choice', 'number_input'],
          },
          question: {
            type: 'string',
            minLength: 3,
          },
          visual: {
            type: ['string', 'null'],
          },
          options: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              required: ['id', 'text'],
              additionalProperties: false,
              properties: {
                id: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 5,
                },
                text: {
                  type: 'string',
                  minLength: 1,
                },
                visual: {
                  type: ['string', 'null'],
                },
              },
            },
          },
          correct_answer: {
            type: 'string',
            minLength: 1,
          },
          explanation: {
            type: 'string',
            minLength: 3,
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    },
  },
} as const;
