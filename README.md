# UniNest — Kenyan Student Accommodation & Community Platform

**Find your space. Start your next chapter.**

## Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4 (`Plus Jakarta Sans`), React Router, Lucide Icons.
- **Backend**: Node.js + Express (`server.ts`) with `node:sqlite` relational persistence (`data/uninest.db`), scrypt password hashing, HttpOnly session cookies, binary magic-byte file upload validation (`uploads/`), and real-time Server-Sent Events (`/api/messaging/stream`).
- **Supabase Ready**: Complete PostgreSQL schema, Row Level Security (RLS) policies, and Storage bucket migrations are provided in `supabase/migrations/` alongside `src/lib/supabase.ts`.

## Running Locally
1. Copy `.env.example` to `.env` (optional for local SQLite mode; required if connecting Supabase).
2. Install dependencies: `npm install`
3. Start development server on port 3000: `npm run dev`
4. Build production frontend: `npm run build`
5. Start production server: `npm start`

## Seeded QA Accounts (Local Development)
- **Student**: `amina.student@uninest.ke` / `UniNest2026!`
- **Property Owner**: `kamau.owner@uninest.ke` / `UniNest2026!`
- **Resident Caretaker**: `brian.caretaker@uninest.ke` / `UniNest2026!` (explicitly assigned only to Acacia Heights & The Palm Residency)
- **Administrator**: `admin@uninest.ke` / `UniNestAdmin2026!`

## Legal & External Integration Notes
- **Host Terms & Community Standards**: Host application submission is safely blocked by default until an administrator supplies approved legal document text and version numbers under **Admin → Platform Settings**.
- **SMS / WhatsApp / Email**: Consent preferences are stored and auditable, while outbound delivery remains inactive until external provider credentials are configured.
