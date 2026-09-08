import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // localStorage keeps session alive across tabs and page refreshes (PWA requirement).
    // The anon key is public by design; RLS protects the data, not the key.
    storage: window.localStorage,
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
})

export type SupabaseClient = typeof supabase
