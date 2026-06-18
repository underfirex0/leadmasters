# LeadMaster — B2B Revenue Intelligence Platform

Morocco's B2B prospecting platform. 662 verified Moroccan companies, built-in CRM, MeetMaster executive meeting marketplace.

## Tech Stack
- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tailwind CSS** + custom design system
- **GSAP** + **React Three Fiber** (landing page)
- **Lucide React** icons
- **TypeScript**

## Deploy to Vercel in 3 steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "feat: LeadMaster landing page + full SaaS rebuild"
git remote add origin https://github.com/YOUR_USERNAME/leadmaster.git
git push -u origin main
```

### 2. Import in Vercel
Go to [vercel.com/new](https://vercel.com/new) → Import your GitHub repo → Next.js will be auto-detected.

### 3. Add Environment Variables in Vercel Dashboard
```
NEXT_PUBLIC_SUPABASE_URL        = your existing Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   = your existing anon key
SUPABASE_SERVICE_ROLE_KEY       = your existing service role key
NEXT_PUBLIC_APP_URL             = https://your-app.vercel.app
```

That's it. Same Supabase database, zero migration needed.

## Local Development
```bash
cp .env.example .env.local
# fill in your Supabase values
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture
```
src/
  app/
    page.tsx              ← Landing page (GSAP + R3F)
    (app)/                ← Authenticated app routes
      dashboard/
      search/
      results/
      crm/
      wallet/
      account/
      meetmaster/
    (admin)/              ← Admin panel (is_admin gate)
    api/                  ← All API routes
  components/
    landing/
      HeroCanvas.tsx      ← R3F particle field
    Navbar.tsx
    Toast.tsx
  lib/
    supabase/             ← Client + server + admin clients
    constants.ts
    utils.ts
```
