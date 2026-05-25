import { readJson, sendJson } from '../_lib/pulse-utils.js';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  try {
    if (!process.env.OPENAI_API_KEY) {
      return sendJson(res, 503, { error: 'voice_transcription_not_configured' });
    }

    const body = await readJson(req);
    const audioBase64 = String(body.audio_base64 || '');
    const mimeType = String(body.mime_type || 'audio/webm').slice(0, 80);
    if (!audioBase64) return sendJson(res, 400, { error: 'audio_required' });

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (audioBuffer.length < 1200) return sendJson(res, 400, { error: 'audio_too_short' });
    if (audioBuffer.length > MAX_AUDIO_BYTES) return sendJson(res, 413, { error: 'audio_too_large' });

    const extension = mimeType.includes('mp4') || mimeType.includes('aac') ? 'mp4' : 'webm';
    const form = new FormData();
    form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
    form.append(
      'file',
      new Blob([audioBuffer], { type: mimeType }),
      `dream-life-recording.${extension}`
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: form,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.error?.message || 'voice_transcription_failed';
        return sendJson(res, response.status, { error: message });
      }

      const transcript = String(data.text || '').trim();
      if (!transcript) return sendJson(res, 422, { error: 'empty_transcript' });

      return sendJson(res, 200, {
        ok: true,
        transcript,
        provider: 'openai',
        model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe',
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'voice_transcription_timeout' : error.message;
    return sendJson(res, 500, { error: message || 'voice_transcription_failed' });
  }
}
