import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra ?? {}

const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    extra.EXPO_PUBLIC_SUPABASE_URL

const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    extra.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log('SUPABASE URL:', supabaseUrl)
console.log('SUPABASE KEY EXISTS:', !!supabaseAnonKey)
console.log('SUPABASE KEY LENGTH:', supabaseAnonKey?.length)

export const supabase = createClient(
    supabaseUrl as string,
    supabaseAnonKey as string,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    }
)
