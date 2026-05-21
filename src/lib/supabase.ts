import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iqylckwmmygqutycqmlb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeWxja3dtbXlncXV0eWNxbWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDY3MjQsImV4cCI6MjA3MDU4MjcyNH0.2eHnVJ9r6jl1x9-7C3k9vT8y5u1q0r2s3t4u5v6w7x8'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Edge Functions base URL
export const EDGE_FUNCTIONS_URL = `${supabaseUrl}/functions/v1`

// Helper for authenticated fetch
export async function fetchEdgeFunction(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  return fetch(`${EDGE_FUNCTIONS_URL}/${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  })
}
