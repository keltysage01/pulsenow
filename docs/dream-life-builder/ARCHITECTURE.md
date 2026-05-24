# Dream Life Builder Architecture

## Why this architecture

The app has long running work. Transcription, dream profile creation, image generation, and sheet composition can take more time than a normal frontend request should wait. The backend therefore stores state and processes jobs step by step.

## System components

1. Frontend app

The frontend records audio, accepts text, shows progress, previews categories, displays images, and renders the final Dream Life Map.

2. Supabase Auth

The user must be signed in before creating sessions or assets.

3. Supabase Postgres

Postgres stores the canonical state of every dream session.

4. Supabase Storage

Storage holds audio, generated images, sheet SVG, sheet PNG, sheet PDF, and sheet JSON.

5. Edge Functions

Edge Functions are the API layer and worker layer.

6. OpenAI provider

OpenAI handles transcription fallback, structured JSON, and generated images.

7. Wispr provider

Wispr can be used for live transcript generation when API access is confirmed. Otherwise users can paste Wispr Flow transcripts into the app.

8. Renderer

The MVP renderer creates SVG. The production renderer creates PNG and PDF with Node, Sharp, and pdf-lib.

## Data flow

1. User creates dream session.
2. User records audio or pastes text.
3. Audio is uploaded to Supabase Storage through a signed upload URL.
4. Input row is created.
5. Job row is created.
6. Worker claims next job.
7. Audio is transcribed or text is used directly.
8. Dream profile JSON is generated.
9. Categories are saved.
10. Image jobs are created.
11. Each image job generates and stores one image.
12. When all target images are ready, compose sheet job is created.
13. Sheet SVG and JSON are saved.
14. Optional renderer creates PNG and PDF.
15. Frontend shows final assets through signed URLs.

## Recommended status progression

1. `created`
2. `audio_uploaded`
3. `transcribing`
4. `transcribed`
5. `building_profile`
6. `profile_ready`
7. `generating_images`
8. `composing_sheet`
9. `sheet_ready`

## Image limits

Start with 3 images in development and 9 images in production.

Do not generate all images in one request. One image per job is easier to retry and cheaper to debug.

## Sheet design

The sheet has:

1. Title.
2. Brand subtitle.
3. Center declaration.
4. Up to 9 category cards.
5. A list of next aligned actions.
6. Safety footer.

## Future enhancements

1. Category editor before image generation.
2. User uploaded inspiration images.
3. Monthly dream life rebuilds.
4. Paid visual style packs.
5. Shareable social cards.
6. Print ordering.
7. Guided voice interview.
8. Faith mode and secular mode toggle.
9. Payment and credit system for image generations.
10. Admin dashboard for failed jobs.
