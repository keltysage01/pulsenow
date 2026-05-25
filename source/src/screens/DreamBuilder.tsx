import { Mic, RefreshCw, Send, Sparkles, Square } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useDreamSession } from '../hooks/useDreamSession';
import {
  canUseDreamBackend,
  createDreamSession,
  createDreamUploadUrl,
  generateDreamPreview,
  regenerateDreamImage,
  startDreamBuild,
  submitDreamInput,
  type DreamAsset,
  type DreamPreviewItem,
} from '../lib/dreamApi';

type PulseSession = {
  name: string;
  level?: string;
  agentCode?: string;
};

type DreamBuilderProps = {
  session: PulseSession;
};

const previewStorageKey = 'pulsenow_dream_builder_preview';

function loadPreview(): DreamPreviewItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(previewStorageKey) || '[]') as DreamPreviewItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function imageForAsset(assets: DreamAsset[], categoryKey: string) {
  return assets.find((asset) => asset.category_key === categoryKey && asset.asset_kind === 'category_image' && asset.signed_url)?.signed_url || '';
}

export function DreamBuilder({ session }: DreamBuilderProps) {
  const [text, setText] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'backend' | 'preview'>(canUseDreamBackend() ? 'backend' : 'preview');
  const [previewItems, setPreviewItems] = useState<DreamPreviewItem[]>(loadPreview);
  const [previewSummary, setPreviewSummary] = useState('Describe the life you are building and PulseNow will turn it into a practical map.');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showTextEntry, setShowTextEntry] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { bundle, error: bundleError } = useDreamSession(activeSessionId, mode === 'backend');

  const assets = bundle?.assets || [];
  const sheetAsset = assets.find((asset) => asset.asset_kind === 'sheet_svg' && asset.signed_url);
  const progress = bundle?.session?.progress_percent || (busy ? 18 : previewItems.length ? 100 : 0);
  const statusMessage = bundle?.session?.current_message || message || (mode === 'preview' ? 'Preview mode uses the existing PulseNow API until Supabase Auth is connected.' : 'Ready to build.');
  const categories = bundle?.categories || [];
  const visiblePreview = useMemo(() => previewItems.slice(0, 6), [previewItems]);

  async function buildWithPrompt(prompt: string, inputType: 'text' | 'wispr_transcript' = 'text') {
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 8) {
      setError('Add a little more detail before building your map.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('Starting your Dream Life Map.');

    try {
      if (canUseDreamBackend()) {
        const created = await createDreamSession('My Dream Life Map');
        setActiveSessionId(created.session.id);
        await submitDreamInput({
          sessionId: created.session.id,
          inputType,
          text: cleanPrompt,
        });
        await startDreamBuild(created.session.id);
        setMode('backend');
        setMessage('Your dream build is queued. The worker will generate profile, images, and sheet assets.');
        return;
      }
      throw new Error('Supabase backend is not configured.');
    } catch (backendError) {
      const preview = await generateDreamPreview(cleanPrompt, previewItems, session);
      setMode('preview');
      setPreviewItems(preview.items);
      setPreviewSummary(preview.profile.future_self_summary);
      localStorage.setItem(previewStorageKey, JSON.stringify(preview.items));
      setMessage(backendError instanceof Error ? `Local preview created. Backend note: ${backendError.message}` : 'Local preview created.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAudio(audio: Blob) {
    setBusy(true);
    setError('');
    setMessage('Uploading audio.');

    try {
      const created = await createDreamSession('Voice Dream Life Map');
      setActiveSessionId(created.session.id);
      const upload = await createDreamUploadUrl(created.session.id, audio, audio.type || 'audio/webm');
      await submitDreamInput({
        sessionId: created.session.id,
        inputType: 'audio',
        audioPath: upload.path,
        audioMimeType: audio.type || 'audio/webm',
        audioSizeBytes: audio.size,
      });
      await startDreamBuild(created.session.id);
      setMode('backend');
      setMessage('Audio uploaded. OpenAI transcription will run in the worker.');
    } catch (audioError) {
      setError(audioError instanceof Error ? audioError.message : 'Audio upload failed. Paste the transcript and build from text.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener('stop', () => {
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(chunksRef.current, { type: 'audio/webm' });
        submitAudio(audio);
      });
      recorder.start();
      setRecording(true);
      setMessage('Recording. Stop when your dream life description is complete.');
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : 'Microphone access failed.');
    }
  }

  async function regenerate(categoryKey: string) {
    if (!activeSessionId) return;
    const feedback = window.prompt('What should change about this image?', 'Make it brighter, more peaceful, and more luxurious.');
    if (!feedback) return;
    setBusy(true);
    try {
      await regenerateDreamImage(activeSessionId, categoryKey, feedback);
      setMessage('Image regeneration queued.');
    } catch (regenerateError) {
      setError(regenerateError instanceof Error ? regenerateError.message : 'Could not queue regeneration.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="hero-card">
        <div className="avatar"><Sparkles size={28} /></div>
        <div>
          <p className="eyebrow">Dream Life Builder</p>
          <h2>Map the life you are building</h2>
          <p className="muted">Speak the vision first. Text stays available as a quiet fallback.</p>
        </div>
      </section>

      <section className="card dream-builder-panel dream-record-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">{mode === 'backend' ? 'Supabase worker flow' : 'PulseNow preview flow'}</p>
            <h2>Record your dream life</h2>
          </div>
        </div>

        <div className="dream-mic-wrap">
          <button className={'dream-mic-button ' + (recording ? 'is-recording' : '')} type="button" disabled={busy} onClick={toggleRecording} aria-label={recording ? 'Stop recording' : 'Start recording'}>
            {recording ? <Square size={44} /> : <Mic size={52} />}
          </button>
          <p className="muted">{recording ? 'Recording. Tap stop when you are done.' : 'Tap the mic and describe the home, money, people, work, health, and freedom you are building.'}</p>
        </div>

        <div className="dream-text-fallback">
          <button type="button" onClick={() => setShowTextEntry((current) => !current)}>{showTextEntry ? 'Hide text option' : 'Add text instead'}</button>
          {showTextEntry ? (
            <div className="dream-text-entry">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Type or paste a transcript here..."
              />
              <button className="dream-action" type="button" disabled={busy} onClick={() => buildWithPrompt(text, 'text')}>
                <Send size={18} /> Build from text
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Progress</p>
            <h2>{progress}% complete</h2>
          </div>
        </div>
        <div className="bar dream-progress"><span style={{ width: `${progress}%` }} /></div>
        <p className="muted dream-status">{bundleError || error || statusMessage}</p>
      </section>

      {sheetAsset?.signed_url ? (
        <section className="card">
          <p className="eyebrow">Final sheet</p>
          <h2>Dream Life Map</h2>
          <iframe className="dream-sheet-frame" title="Dream Life Map" src={sheetAsset.signed_url} />
        </section>
      ) : null}

      {categories.length ? (
        <section className="dream-grid">
          {categories.map((category) => (
            <article className="card dream-tile" key={category.category_key}>
              {imageForAsset(assets, category.category_key) ? <img src={imageForAsset(assets, category.category_key)} alt="" /> : null}
              <p className="eyebrow">{category.category_key}</p>
              <h2>{category.display_name}</h2>
              <p className="muted">{category.present_tense_declaration || category.desire_statement}</p>
              <button type="button" disabled={busy} onClick={() => regenerate(category.category_key)}>
                <RefreshCw size={16} /> Regenerate
              </button>
            </article>
          ))}
        </section>
      ) : null}

      {visiblePreview.length ? (
        <section className="dream-grid">
          {visiblePreview.map((item) => (
            <article className="card dream-tile" key={item.id}>
              <img src={item.image_url} alt="" />
              <p className="eyebrow">{item.area}</p>
              <h2>{item.title}</h2>
              <p className="muted">{item.description}</p>
              <strong>{item.next_action}</strong>
            </article>
          ))}
          <section className="card dream-summary">
            <p className="eyebrow">Future self</p>
            <h2>{previewSummary}</h2>
          </section>
        </section>
      ) : null}
    </>
  );
}
