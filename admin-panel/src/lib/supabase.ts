import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = 'https://xvzmduojhxkpigdbayqp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2em1kdW9qaHhrcGlnZGJheXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjIzNDAsImV4cCI6MjA4NTg5ODM0MH0.8wnqjo7XbDQT5dzk24HNvIX0mTuCN3zKer82Yy2UqOI'

console.log('✅ Supabase client initialized successfully')

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
