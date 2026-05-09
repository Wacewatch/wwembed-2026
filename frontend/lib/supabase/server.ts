/**
 * Server-side client backed by MongoDB.
 * Unlike `admin.ts`, this client is auth-aware: `auth.getUser()` reads the
 * JWT cookie and returns the current user (so server pages like
 * /dashboard/page.tsx work the same way they did under Supabase).
 */
import { createMongoClient, MongoSupabaseClient } from "@/lib/mongo/shim"
import { getCurrentUser } from "@/lib/mongo/auth"

class AuthAwareClient extends MongoSupabaseClient {
  auth = {
    getUser: async () => {
      const u = await getCurrentUser()
      return { data: { user: u ? { ...u, id: u.id } : null }, error: null }
    },
    getSession: async () => {
      const u = await getCurrentUser()
      return { data: { session: u ? { user: u } : null }, error: null }
    },
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: { message: "Use /api/auth/login" },
    }),
    signUp: async () => ({
      data: { user: null, session: null },
      error: { message: "Use /api/auth/register" },
    }),
    admin: { listUsers: async () => ({ data: { users: [] }, error: null }), deleteUser: async () => ({ data: null, error: null }) },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  }
}

export async function createClient() {
  const base = createMongoClient()
  const c = new AuthAwareClient()
  // expose .from / .rpc from base
  c.from = base.from.bind(base)
  c.rpc = base.rpc.bind(base)
  return c
}
