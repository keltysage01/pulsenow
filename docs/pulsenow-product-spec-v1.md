# Pulsenow Product Spec V1

Source: pasted from the Perplexity product specification on May 19, 2026.

## Product Overview

Pulsenow is a white-label SaaS product for direct sales teams. The first instance is Fuel Your Legacy for Sam Knickerbocker / WealthWave.

The product has two connected surfaces sharing one Supabase backend:

- Team App: mobile-first daily driver with social, gamified workflows.
- AI Assistant / CRM: contact management, pipeline, AI coaching, and campaign engine.

Tagline: "Know who to call. Right now."

## Stack

- Frontend: React, Vite, PWA
- Backend: Supabase
- Hosting: Vercel
- Push: OneSignal
- AI: Claude API
- Email: Resend
- Sharing: Web Share API
- Domains: pulsenow.com, getpulsenow.com, app.fuelyourlegacy.com

## Fuel Your Legacy Branding

- Primary black: `#000000`
- Primary white: `#FFFFFF`
- Primary green: `#38B249`
- Secondary light: `#E9EEE9`
- Secondary blue: `#3860AF`

The app shows Fuel Your Legacy branding with small "Powered by Pulsenow" placement.

## White Label System

Each organization can configure branding, role titles, pipeline stages, pipeline substeps, career levels, activity fields, tier names, and weekly goal categories.

The onboarding wizard has six steps:

1. Organization basics
2. Role title definitions
3. Pipeline stage customization
4. Career levels and promotion requirements
5. Carrier/company training items
6. Domain configuration

## Core Data Model

Core tables named in the spec:

- `organizations`
- `users`
- `contacts`
- `contact_qualifiers`
- `pipeline_stages`
- `pipeline_substeps`
- `contact_journey`
- `substep_completions`
- `activity_logs`
- `leaderboard`
- `feed_posts`
- `feed_reactions`
- `feed_comments`
- `badges`
- `badge_awards`
- `competitions`
- `competition_entries`
- `notifications`
- `campaigns`
- `campaign_steps`
- `campaign_enrollments`
- `org_settings`
- `career_levels`
- `promotion_requirements`
- `vision_board_items`
- `vision_board_actions`
- `dream_milestones`
- `weekly_goals`

## Contact Qualifiers

Qualifier answers should support tri-state capture: yes, no, and unknown.

The seven qualifiers:

1. Married / has a spouse
2. 25+ years old
3. Has children
4. Homeowner
5. $40K+ income
6. Entrepreneurial mindset
7. Dissatisfied with current situation

## Sales Pipeline

The sales pipeline has 12 stages:

1. Uncontacted Team Prospects
2. Prospect Set With A 1st Presentation
3. FNA
4. Application Signed
5. Needs In Business Processing
6. Approved - Delivery Needed
7. Approved - Delivery Completed, No Commission
8. Commission Paid/Complete
9. Completed and In Force
10. Not Ready Yet, Possible Business in the Future
11. No Response
12. Do Not Call

## Recruit Pipeline

The recruit pipeline has nine stages:

1. Prospect
2. Hesitant/Follow-Up
3. Pre-Passing the Test
4. Post Passing / Licensing
5. Company Set-Up
6. Company Trainings
7. License Coordinator Bonus Paid
8. Became a Net License
9. Suspect/No Response

Several recruit stages contain checklist substeps, including manager-action and licensing-coordinator-action flags.

## Activity Tracking

The WealthWave activity tracker should be carried over exactly where possible:

- Contact fields
- Appointment fields
- Events fields
- Recruit fields
- FNA fields
- Production fields
- Financial fields
- Daily yes/no toggles
- Tier system: No Timer, Some Timer, Part Timer, Full Timer, All-the-Timer

## Product Modules

Main modules from the spec:

- Gamification
- Team feed
- Vision board
- AI Power List
- AI Coach
- Contact import
- Calling/texting flow
- Manager/director dashboard
- Licensing coordinator view
- Campaigns
- Career track
- Social sharing

## Navigation

Bottom navigation:

1. Home
2. Log
3. Board
4. Pipeline
5. Me

Hamburger menu:

- Contacts
- AI Coach
- Campaigns
- History
- Contact Breakdown
- Settings
- Manager View
- Sign Out

## Key Decisions

- Build a brand-new codebase.
- Keep the existing tracker live until Pulsenow is ready.
- Use a new Supabase project.
- Keep the WealthWave tier system exactly.
- Agents use their own phone number for calls and texts.
- Vision board actions are both automatic and manual.
- Licensing coordinator primarily manages pipeline; directors see downline.
- Use generic code terminology for white-label flexibility.
- Build as SaaS for multiple industries.
- React Native conversion comes after PWA validation.
- Do not build in-app team chat; use AI Coach as the center mobile tab.
- Use Resend for email.
- Keep SMS compliance-first and opt-in only.
