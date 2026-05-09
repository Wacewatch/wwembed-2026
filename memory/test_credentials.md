# WWEmbed — Credentials de test

## Admin (créé manuellement, MongoDB)
- Email: `admin@wwembed.test`
- Password: `admin1234`
- Rôle: `admin`

## URLs
- Frontend: https://0151cd43-a485-4da9-bacc-1ea74d776ad1.preview.emergentagent.com/
- Backend proxy (FastAPI): https://0151cd43-a485-4da9-bacc-1ea74d776ad1.preview.emergentagent.com/api/health
- Login: /auth/login
- Sign up: /auth/sign-up
- Dashboard: /dashboard
- Admin: /admin

## API auth
- POST /api/auth/login   { email, password } → cookies + user JSON
- POST /api/auth/register { email, password, username }
- POST /api/auth/logout
- GET  /api/auth/me

## API embed (3rd-party iframe URLs — preserved 1:1 from old Supabase version)
- /api/v1/streaming/{wwId}
- /api/v1/download/{wwId}
- /api/v1/live/{wwId}
- /api/v1/ebook/{wwId}
- /api/v1/music/{wwId}
- /api/v1/digital/{wwId}
- /api/v1/links/{wwId}

## Notes
- Migration Supabase → MongoDB est PENDING (Supabase project en erreur 522 Cloudflare au moment de la session).
- Le script `/app/migration/migrate.ts` est prêt à être lancé via `cd /app/migration && yarn migrate` dès que Supabase répondra.
- Les utilisateurs migrés auront `needs_password_reset: true`. Ils doivent s'inscrire avec leur email Supabase pour réclamer leur compte (le register détecte le flag).
