import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    'https://xvzmduojhxkpigdbayqp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2em1kdW9qaHhrcGlnZGJheXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjIzNDAsImV4cCI6MjA4NTg5ODM0MH0.8wnqjo7XbDQT5dzk24HNvIX0mTuCN3zKer82Yy2UqOI',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
        },
    }
)


