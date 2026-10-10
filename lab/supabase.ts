import { createClient } from '@supabase/supabase-js';

// ينظّف القيمة من علامات الاقتباس والمسافات والـ / في آخر الرابط
const clean = (v?: string) => (v ?? '').replace(/["'\s]/g, '').replace(/\/+$/, '');

export const supabase = createClient(
  clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);