export interface WisprTranscriptionResult {
  text: string;
  detected_language?: string;
  metadata: Record<string, unknown>;
}

export async function transcribeWithWisprRest(params: {
  audioBase64: string;
  language?: string[];
  userId?: string;
  firstName?: string;
  lastName?: string;
  dictionary?: string[];
}): Promise<WisprTranscriptionResult> {
  const apiKey = Deno.env.get('WISPR_API_KEY');
  if (!apiKey) {
    throw new Error('Missing WISPR_API_KEY');
  }

  const response = await fetch('https://platform-api.wisprflow.ai/api', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio: params.audioBase64,
      language: params.language ?? ['en'],
      context: {
        app: { name: 'Dream Life Builder', type: 'ai' },
        dictionary_context: params.dictionary ?? ['Future by Design', 'Dream Life Builder'],
        user_identifier: params.userId,
        user_first_name: params.firstName,
        user_last_name: params.lastName,
        textbox_contents: {
          before_text: '',
          selected_text: '',
          after_text: ''
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Wispr transcription failed: ${response.status} ${text}`);
  }

  const json = await response.json();
  return {
    text: json.text ?? '',
    detected_language: json.detected_language,
    metadata: {
      provider: 'wispr',
      id: json.id,
      total_time: json.total_time,
      generated_tokens: json.generated_tokens,
      raw: json
    }
  };
}
