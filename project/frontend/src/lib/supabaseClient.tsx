import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihdcaetgilhfkcibbusq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGNhZXRnaWxoZmtjaWJidXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjQ2OTcsImV4cCI6MjA2NTk0MDY5N30.CUWVtTdqR72wSRgmnguijeKmBZicNxEmm3YtwMN7o0w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);