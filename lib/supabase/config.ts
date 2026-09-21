// Public browser configuration. These values are intentionally publishable and
// remain protected by Supabase Auth and Row Level Security. Never place the
// service-role key in this file.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bburllvwjidqrihulwri.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_2S3EH8Jg566_ZSbY4Gr33Q_S-PzDi9Q";
