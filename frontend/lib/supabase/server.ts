/**
 * Server-side client backed by PostgreSQL/TimescaleDB.
 * Auth-aware: `auth.getUser()` reads the JWT cookie and returns the current user
 * (so server pages like /dashboard/page.tsx work the same as under Supabase/Mongo).
 */
import { createPgClient, PgSupabaseClient } from "@/lib/pg/shim"
import { getCurrentUser } from "@/lib/pg/auth"

class AuthAwareClient extends PgSupabaseClient {
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
  const base = createPgClient()
  const c = new AuthAwareClient()
  c.from = base.from.bind(base)
  c.rpc = base.rpc.bind(base)
  return c
}
