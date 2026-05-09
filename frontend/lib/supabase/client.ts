/**
 * Drop-in replacement: browser-side client backed by /api/db + /api/auth/*.
 * All existing UI code keeps using `createClient()` exactly as before.
 */
import { createBrowserClient as makeClient } from "@/lib/mongo/browser-shim"

export function createClient() {
  return makeClient()
}
