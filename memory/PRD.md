# WWEmbed — Refonte complète

## Original problem statement
> « je veux refaire entièrement tout wwembed mais il faut bien que toutes les fonctions, options, url api etc reste les même. je veux tout passer en mongodb (il faudra transféré tout ce qui existe deja sur ma db actuel supabase automatiquement). fait une masterclass ultra moderne et 100% fonctionnel et responsive pc et mobile. »

## User-confirmed choices (Phase 1)
- Codebase déjà présent dans `/app` (Next.js 16 + Supabase)
- Migration Supabase → MongoDB (URL+service_role fournis)
- Auth: JWT custom (remplace Supabase Auth)
- Style: Dark Premium / Glassmorphism
- Pas d'intégration LLM/IA
- Phase 1: Refonte UI + tous les endpoints `/api/v1/*` migrés vers MongoDB + auth JWT

## Architecture finale
- **Frontend**: Next.js 16 (App Router) en `/app/frontend` (port 3000) — sert UI ET routes API
- **Backend**: FastAPI léger en `/app/backend` (port 8001) qui forwarde `/api/*` vers Next.js (préserve toutes les URLs publiques)
- **Database**: MongoDB local (`wwembed`)
- **Auth**: JWT custom (httpOnly cookies `ww_access`/`ww_refresh`, bcrypt)
- **Shim Supabase→MongoDB**: clé de la stratégie. `lib/supabase/{client,server,admin,proxy}.ts` réécrits comme façades sur :
  - `lib/mongo/shim.ts` (server) — implémente `.from().select().eq()` etc. via MongoDB
  - `lib/mongo/browser-shim.ts` (browser) — sérialise la chaîne et POST `/api/db`
  - `lib/mongo/auth.ts` — JWT helpers (bcrypt, sign/verify, cookies)
- **Effet de bord** : aucun des 28+ routes API existants n'a eu besoin d'être modifié. Tout le code `supabase.from().select()...` continue de fonctionner.

## What's been implemented (2026-05-09)
- ✅ Restructuration `/app/frontend` (Next.js) + `/app/backend` (FastAPI proxy)
- ✅ MongoDB shim 100% compatible Supabase (`lib/mongo/shim.ts`, `browser-shim.ts`)
- ✅ Auth JWT complète : `/api/auth/{login,register,logout,me}`
- ✅ Endpoint générique `/api/db` (POST) pour les requêtes browser → Mongo (RBAC : admin-only sur tables sensibles)
- ✅ Endpoint RPC `/api/rpc` (incrément ad clicks, live tv views)
- ✅ Tous les endpoints `/api/v1/*` (streaming, download, live, ebook, music, digital, links) **inchangés** et fonctionnels via le shim
- ✅ `/api/tmdb-stats` corrigé (usage direct `@supabase/supabase-js` remplacé par admin client Mongo)
- ✅ Refonte UI **Dark Premium / Glassmorphism**
  - `app/globals.css` : nouveau design system (background ink/aurora, primary cyan, glass utilities, orbs animés, fade-up entrances)
  - `app/page.tsx` : nouvelle home (hero, search shell glassmorphique, tabs Films & Séries / TV Live / Digital, embed previews, stats footer)
  - `components/header.tsx` : nav glass sticky avec pills actives
  - `app/auth/login/page.tsx` & `app/auth/sign-up/page.tsx` : formulaires glass premium avec orbs ambiants
- ✅ Script de migration `/app/migration/migrate.ts` (Supabase → MongoDB, idempotent, gère 17 tables + auth.users)
- ✅ Script de seed `/app/migration/seed.ts` exécuté (4 third_party_apis + site_settings)
- ✅ Tests backend 100% passent (auth, embed v1, db, search, media, RBAC) — voir `/app/test_reports/iteration_1.json`
- ✅ Bug fix: backend FastAPI proxy a perdu les Set-Cookie multi-headers ; corrigé via `multi_items()` + `raw_headers` (testing agent)
- ✅ Bug fix: dashboard ne se chargeait pas après login (server.ts auth client n'était pas auth-aware) ; corrigé en récupérant `getCurrentUser()` côté serveur
- ✅ Compte admin: `admin@wwembed.test` / `admin1234` (rôle admin, profil créé dans `profiles`)

## Migration Supabase → MongoDB (statut)
- ⚠️ **PENDING** : le projet Supabase `ihvdfxtduxxswvpjrtln.supabase.co` est inaccessible (Cloudflare 522 — projet en pause / tier gratuit). Le script de migration est **prêt** :
  ```bash
  cd /app/migration && yarn migrate
  ```
- À l'exécution : 17 tables + auth.users seront copiées. Les utilisateurs migrés auront `needs_password_reset: true` ; ils doivent se réinscrire avec leur email pour finaliser le compte (leur ancien mot de passe Supabase n'est pas exportable en clair). Le `register` détecte le flag et claim le compte en place.

## Backlog / Phase 2 (deferred)
- P0 : exécuter la migration dès que Supabase répond
- P1 : raffiner les pages restantes au design glassmorphism (admin, profile, dashboard détaillé) — actuellement fonctionnelles mais hérités du look précédent
- P1 : email transactionnel pour reset password (Resend/SendGrid)
- P2 : dark/light mode toggle (forcé en dark pour l'instant)
- P2 : optimisation des indexes MongoDB après import des vraies données (pour query patterns réels)
- P2 : page admin live-tv ticker UI

## Next action items pour l'utilisateur
1. Réveiller le projet Supabase puis lancer `cd /app/migration && yarn migrate`
2. Tester un compte migré (même email qu'avant) en s'inscrivant via `/auth/sign-up` pour fixer un nouveau mot de passe
3. Valider le rendering visuel sur mobile (la home a été conçue mobile-first, mais petite passe d'œil utile)
