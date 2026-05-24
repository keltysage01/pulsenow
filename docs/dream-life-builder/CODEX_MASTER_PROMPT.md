# Codex Master Prompt For Dream Life Builder

You are working in the user's GitHub repository. Build the Dream Life Builder feature end to end using Supabase, OpenAI, and optional Wispr Flow.

## Product goal

Build a feature where a user can speak, paste, or type their dream life. The app turns the input into a structured dream profile, generates images for each category, and creates a printable Dream Life Map.

## Required architecture

1. Supabase Auth owns the user identity.
2. Supabase Postgres stores sessions, transcripts, categories, assets, sheets, jobs, and events.
3. Supabase Storage stores private audio, generated images, sheet SVG, sheet PNG, sheet PDF, and JSON.
4. Supabase Edge Functions handle authenticated API calls and background worker processing.
5. OpenAI handles fallback transcription, structured dream profile creation, and image generation.
6. Wispr Flow is optional. If Wispr API access exists, use it for live or REST transcription. If not, the app must still work through OpenAI transcription and text input.
7. The frontend listens to Supabase Realtime or polls the session status to show progress.
8. The app supports regenerating one category image without rebuilding the whole dream profile.

## Non negotiable behavior

1. The app must never promise guaranteed money, healing, marriage, business success, health results, or any specific outcome.
2. The app must store private assets in a private Supabase bucket.
3. All user owned rows must use Row Level Security.
4. The service role key must never be exposed to the browser.
5. The frontend must only use the anon key.
6. Long work must happen through background jobs, not directly in the page request.
7. Any image can be regenerated independently.
8. The final sheet must be renderable from saved JSON so layouts can change later.
9. Wispr is a provider, not the core dependency.
10. The first shippable version must work with text input even if audio providers fail.

## Build steps

### Step 1: Add Supabase migration

Add the SQL migration in `supabase/migrations/202605230001_dream_life_builder.sql`.

Verify that these tables exist:

1. `user_profiles`
2. `dream_sessions`
3. `dream_inputs`
4. `dream_profiles`
5. `dream_categories`
6. `dream_assets`
7. `dream_sheets`
8. `dream_jobs`
9. `dream_job_events`
10. `dream_usage_events`

Verify that `dream_life_assets` private storage bucket exists.

Verify that RLS policies allow a user to read and update only their own rows.

### Step 2: Add Edge Functions

Add these functions under `supabase/functions`:

1. `dream_create_session`
2. `dream_create_upload_url`
3. `dream_submit_input`
4. `dream_start_build`
5. `dream_get_session`
6. `dream_regenerate_image`
7. `dream_worker`

Shared code goes in `supabase/functions/_shared`.

### Step 3: Add worker processing

The worker should claim one job at a time and process it.

Job types:

1. `TRANSCRIBE_INPUT`
2. `BUILD_PROFILE`
3. `GENERATE_CATEGORY_IMAGE`
4. `COMPOSE_SHEET`
5. `REGENERATE_CATEGORY_IMAGE`

The worker endpoint must require `x-dream-worker-secret`.

### Step 4: Add frontend calls

Add `frontend/lib/dreamApi.ts` or adapt these methods into the existing app service layer.

Required frontend actions:

1. Create dream session.
2. Create signed audio upload URL.
3. Upload audio to signed URL.
4. Submit text, audio, or Wispr transcript input.
5. Start build.
6. Fetch dream session bundle.
7. Subscribe to updates.
8. Regenerate one category image.

### Step 5: Add UI

Add a page or route called Dream Life Builder.

Screens:

1. Start screen.
2. Voice recorder or transcript box.
3. Progress screen.
4. Category review screen if profile is ready.
5. Final Dream Life Map viewer.
6. Regenerate image control.

### Step 6: Add renderer

MVP renderer creates SVG in the Supabase worker.

Production renderer should create PNG and PDF using a Node runtime route with `sharp` and `pdf-lib`.

Recommended route:

`POST /api/dreams/render`

This route takes `session_id`, downloads the SVG, converts it to PNG, embeds PNG into a US letter PDF, uploads both files to Supabase Storage, then updates `dream_sheets` and `dream_assets`.

### Step 7: Add worker trigger

For development, trigger manually with curl.

For production, use Supabase Cron to call the worker every minute or use an external scheduler.

### Step 8: Acceptance tests

Implement or manually verify these flows:

1. A signed in user creates a session.
2. User submits typed text.
3. Worker builds profile.
4. Worker generates category images.
5. Worker composes SVG sheet.
6. User can view sheet SVG through signed URL.
7. User can regenerate one category image.
8. Another user cannot read the first user's session.
9. Audio upload stores the audio under `user_id/session_id/audio`.
10. Image assets store under `user_id/session_id/images`.
11. Sheet assets store under `user_id/session_id/sheets`.
12. If Wispr is disabled, OpenAI transcription works.
13. If OpenAI image generation fails, job retries and shows a friendly failed state.

## Dream profile JSON requirements

The AI must return this structure:

```json
{
  "session_title": "string",
  "center_declaration": "string",
  "future_self_summary": "string",
  "tone_mode": "faith_centered",
  "visual_style": "future_by_design",
  "overall_feeling_words": ["safe", "spacious"],
  "categories": [
    {
      "category_key": "home",
      "display_name": "Home And Environment",
      "desire_statement": "I live in a bright peaceful home surrounded by beauty.",
      "present_tense_declaration": "My home feels safe, beautiful, and alive.",
      "feeling_words": ["peaceful", "clean"],
      "visual_keywords": ["glass home", "plants", "morning light"],
      "image_prompt_seed": "A bright biophilic home with glass, plants, and soft morning light.",
      "aligned_actions": ["Save three images that reflect the feeling of home."],
      "certainty_score": 0.92
    }
  ],
  "missing_information": [
    {
      "category_key": "relationships",
      "question": "Who is with you in this dream life?"
    }
  ],
  "safety_notes": []
}
```

## Brand voice

The app should feel like:

1. Calm.
2. Spacious.
3. Emotionally safe.
4. Expensive but not cold.
5. Faith friendly but not forced.
6. Future self focused.
7. Clear enough to print.

## Default visual style

Use `future_by_design` as default.

Visual direction:

Futuristic biophilic luxury, airy glass architecture, frosted white, soft ocean glass colors, plants, water, luminous natural light, spacious interiors, regulated nervous system feeling, peaceful and expensive.

## Environment variables

Use `.env.example` in this pack.

## Files included in this pack

1. SQL migration.
2. Supabase Edge Function skeletons.
3. Shared OpenAI and Wispr provider code.
4. Frontend API helpers.
5. Frontend sample components.
6. Optional Next.js renderer route.
7. Cron setup SQL.
8. Deployment checklist.
