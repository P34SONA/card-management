import { createClient } from '@supabase/supabase-js';

// VITE_ prefix is required for Vite to expose these to the client-side code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebzvwmsqnlkxatryfytg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVienZ3bXNxbmxreGF0cnlmeXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Njc3MDcsImV4cCI6MjA5MjI0MzcwN30.O5uNX5tNh4YeEdcBtQQBwXbNsOiSaCCjn43iRfzNgkI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
