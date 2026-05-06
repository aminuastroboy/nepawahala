# Nepasub v2.1

Setup:
1. Copy .env.example to .env.local
2. Add your Supabase credentials
3. Run npm install
4. Run npm run dev

Supabase SQL:

create table checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  name text,
  area text,
  status text,
  created_at timestamp default now()
);