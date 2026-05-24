# Dream Life Builder API Contract

All frontend calls should use Supabase Edge Functions unless this repository already has a Next.js API layer.

## Create session

Function:

`dream_create_session`

Request:

```json
{
  "title": "My Dream Life Map",
  "tone_mode": "faith_centered",
  "visual_style": "future_by_design"
}
```

Response:

```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "My Dream Life Map",
    "status": "created",
    "progress_percent": 0
  }
}
```

## Create upload URL

Function:

`dream_create_upload_url`

Request:

```json
{
  "session_id": "uuid",
  "file_ext": "webm",
  "content_type": "audio/webm"
}
```

Response:

```json
{
  "bucket": "dream_life_assets",
  "path": "user_id/session_id/audio/input_123.webm",
  "signed_upload_url": "https://...",
  "token": "signed upload token"
}
```

## Submit input

Function:

`dream_submit_input`

Typed text request:

```json
{
  "session_id": "uuid",
  "input_type": "text",
  "voice_provider": "manual_text",
  "raw_text": "I wake up in a beautiful home...",
  "language": "en"
}
```

Audio request:

```json
{
  "session_id": "uuid",
  "input_type": "audio",
  "voice_provider": "native_browser",
  "audio_storage_path": "user_id/session_id/audio/input_123.webm",
  "audio_mime_type": "audio/webm",
  "audio_size_bytes": 1234567,
  "language": "en"
}
```

Wispr transcript request:

```json
{
  "session_id": "uuid",
  "input_type": "wispr_transcript",
  "voice_provider": "wispr",
  "transcript_text": "I wake up in a beautiful home...",
  "language": "en"
}
```

Response:

```json
{
  "input": {},
  "job_id": "uuid"
}
```

## Start build

Function:

`dream_start_build`

Request:

```json
{
  "session_id": "uuid"
}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

## Get session bundle

Function:

`dream_get_session?session_id=uuid`

Response:

```json
{
  "session": {},
  "inputs": [],
  "profile": {},
  "categories": [],
  "assets": [],
  "sheet": {},
  "events": []
}
```

## Regenerate category image

Function:

`dream_regenerate_image`

Request:

```json
{
  "session_id": "uuid",
  "category_key": "home",
  "user_feedback": "Make it brighter, greener, and more luxurious."
}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

## Worker

Function:

`dream_worker`

Headers:

```txt
x-dream-worker-secret: long_random_secret
```

Response when idle:

```json
{
  "status": "idle"
}
```

Response when processed:

```json
{
  "status": "processed",
  "job_id": "uuid",
  "result": {}
}
```
