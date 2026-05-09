/**
 * Drop-in replacement: server-side client backed by MongoDB.
 * In the previous Supabase setup this was the cookie-aware (RLS) client;
 * with our JWT cookie auth we simply expose the same fluent API.
 */
import { createMongoClient } from "@/lib/mongo/shim"

export async function createClient() {
  return createMongoClient()
}
