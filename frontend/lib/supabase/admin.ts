/**
 * Drop-in replacement: server-side admin client backed by MongoDB.
 * All `from(...).select().eq()...` calls keep working unchanged.
 */
import { createMongoClient } from "@/lib/mongo/shim"

export function createAdminClient() {
  return createMongoClient()
}
