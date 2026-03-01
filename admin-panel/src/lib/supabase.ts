import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = 'https://wbbasbeqfbdbgmknlerr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiYmFzYmVxZmJkYmdta25sZXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTA4MDcsImV4cCI6MjA4NzU4NjgwN30.luSxTUQ4_oX8dsQoJkP6G507iYLhGWjSOwAJ61VKR-Q'

console.log('✅ Supabase client initialized - new project')

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
