export type ToneMode = 'grounded' | 'faith_centered' | 'spiritual' | 'secular';
export type VisualStyle = 'future_by_design' | 'soft_luxury' | 'minimal_clean' | 'bohemian_green' | 'bold_editorial';

export type DreamJobType =
  | 'TRANSCRIBE_INPUT'
  | 'BUILD_PROFILE'
  | 'GENERATE_CATEGORY_IMAGE'
  | 'COMPOSE_SHEET'
  | 'REGENERATE_CATEGORY_IMAGE';

export interface DreamCategory {
  category_key: string;
  display_name: string;
  desire_statement: string;
  present_tense_declaration: string;
  feeling_words: string[];
  visual_keywords: string[];
  image_prompt_seed: string;
  final_image_prompt?: string;
  aligned_actions: string[];
  certainty_score: number;
  sort_order?: number;
}

export interface DreamProfile {
  session_title: string;
  center_declaration: string;
  future_self_summary: string;
  tone_mode: ToneMode;
  visual_style: VisualStyle;
  overall_feeling_words: string[];
  categories: DreamCategory[];
  missing_information: Array<{ category_key: string; question: string }>;
  safety_notes?: string[];
}

export interface DreamJob {
  id: string;
  session_id: string;
  user_id: string;
  job_type: DreamJobType;
  payload: Record<string, unknown>;
  attempts: number;
}
