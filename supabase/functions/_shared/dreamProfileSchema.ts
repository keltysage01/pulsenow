export const dreamProfileJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'session_title',
    'center_declaration',
    'future_self_summary',
    'tone_mode',
    'visual_style',
    'overall_feeling_words',
    'categories',
    'missing_information',
    'safety_notes'
  ],
  properties: {
    session_title: { type: 'string' },
    center_declaration: { type: 'string' },
    future_self_summary: { type: 'string' },
    tone_mode: {
      type: 'string',
      enum: ['grounded', 'faith_centered', 'spiritual', 'secular']
    },
    visual_style: {
      type: 'string',
      enum: ['future_by_design', 'soft_luxury', 'minimal_clean', 'bohemian_green', 'bold_editorial']
    },
    overall_feeling_words: {
      type: 'array',
      items: { type: 'string' }
    },
    categories: {
      type: 'array',
      minItems: 6,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'category_key',
          'display_name',
          'desire_statement',
          'present_tense_declaration',
          'feeling_words',
          'visual_keywords',
          'image_prompt_seed',
          'aligned_actions',
          'certainty_score'
        ],
        properties: {
          category_key: {
            type: 'string',
            enum: [
              'identity',
              'inner_state',
              'faith',
              'body',
              'home',
              'money',
              'work',
              'relationships',
              'creativity',
              'travel',
              'daily_rhythm',
              'unavailable_for'
            ]
          },
          display_name: { type: 'string' },
          desire_statement: { type: 'string' },
          present_tense_declaration: { type: 'string' },
          feeling_words: { type: 'array', items: { type: 'string' } },
          visual_keywords: { type: 'array', items: { type: 'string' } },
          image_prompt_seed: { type: 'string' },
          aligned_actions: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: { type: 'string' }
          },
          certainty_score: {
            type: 'number',
            minimum: 0,
            maximum: 1
          }
        }
      }
    },
    missing_information: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category_key', 'question'],
        properties: {
          category_key: { type: 'string' },
          question: { type: 'string' }
        }
      }
    },
    safety_notes: {
      type: 'array',
      items: { type: 'string' }
    }
  }
} as const;
