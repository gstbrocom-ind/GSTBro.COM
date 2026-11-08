# GSTBro — GST Services Platform

End-to-end GST services platform on free-tier infrastructure.

## Stack

| Layer | Service |
|-------|---------|
| Public site + client portal | Vercel (`gstbro.com`) |
| Admin dashboard | Vercel (`admin.gstbro.com`) |
| API | Render (Node.js / Fastify) |
| Database | Supabase (PostgreSQL) |
| Client documents | Google Drive |
| Media / favicon | Cloudinary |
| OTP email | Resend |

## Monorepo structure

```
├── apps/web/       # Public site + /dashboard client portal (indexed except dashboard)
├── apps/admin/     # Admin + team dashboard (noindex)
├── packages/ui/    # Shared Header, Footer, SocialLinks
├── server/         # Fastify API
└── supabase/       # SQL migrations
```

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

- Supabase URL + service role key
- JWT secret
- Resend API key
- Cloudinary credentials (optional for media)
- Google service account JSON (for Drive)

### 3. Run Supabase migration

Apply migrations in order in your Supabase SQL editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_password_auth.sql`

Create the first admin (set password via **Forgot password** on admin login):

```sql
INSERT INTO users (email, name, role, email_verified)
VALUES ('admin@gstbro.com', 'Admin', 'ADMIN', true);
```

Then open `admin.gstbro.com/login` → **Forgot password** → Resend sends OTP → set your password.

### Auth flows

| Flow | Steps |
|------|--------|
| **Client signup** | Name, business name, mobile, email, GSTIN (optional), state, address, password → Resend OTP → verify → login |
| **Login** | Email + password (clients, team, admin) |
| **Forgot password** | Email → Resend OTP → new password (works for clients, team, admin) |
| **Team member** | Admin creates with initial password; can reset via forgot password |

### 4. Google Drive setup

1. Create a Google Cloud project → enable Drive API
2. Create a service account → download JSON key
3. Share your root Drive folder with the service account email as Editor
4. Set `GOOGLE_SERVICE_ACCOUNT_JSON` on Render (full JSON string)

### 5. Run locally

```bash
npm run dev:api    # API on :3001
npm run dev:web    # Web on :5173
npm run dev:admin  # Admin on :5174
```

## Deploy

### Render (API)

Connect repo → use `render.yaml` blueprint or set:
- Build: `npm install && npm run build -w @gst/server`
- Start: `npm run start -w @gst/server`

### Vercel (Web)

- Root directory: `apps/web`
- Env: `VITE_API_URL`, `VITE_SITE_URL=https://gstbro.com`
- Domain: `gstbro.com`

### Vercel (Admin)

- Root directory: `apps/admin`
- Env: `VITE_API_URL`
- Domain: `admin.gstbro.com`

## SEO

All public pages on `gstbro.com` are indexable with full meta tags, JSON-LD, and sitemap. `/dashboard/*` and `admin.gstbro.com` are noindex.

Admin can override per-page SEO and social links without redeploying.

## License

Private — GSTBro
