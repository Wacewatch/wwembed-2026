/**
 * Drop-in replacement: server-side admin client backed by PostgreSQL/TimescaleDB.
 * All `from(...).select().eq()...` calls keep working unchanged via the pg shim.
 */
import { createPgClient } from "@/lib/pg/shim"

export function createAdminClient() {
  return createPgClient()
}
