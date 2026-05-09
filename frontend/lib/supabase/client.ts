/**
 * Drop-in replacement: browser-side client backed by /api/db + /api/auth/*.
 * All existing UI code keeps using `createClient()` exactly as before.
 *
 * Returns the SAME instance across calls (singleton) — components like
 * ads-manager memoize useEffect on `[loadAds]` which depends on the client;
 * a new instance per render would loop.
 */
import { createBrowserClient as makeClient, BrowserSupabaseClient } from "@/lib/mongo/browser-shim"

let _instance: BrowserSupabaseClient | null = null

export function createClient(): BrowserSupabaseClient {
  if (!_instance) _instance = makeClient()
  return _instance
}
