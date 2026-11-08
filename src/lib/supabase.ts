import { createClient } from "@supabase/supabase-js";

const isBrowser = typeof window !== "undefined";

// Reads from Vite environment variables or uses standard placeholders
const supabaseUrl =
  (import.meta.env["VITE_SUPABASE_URL"] as string) ||
  "https://xyzcompany.supabase.co";

const supabaseAnonKey =
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key";

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes("your-project") &&
  !supabaseUrl.includes("xyzcompany") &&
  Boolean(supabaseAnonKey) &&
  !supabaseAnonKey.includes("your-supabase");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
    storage: isBrowser && typeof window.localStorage !== "undefined" ? window.localStorage : undefined,
  },
});

/**
 * Trigger Supabase OAuth sign-in with Google.
 * If Supabase project credentials are configured, opens official Google sign-in.
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    console.warn(
      "[Supabase] Project credentials not set in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)."
    );
  }

  // Clear previous Supabase session so user can pick a different account instantly
  if (isBrowser) {
    await supabase.auth.signOut().catch(() => {});
  }

  const redirectUrl = isBrowser ? `${window.location.origin}/login` : "/login";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }

  // Ensure immediate browser redirection to Google auth page
  if (data?.url && isBrowser) {
    window.location.assign(data.url);
  }

  return data;
}
