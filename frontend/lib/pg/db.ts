/**
 * Connexion PostgreSQL / TimescaleDB.
 * Pool unique partagé + cache du schéma (colonnes par table) pour que le shim
 * sache distinguer les vraies colonnes des champs à router vers `data jsonb`.
 */
import pg from "pg"

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://wwembed:wwembed@timescale:5432/wwembed"

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined
  // eslint-disable-next-line no-var
  var __pgColumns: Map<string, Set<string>> | undefined
}

export function getPool(): pg.Pool {
  if (!global.__pgPool) {
    global.__pgPool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
    global.__pgPool.on("error", (err) => console.error("[pg] pool error:", err.message))
  }
  return global.__pgPool
}

/**
 * Retourne l'ensemble des noms de colonnes d'une table (mis en cache).
 * Sert au shim pour décider colonne réelle vs champ jsonb `data`.
 */
export async function getTableColumns(table: string): Promise<Set<string>> {
  if (!global.__pgColumns) global.__pgColumns = new Map()
  const cached = global.__pgColumns.get(table)
  if (cached) return cached

  const pool = getPool()
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  )
  if (r.rows.length === 0) throw new Error(`table not found: ${table}`)
  const cols = new Set<string>(r.rows.map((x) => x.column_name))
  global.__pgColumns.set(table, cols)
  return cols
}

/** Vide le cache des colonnes (utile en dev après une migration de schéma). */
export function clearColumnCache() {
  global.__pgColumns?.clear()
}
