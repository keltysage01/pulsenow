# Codex Master Prompt: Build PulseNow Contact Intelligence Backend

You are continuing backend work in the current PulseNow GitHub repo.

## Current repo and deployment

- Local clean repo: `/tmp/pulsenow-git`
- GitHub remote: `https://github.com/keltysage01/pulsenow.git`
- Main branch: `main`
- Production app: `https://pulsenow-push.vercel.app`
- Local preview: `http://127.0.0.1:5174/`
- Existing app stack: Vite + React static app, Vercel API routes, Supabase Auth/Postgres/Storage/Edge Functions
- Existing build command: `npm run build`

Do not rebuild the UI from scratch. Preserve the existing PulseNow design, navigation, auth flow, assets, and Vite source structure. Add only the backend functionality and the minimal Contact Intelligence screen/components needed to connect the feature.

Before editing, run:

```bash
git status --short
npm run build
```

If the repo is dirty, inspect the changes and do not overwrite user work. If the build fails before your edits, report the pre-existing failure before continuing.

## Backend pack

Use the Contact Intelligence backend pack provided by the user:

`/Users/keltyforman/Downloads/contact_intelligence_backend_pack.zip`

The pack contains the reference migration, Supabase Edge Functions, shared TypeScript helpers, frontend starter contracts, tests, API contract, and compliance guardrails. Use it as source material, but adapt it to PulseNow's actual repository structure.

Do not blindly copy Next.js starter files from the pack. PulseNow is not currently a Next.js App Router app. Frontend integration belongs under `source/src/`, and deployed server routes currently live under `api/`. Supabase Edge Functions belong under `supabase/functions/`.

## Product goal

Build **Contact Intelligence** so a logged-in PulseNow user can upload a contact CSV and the system will:

1. Store the raw CSV securely in Supabase Storage.
2. Parse and normalize names, phones, emails, follow-up dates, companies, roles, notes, social links, and qualifier fields.
3. Populate an organized contact chart/table that clearly lists every imported contact by name.
4. Segment contacts by values including:
   - man
   - woman
   - nonbinary
   - other
   - unknown
   - not_provided
   - captive agent
   - non captive independent
   - potential life insurance partner
   - potential financial educator
   - referral partner
   - client prospect
   - nurture
   - manual review
5. Use AI to summarize evidence and recommend next actions.
6. Let the user click **Research socials + LinkedIn**.
7. Export a cleaned, organized CSV.

## Required output clarity

The post-import experience must be obvious to a non-technical user. Do not show a vague generated chart without explaining who is in it and why they are grouped.

After a CSV import, the page should lead with:

1. A clear heading such as **Potential Prospects From This CSV**.
2. A count summary: total contacts imported, total potential prospects, total manual review, total do not contact, total missing key info.
3. A visible named list/table where every parsed contact appears by cleaned full name. If a name is missing, show the best available identifier such as email or phone and flag `missing_name`.
4. A plain-language note that these people are **potential prospects**, not approved leads, until the user reviews the evidence and next action.
5. Category summary cards with short helper text explaining what each category means.

Each contact row should make the prospect framing clear:

- Show `Prospect status` as one of: `Potential prospect`, `Needs review`, `Nurture`, `Do not contact`, `Not enough data`.
- Show `Why this category` as a short evidence-based sentence.
- Show `What to do next` as a human-reviewed suggested next step.
- Show `Missing info` when the CSV lacks phone, email, name, company, role, or useful notes.
- Keep the contact's name visible while horizontal scrolling the table if practical.

Category helper text should be available in the UI and export metadata:

- **Life insurance partner**: may be a fit for insurance partnership or recruiting conversation based on allowed professional evidence.
- **Financial educator**: may be a fit for financial education, workshops, or community education based on role, notes, or public professional context.
- **Referral partner**: may know people who need support but is not necessarily a direct client or partner.
- **Client prospect**: may be a fit for a client conversation based on allowed CSV fields and notes.
- **Nurture**: keep in long-term follow-up because timing, fit, or evidence is not strong enough yet.
- **Manual review**: not enough reliable information or there are compliance/sensitivity concerns.
- **Do not contact**: opt-out, do-not-contact, bad data, or other compliance reason.
- **Captive agent**: appears to be tied to a captive insurance company; use only professional evidence, not protected traits.
- **Non-captive independent**: appears to work independently or with non-captive insurance/financial services; use only professional evidence.
- **Unknown**: the system does not have enough evidence to classify.

The AI assessment must never hide behind a score alone. Every score or category must have a concise evidence summary and confidence level.

## Non-negotiable rules

1. Do not infer gender from name, profile photo, or AI guess.
2. Gender can come only from the CSV, a manual user edit, or an explicit self-stated user note.
3. Gender is stored only for chart organization. It is never used in qualification scoring.
4. Gender, marital status, age, religion, race, ethnicity, disability, pregnancy, and similar protected or sensitive traits must not be used in partner, educator, client, or priority scoring.
5. Do not scrape LinkedIn with bots, browser automation, fake accounts, session cookies, or logged-in scraping.
6. LinkedIn support means one of these safe modes:
   - use a LinkedIn URL if the user uploaded it in the CSV
   - generate a LinkedIn search URL for manual review
   - use an official or permissioned API if the user has approved access
   - use an approved web search provider or OpenAI web search, returning public snippets and source URLs only
7. This is an internal research assistant, not an automated messaging system.
8. Do not auto-send texts, emails, DMs, or LinkedIn messages.
9. Use Row Level Security and private Supabase Storage.
10. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` in frontend code.
11. Store evidence URLs, confidence, and manual review flags for any AI-generated assessment.

## Architecture

Use Supabase tables from the backend pack:

- `contact_imports`
- `contact_import_column_mappings`
- `contact_records`
- `contact_social_profiles`
- `contact_enrichment_sources`
- `contact_ai_assessments`
- `contact_jobs`
- `contact_job_events`
- `contact_exports`
- `contact_audit_log`

Use private Supabase Storage buckets:

- `contact_imports`
- `contact_exports`

Use Supabase Edge Functions:

- `contacts_create_import`
- `contacts_create_upload_url`
- `contacts_submit_csv`
- `contacts_worker`
- `contacts_get_import`
- `contacts_research_batch`
- `contacts_export_csv`
- `contacts_update_contact`

Keep shared backend helpers under `supabase/functions/_shared/`, merging with existing shared helpers instead of deleting or replacing Dream Life Builder helpers.

## Build sequence

### Phase 1: Apply backend schema

1. Add the Contact Intelligence migration from the pack under `supabase/migrations/`.
2. Verify it does not conflict with existing PulseNow migrations.
3. Preserve current Dream Life Builder, quiz, auth, contacts, coach, and power-list tables/functions.
4. Confirm RLS scopes each import and contact row to the authenticated user or their allowed organization model, matching existing PulseNow auth conventions.

### Phase 2: Add Edge Functions

1. Add the Contact Intelligence Edge Functions from the pack under `supabase/functions/`.
2. Merge shared helpers carefully under `supabase/functions/_shared/`.
3. Reuse existing CORS/auth/admin helper patterns when they already exist in PulseNow.
4. Ensure every function requires a Supabase Auth JWT unless it is explicitly a worker/cron function protected by a secret.
5. Ensure service-role usage remains server-side only.

### Phase 3: CSV upload and parsing

Implement:

1. Create import record.
2. Create signed upload URL.
3. Upload CSV to private storage from frontend.
4. Submit CSV for parsing.
5. Parse CSV server-side.
6. Auto-detect column mappings.
7. Normalize fields.
8. Insert `contact_records`.
9. Create AI assessment jobs.

Supported CSV columns should include loose variations:

- `name`, `full_name`, `first_name`, `last_name`
- `phone`, `mobile`, `cell`, `number`
- `email`, `email_address`
- `type`, `contact_type`, `lead_type`
- `followup`, `follow_up`, `follow_up_date`, `next_follow_up`
- `married`, `spouse`, `relationship_status`
- `homeowner`, `owns_home`, `mortgage`
- `city`, `state`, `zip`
- `company`, `employer`, `occupation`, `title`, `job_title`
- `linkedin`, `linkedin_url`
- `facebook`, `instagram`, `website`
- `gender`, `sex`, `man_woman`
- `notes`

### Phase 4: PulseNow frontend integration

Integrate into the existing Vite app without redesigning the product shell.

Use these locations:

- API helper: `source/src/lib/contactIntelligenceApi.ts`
- Hook: `source/src/hooks/useContactImport.ts`
- Screen: `source/src/screens/ContactIntelligence.tsx` or integrate into the existing Contacts area if present
- Navigation entry: update the existing PulseNow nav only as needed
- Styling: reuse `source/src/index.css`, `source/src/styles/pulsenow.tokens.css`, and existing UI components in `source/src/components/ui/`

Do not add a standalone marketing page. The first screen should be the usable upload/chart/table workflow.

The screen should include:

- Import title area
- CSV file picker
- Create import/upload button
- Upload progress and status
- Clear **Potential Prospects From This CSV** section
- Named prospect list showing every parsed contact
- Research socials + LinkedIn button
- Download organized CSV button
- Stats cards
- Charts or grouped counts
- Category definition/helper area
- Filterable table
- Manual edit support, either drawer or inline edit

The table should include:

- Name
- Prospect status
- Phone
- Email
- Gender label
- City/state
- Company/title
- Captive status
- Candidate type
- Partner score
- Educator score
- Client prospect score
- Priority tier
- Why this category
- Next action
- Follow-up date
- Research status
- Evidence summary
- Confidence
- Missing info
- Source links
- Manual review flag

### Phase 5: AI assessment

For each row, run an AI assessment that uses:

- normalized CSV data
- user-provided notes
- allowed public source snippets if already researched
- configurable scoring rules

Use OpenAI Structured Outputs where possible. The model output must match the schema in `_shared/aiSchemas.ts`.

The AI assessment should classify:

- `captive_status`: `captive_agent`, `non_captive_independent`, `not_insurance`, `unknown`
- `candidate_type`: `life_insurance_partner`, `financial_educator`, `referral_partner`, `client_prospect`, `nurture`, `not_a_fit`, `manual_review`
- `priority_tier`: `A`, `B`, `C`, `NURTURE`, `DO_NOT_CONTACT`, `MANUAL_REVIEW`
- scores from 0 to 100
- next best action
- suggested message angle
- evidence summary
- missing data
- compliance flags

Use a low temperature and produce concise, audit-friendly JSON.

### Phase 6: Research socials + LinkedIn

When the user clicks **Research socials + LinkedIn**:

1. Create a `research_contacts` job.
2. For selected contacts, generate public search queries.
3. Run a permitted web search provider or OpenAI web search if enabled.
4. Store source URLs and snippets in `contact_enrichment_sources`.
5. Store social profile links in `contact_social_profiles`.
6. Re-run AI assessment with evidence.

Do not scrape LinkedIn profile pages. Store only URLs and search snippets unless the user provided profile content manually or the app has permissioned API access.

### Phase 7: Export organized CSV

Export a clean CSV with all normalized and assessed columns. Upload it to the `contact_exports` bucket and return a signed download URL.

## Acceptance criteria

A successful build means:

1. `git status --short` was checked before edits.
2. `npm run build` passed before edits or any pre-existing failure was reported.
3. A logged-in user can upload a CSV.
4. Raw CSV is stored in private Supabase Storage.
5. Rows appear in Supabase.
6. Contacts are normalized.
7. Charts/table populate from stored data and clearly list every imported contact by name.
8. AI assessment writes rows to `contact_ai_assessments`.
9. User can research selected rows without LinkedIn scraping.
10. User can export organized CSV.
11. RLS prevents users from seeing other users' imports.
12. Frontend never receives service-role credentials.
13. Manual review and compliance flags are visible.
14. Category definitions explain what each segment means in plain language.
15. Every category/score has a concise evidence summary, confidence level, and suggested next human-reviewed action.
16. Existing PulseNow UI, nav, auth, Dream Life Builder, quiz, coach, and current backend routes still build.

## Verification

Run at minimum:

```bash
npm run build
```

If TypeScript checking is relevant to the touched files, also run:

```bash
npm run typecheck
```

If a dev server is started, verify the relevant screen in the browser at the local preview URL and check the browser console for errors.
