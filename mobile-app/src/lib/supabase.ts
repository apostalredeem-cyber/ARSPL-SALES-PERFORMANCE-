import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    'https://wbbasbeqfbdbgmknlerr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiYmFzYmVxZmJkYmdta25sZXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTA4MDcsImV4cCI6MjA4NzU4NjgwN30.luSxTUQ4_oX8dsQoJkP6G507iYLhGWjSOwAJ61VKR-Q',
    {
        auth: {
            storage: AsyncStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
        },
    }
)
