import { dreamProfileJsonSchema } from './dreamProfileSchema.ts';
import { dreamInterpreterSystemPrompt, dreamInterpreterUserPrompt } from './prompts.ts';
import type { DreamProfile, ToneMode, VisualStyle } from './types.ts';

function getOpenAIKey(): string {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('Missing OPENAI_API_KEY');
  return key;
}

async function openAIJson(path: string, body: unknown): Promise<any> {
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI ${path} failed: ${response.status} ${text}`);
  }

  return await response.json();
}

export async function transcribeWithOpenAI(fileBlob: Blob, filename: string): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const model = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'gpt-4o-transcribe';
  const form = new FormData();
  form.append('file', fileBlob, filename);
  form.append('model', model);
  form.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`
    },
    body: form
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI transcription failed: ${response.status} ${text}`);
  }

  const json = await response.json();
  return {
    text: json.text ?? '',
    metadata: {
      provider: 'openai',
      model,
      raw: json
    }
  };
}

export async function buildDreamProfileWithOpenAI(params: {
  transcriptText: string;
  toneMode: ToneMode;
  visualStyle: VisualStyle;
}): Promise<DreamProfile> {
  const model = Deno.env.get('OPENAI_TEXT_MODEL') ?? 'gpt-5.5';

  const json = await openAIJson('responses', {
    model,
    input: [
      { role: 'system', content: dreamInterpreterSystemPrompt() },
      { role: 'user', content: dreamInterpreterUserPrompt(params) }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'dream_life_profile',
        strict: true,
        schema: dreamProfileJsonSchema
      }
    }
  });

  const outputText = extractOutputText(json);
  if (!outputText) {
    throw new Error('OpenAI returned no output_text for dream profile');
  }

  return JSON.parse(outputText) as DreamProfile;
}

export async function generateImageWithOpenAI(params: {
  prompt: string;
  size?: string;
  quality?: string;
}): Promise<{ bytes: Uint8Array; metadata: Record<string, unknown> }> {
  const model = Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-2';
  const size = params.size ?? Deno.env.get('OPENAI_IMAGE_SIZE') ?? '1024x1024';
  const quality = params.quality ?? Deno.env.get('OPENAI_IMAGE_QUALITY') ?? 'medium';

  const json = await openAIJson('images/generations', {
    model,
    prompt: params.prompt,
    size,
    quality,
    n: 1
  });

  const b64 = json?.data?.[0]?.b64_json ?? json?.data?.[0]?.b64;
  if (!b64) {
    throw new Error('OpenAI image generation returned no base64 image');
  }

  return {
    bytes: base64ToBytes(b64),
    metadata: {
      provider: 'openai',
      model,
      size,
      quality,
      revised_prompt: json?.data?.[0]?.revised_prompt ?? null
    }
  };
}

function extractOutputText(json: any): string {
  if (typeof json.output_text === 'string') return json.output_text;

  const parts: string[] = [];
  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }
  return parts.join('\n');
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
