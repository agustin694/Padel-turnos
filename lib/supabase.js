import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = 'https://ujtayxzztugpvlovkkva.supabase.co'
const supabaseAnonKey = 'sb_publishable_i0QmQOJVJalUZNPglrXvdQ_dbuz1pWa'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
