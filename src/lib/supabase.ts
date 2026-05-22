import { createClient } from '@supabase/supabase-js'

// Read from environment variables (set in Vercel dashboard or .env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[Supabase] Missing environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')

/** Storage bucket name for Corolas | Platonic assets */
export const STORAGE_BUCKET = 'platonic-assets'

/**
 * Get a public URL for a file stored in the Corolas | Platonic storage bucket.
 * @param path - The file path within the bucket (e.g. 'avatars/user1.png')
 * @returns Full public URL to the file
 */
export function getStorageUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
}

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
