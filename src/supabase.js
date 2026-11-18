import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

// False until .env points at the MTG project's Supabase database.
export const isConfigured = Boolean(url && key)

export const supabase = isConfigured ? createClient(url, key) : null
