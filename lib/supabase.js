import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ujtayxzztugpvlovkkva.supabase.co'
const supabaseAnonKey = 'sb_publishable_i0QmQOJVJalUZNPglrXvdQ_dbuz1pWa'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
