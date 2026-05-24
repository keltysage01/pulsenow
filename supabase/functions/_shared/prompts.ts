import type { DreamCategory, ToneMode, VisualStyle } from './types.ts';

export function dreamInterpreterSystemPrompt(): string {
  return `You are the Dream Life Builder Engine for Future by Design.

You turn messy spoken dream life transcripts into a structured, emotionally safe, visual life map.

Hard rules:
1. Do not guarantee money, healing, marriage, pregnancy, health, business success, or any specific outcome.
2. Do not diagnose trauma, anxiety, depression, medical issues, or relationship conditions.
3. Use clear, beautiful, grounded language.
4. Preserve the user's real desires, but organize them into categories.
5. Use present tense declarations without sounding fake or forced.
6. Extract visual details that can become image prompts.
7. Extract feeling words and body state words.
8. If faith centered mode is selected, include God, stewardship, calling, surrender, prayer, or receiving only when it fits the transcript.
9. If the transcript includes scarcity, fear, old patterns, burnout, pressure, or people pleasing, place those in inner_state or unavailable_for.
10. Use the unavailable_for category only for patterns the user is leaving behind.
11. Keep aligned actions small, non shaming, and doable.
12. Output only JSON that matches the provided schema.`;
}

export function dreamInterpreterUserPrompt(params: {
  transcriptText: string;
  toneMode: ToneMode;
  visualStyle: VisualStyle;
}): string {
  return `Tone mode: ${params.toneMode}
Visual style: ${params.visualStyle}

Transcript:
${params.transcriptText}`;
}

export function buildImagePrompt(category: DreamCategory, visualStyle: VisualStyle): string {
  const styleMap: Record<VisualStyle, string> = {
    future_by_design: 'futuristic biophilic luxury, airy glass architecture, soft ocean glass tones, frosted white, luminous natural light, elegant editorial composition, peaceful and expensive',
    soft_luxury: 'soft luxury lifestyle photography, warm light, elegant minimal styling, clean neutral palette, calm and elevated',
    minimal_clean: 'minimal clean lifestyle imagery, spacious composition, natural light, simple elegant details',
    bohemian_green: 'cozy green bohemian interior, plants, natural textures, warm peaceful feeling',
    bold_editorial: 'bold editorial magazine style, high confidence, modern, aspirational, cinematic'
  };

  return `Create one premium inspirational image for a dream life vision sheet.

Category: ${category.display_name}
Desire: ${category.desire_statement}
Feeling words: ${category.feeling_words.join(', ')}
Visual keywords: ${category.visual_keywords.join(', ')}
Image seed: ${category.image_prompt_seed}
Visual style: ${styleMap[visualStyle]}

Composition:
Square image, clear focal point, elevated lifestyle aesthetic, enough open space for cropping into a card.

Restrictions:
No words, no letters, no logos, no fake app interface, no watermark, no distorted hands, no extra limbs.
Do not depict a real private person unless the user has explicitly uploaded and approved a reference image.`;
}
