import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://kvhmecsxguvkeaklckfw.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aG1lY3N4Z3V2a2Vha2xja2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODMzNTksImV4cCI6MjA3MDg1OTM1OX0.YVtQjS3k8QjuU0m6FRhWNvRjvNVAl2v2cYMQAL3KRTU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export { supabaseUrl, supabaseAnonKey };