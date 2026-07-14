# PulseNow

## Register

Product. This is app UI: an authenticated CRM tool where design serves the task.
The public landing page is the one brand surface; everything else is product.

## What it is

PulseNow is an AI-powered prospecting CRM for financial-education agents (WFG-style
teams). Agents import their raw contact lists; Contact Intelligence researches each
person against public web signals, scores them into four fit categories, and turns
the list into a working pipeline: who to call, why, and what to say.

## Users and context

Independent financial agents, mostly non-technical, working from their phones
between meetings. Mobile is the primary context; desktop is secondary. The core
loop: check Today (call list, alerts, pipeline snapshot), work contacts, move
pipeline stages, log activity.

## Primary surfaces

- Today: greeting, pipeline snapshot, AI call list, notifications, clients health
- People: CSV/vCard import, manual add, contact list, Contact Intelligence results
- Pipeline: stage columns (sales and recruit), drag or dropdown stage moves
- Progress / Me: activity points, badges, leaderboard, WFG team data hub
- Coach and Dream Life: guided motivational features

## Visual direction (owner-set, July 2026)

Apple/iOS-native feel: system font stack (SF Pro), calm surfaces, standard
affordances, generous touch targets, nothing over-decorated. Light and dark themes
both first-class (Dark toggle sets html[data-theme="dark"]). Type must be legible
in both themes and never clip or break mid-word. Desktop shows the same app at a
calmer type scale (added July 2026), not a separate layout.

Brand accents: PulseNow teal/blue gradient family already present in the logo and
buttons. Keep the existing palette; do not re-theme.

## Anti-references

- No demo/sample data anywhere (retired July 2026); the app shows real data only
- No oversized display typography on desktop
- No decorative motion; loaders and state changes only

## Accessibility floor

Body text at 4.5:1 contrast minimum in both themes, touch targets 44px, reduced
motion respected.

## Constraints that shape design work

- Production is a single static shell (index.html, ~740KB) plus Vercel API routes;
  there is no component framework. Edits are surgical CSS/JS appended late in the
  cascade; the shell contains broad !important rules, so new component styling
  must be scoped to component ids.
- Vercel Hobby caps the project at 12 API functions; computed backend logic lives
  in Supabase (Postgres views/functions), which the client reads directly.
