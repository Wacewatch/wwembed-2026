# WWEmbed — Credentials de test

## Admin (recréé après migration partielle MongoDB)
- Email: `admin@wwembed.test`
- Password: `admin1234`
- Rôle: `admin`

## Test user (créé pour validation Resend testing mode)
- Email: `wavewatchcontact@gmail.com` (= compte propriétaire de l'API key Resend)
- Password initial: `temp1234` (peut être réinitialisé via /auth/forgot-password)
- Rôle: `member`

## URLs
- Frontend: https://online-users-debug.preview.emergentagent.com/
- Backend proxy (FastAPI): https://online-users-debug.preview.emergentagent.com/api/health
- Login: /auth/login
- Sign up: /auth/sign-up
- Mot de passe oublié: /auth/forgot-password
- Reset password (via lien email): /auth/reset-password?token=...
- Dashboard: /dashboard
- Admin: /admin
- API Docs (Swagger): /docs

## API auth
- POST /api/auth/login   { email, password } → cookies + user JSON
- POST /api/auth/register { email, password, username }
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/forgot-password { email } → toujours { ok: true } (anti-énumération)
- POST /api/auth/reset-password { token, password } → user + auto-login

## API embed (3rd-party iframe URLs — preserved 1:1 from old Supabase version)
- /api/v1/streaming/{wwId}
- /api/v1/download/{wwId}
- /api/v1/live/{wwId}
- /api/v1/ebook/{wwId}
- /api/v1/music/{wwId}
- /api/v1/digital/{wwId}
- /api/v1/links/{wwId}

## API meta
- GET /api/openapi → spec OpenAPI 3.1 (consommée par /docs)

## Resend
- API key: configurée dans `/app/frontend/.env` → `RESEND_API_KEY`
- Sender actuel: `onboarding@resend.dev` (testing — délivre uniquement à `wavewatchcontact@gmail.com`)
- Domain à vérifier en prod: `wwembed.wavewatch.top` (https://resend.com/domains)

## Notes
- Migration Supabase → MongoDB en cours (embed_views > 1.8M rows, le reste suit après).
- Les utilisateurs Supabase migrés auront `needs_password_reset: true` et peuvent maintenant cliquer "Mot de passe oublié ?" sur la page de login.
