import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = `
    ❌ Supabase Configuration Error
    
    Missing required environment variables:
    ${!supabaseUrl ? '- VITE_SUPABASE_URL' : ''}
    ${!supabaseAnonKey ? '- VITE_SUPABASE_ANON_KEY' : ''}
    
    For local development: Create a .env file in the admin-panel directory
    For Netlify deployment: Add these variables in Site configuration → Environment variables
    `
    console.error(errorMsg)
    throw new Error('Missing Supabase configuration. Check console for details.')
}

console.log('✅ Supabase client initialized successfully')

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
