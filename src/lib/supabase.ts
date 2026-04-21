import { createClient } from '@supabase/supabase-js';

// VITE_ prefix is required for Vite to expose these to the client-side code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for placeholder or missing values
const isValidConfig = supabaseUrl && 
                     supabaseUrl !== 'https://your-project.supabase.co' && 
                     supabaseUrl !== 'https://placeholder.supabase.co';

if (!isValidConfig) {
  console.error(
    'Supabase configuration is missing or invalid. \n' +
    'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your project secrets.\n' +
    'You can find these in your Supabase Dashboard under Settings > API.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
