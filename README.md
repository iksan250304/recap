# BuildNote
Next.js 15 + Tailwind 4 + Supabase (Auth, Postgres, Storage) + Claude Vision OCR.

## Setup
1. Buat project Supabase → SQL Editor → jalankan `supabase/schema.sql`.
2. `cp .env.example .env.local` lalu isi URL, anon key, dan `ANTHROPIC_API_KEY`.
3. `npm install && npm run dev` → http://localhost:3000
4. Deploy: Vercel, set 4 env var yang sama.
