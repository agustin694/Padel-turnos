import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = 'https://ujtayxzztugpvlovkkva.supabase.co'
const supabaseAnonKey = 'sb_publishable_iOQmQOJVJalUZNPglrXvdQ_dbuz1pWa'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
