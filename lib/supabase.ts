import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Prevent crash if env vars are not set (e.g. during initial setup)
const isConfigured = supabaseUrl && supabaseUrl !== 'your-project-url' && supabaseUrl.startsWith('http');

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey!)
    : createClient('https://setup-required.supabase.co', 'placeholder-key');

if (!isConfigured) {
    console.warn("⚠️  Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
}
