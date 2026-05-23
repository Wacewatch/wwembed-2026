/**
 * Client Redis partagé (singleton global).
 *
 * Même approche que lib/pg/db.ts et lib/mongo/db.ts : une seule connexion
 * réutilisée à travers les rechargements de modules du runtime Next.js, pour
 * éviter de multiplier les connexions Redis (les routes admin/live et
 * admin/stats créent chacune leur propre `new Redis(...)` ; ce module permet
 * de converger vers une instance unique si on veut les refactorer plus tard).
 *
 * Le pattern d'URL est identique à l'existant : REDIS_URL || redis://redis:6379
 */
import Redis from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379"

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined
}

export function getRedis(): Redis {
  if (!global.__redisClient) {
    global.__redisClient = new Redis(REDIS_URL, {
      // Tolérant aux indispos transitoires : on ne veut jamais qu'un miss de
      // cache fasse planter une route. Les helpers ci-dessous avalent déjà les
      // erreurs, mais ces options évitent les rejets non gérés au boot.
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    })
    global.__redisClient.on("error", (err) =>
      console.error("[redis] client error:", err?.message)
    )
  }
  return global.__redisClient
}
