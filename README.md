# GOTHYXAN

Premium AI-powered branded outfit intelligence platform.

## 1. High-Level Architecture Overview
- `backend` (`NestJS + Prisma + PostgreSQL`) is the system core:
  - Auth (email verification code, JWT, refresh, reset password)
  - RBAC (USER/ADMIN)
  - AI outfit pipeline (layered architecture)
  - Outfit logs + saved outfits
  - Admin APIs
  - WebSocket streaming namespace (`/outfits`)
- `web` (`Next.js + TypeScript + Tailwind + Framer Motion + Zustand`) is the main SaaS client:
  - Auth flows
  - Chat-style outfit generation
  - Admin panel views
- `mobile` (`Expo React Native + TypeScript`) is the iOS/Android chat client:
  - Auth flows
  - Chat generation
  - Saved outfits
  - Admin analytics tab (for ADMIN role)
- `telegram-bot` (`Python + aiogram`) integrates with backend API:
  - Telegram login via backend endpoint
  - Outfit generation
  - Inline controls: `cheaper`, `more expensive`, `regenerate`, `save outfit`
- Infra:
  - Docker + Docker Compose
  - GitHub Actions CI
  - Deploy workflow examples

## 2. Text-Based Architecture Diagram
```text
                       +--------------------+
                       |   OpenWeather API  |
                       +---------+----------+
                                 |
                                 v
+------------------+      +------+------------------+      +------------------+
| Next.js Web App  +----->+ NestJS Backend API      +<-----+ Telegram Bot      |
| Auth/Chat/Admin  | REST | /api/* + /outfits WS    | REST | aiogram           |
+--------+---------+      +------+------------------+      +------------------+
         |                       |
         |                       v
         |                +------+------------------+
         |                | Prisma + PostgreSQL     |
         |                | Users/Brands/Logs/Auth  |
         |                +------+------------------+
         |                       |
         v                       v
+--------+---------+      +------+------------------+
| Expo Mobile App  |      | Redis (cache-ready)     |
| Auth/Chat/Saved  |      | infra utility service   |
+------------------+      +-------------------------+
```

## 3. Full Folder Structure
```text
GOTHYXAN/
  .github/
    workflows/
      ci.yml
      deploy-example.yml
  backend/
    prisma/
      schema.prisma
      seed.ts
    src/
      admin/
      ai/
      auth/
      bootstrap/
      brands/
      common/
      config/
      database/
      health/
      mail/
      outfits/
      users/
      weather/
      app.module.ts
      main.ts
    Dockerfile
    package.json
    .env.example
  web/
    src/
      app/
        admin/page.tsx
        auth/page.tsx
        dashboard/page.tsx
        layout.tsx
        page.tsx
        globals.css
      components/
        admin/
        auth/
        chat/
        ui/
      lib/
      store/
    Dockerfile
    package.json
    .env.example
  mobile/
    src/
      components/
      lib/
      store/
      theme/
      types/
    App.tsx
    package.json
    .env.example
  telegram-bot/
    bot.py
    api_client.py
    config.py
    state.py
    requirements.txt
    Dockerfile
    .env.example
  docker-compose.yml
  package.json
  .env.example
```

## 4. Database Schema (Prisma)
Schema file: `backend/prisma/schema.prisma`

Main entities:
- `User` (`role`, `isEmailVerified`)
- `EmailVerificationCode` (6-digit code hash, expiry, attempts)
- `PasswordResetCode` (6-digit code hash, expiry, attempts)
- `RefreshToken` (hashed refresh token + revoke support)
- `Brand` (tiered branded catalog)
- `BrandItem` (strict branded clothing items)
- `ExternalCatalogItem` (local END product cards: title, image, link, price)
- `FeaturedStyle`
- `OutfitGenerationLog`
- `SavedOutfit`

Enums:
- `Role`: `USER`, `ADMIN`
- `BudgetMode`: `CHEAPER`, `PREMIUM`, `CUSTOM`
- `OutfitChannel`: `WEB`, `MOBILE`, `TELEGRAM`

## 5. Authentication Implementation
Implemented in `backend/src/auth/*`:
- Register:
  - `POST /api/auth/register`
  - Stores hashed password (`bcrypt`)
  - Sends 6-digit verification code via `MailService`
- Email verification:
  - `POST /api/auth/verify-email`
  - Code expires in 10 minutes
  - Max 5 attempts
  - Code stored hashed
- Login:
  - `POST /api/auth/login`
  - Returns `accessToken` + `refreshToken`
- Refresh:
  - `POST /api/auth/refresh`
- Logout:
  - `POST /api/auth/logout`
- Password reset:
  - `POST /api/auth/password/request-reset`
  - `POST /api/auth/password/reset`
- Telegram login:
  - `POST /api/auth/telegram/login`

## 6. Role-Based Access System (RBAC)
- Global JWT guard: `JwtAuthGuard`
- Role guard: `RolesGuard`
- Role decorator: `@Roles(Role.ADMIN)`
- Admin routes are restricted to `ADMIN` role only.
- Admin account is ensured from env vars at startup:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`

## 7. AI Service Layer
Implemented in `backend/src/ai/*` with explicit layers:
1. `InputAnalyzerService`
2. `ContextBuilderService`
3. `StyleClassifierService`
4. `BudgetEngineService`
5. `BrandSelectorService`
6. `WeatherAdapterService`
7. `OutfitComposerService`
8. `ValidationLayerService`
9. `ResponseFormatterService`

Additional modules:
- `PromptBuilderService`
- Fallback regeneration logic
- In-memory caching (`OutfitCacheService`)
- Strict branded-only selection from DB
- Product card resolver with local END catalog priority (image + product link)
- Strict budget output: result is returned only when `total_price` is inside requested range

Output schema includes:
- `top`, `bottom`, `shoes`, `outerwear`, `accessories`, `total_price`, `style`, `weather_context`, `budget_range`, `explanation`

## 8. API Routes
Public:
- `GET /api/health`
- `GET /api/brands`
- `GET /api/brands/featured-styles`
- `GET /api/brands/items`
- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/password/request-reset`
- `POST /api/auth/password/reset`
- `POST /api/auth/telegram/login`

Authenticated:
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/outfits/generate`
- `GET /api/outfits/history`
- `POST /api/outfits/save`
- `GET /api/outfits/saved`

Admin (`ADMIN`):
- `GET /api/admin/analytics`
- `GET /api/admin/logs`
- `GET /api/admin/system-health`
- `GET /api/admin/brands`
- `POST /api/admin/brands`
- `PATCH /api/admin/brands/:id`
- `DELETE /api/admin/brands/:id`
- `POST /api/admin/brands/:id/items`
- `PATCH /api/admin/brand-items/:itemId`
- `DELETE /api/admin/brand-items/:itemId`
- `GET /api/admin/featured-styles`
- `POST /api/admin/featured-styles`
- `PATCH /api/admin/featured-styles/:id`
- `DELETE /api/admin/featured-styles/:id`

WebSocket:
- Namespace: `/outfits`
- Event: `generate` -> returns pipeline status + result

## 9. Web Frontend
Stack:
- Next.js App Router
- TypeScript
- TailwindCSS
- Framer Motion
- Zustand
- ShadCN-style component layer (`web/src/components/ui/*`)

Pages:
- `/` Landing
- `/auth` Login/Register/Verify/Reset
- `/dashboard` Chat-style outfit generation
- `/admin` Admin dashboard (role-aware)

Features:
- Token/session persistence
- API integration with backend
- Strict JSON outfit visualization
- Outfit save action

## 10. Mobile App
Stack:
- Expo React Native
- TypeScript
- Zustand
- Secure token storage (`expo-secure-store`)

Features:
- Auth flows (login/register/verify/reset)
- Chat-based outfit generation
- Saved outfits
- Admin analytics tab
- Dark/Light/System theme toggle

## 11. Telegram Bot (Python)
Stack:
- `aiogram` async bot
- `aiohttp` backend API client
- `python-dotenv` config

Commands:
- `/start`
- `/setstyle <style>`
- `/setoccasion <occasion>`
- `/setcity <city>`
- `/budget cheaper|premium|custom <min> <max>`
- `/generate`
- `/state`

Inline keyboard after generation:
- `cheaper`
- `more expensive`
- `regenerate`
- `save outfit`

## 12. Admin Panel
Implemented in two clients:
- Web: `/admin`
- Mobile: Admin tab (ADMIN users)

Admin capabilities via backend:
- Manage brands and brand tiers
- Manage brand items
- Manage featured styles
- View generation logs
- View analytics
- View system health

## 13. Docker Setup
Files:
- `backend/Dockerfile`
- `web/Dockerfile`
- `telegram-bot/Dockerfile`
- `docker-compose.yml`

Services in compose:
- `postgres`
- `redis`
- `backend`
- `web`
- `telegram-bot`

Run:
```bash
docker compose up --build
```

## 14. CI/CD
CI:
- `.github/workflows/ci.yml`
  - Node install
  - Prisma generate
  - Backend build
  - Web build
  - Mobile TypeScript build
  - Telegram bot syntax validation

Deploy example:
- `.github/workflows/deploy-example.yml`
  - Vercel/Railway skeleton workflow for adaptation with project secrets

## 15. Full Setup Instructions
### Prerequisites
- Node.js 20+
- npm 10+
- Python 3.11+
- PostgreSQL 15+ (or Docker)
- Optional: Docker Desktop

### 1) Install dependencies
```bash
npm install
```

### 2) Prepare environment
```bash
copy .env.example .env
copy backend/.env.example backend/.env
copy web/.env.example web/.env.local
copy mobile/.env.example mobile/.env
copy telegram-bot/.env.example telegram-bot/.env
```

Optional END link mode:
- `END_LINK_FALLBACK_MODE=auto` (default) - use END links when reachable, fallback to Google search when END returns `403`
- `END_LINK_FALLBACK_MODE=direct` - always return direct END links
- `END_LINK_FALLBACK_MODE=google` - always return Google search links
- `END_MATCH_RATIO=0` - probability of using END local card when a match exists (`0` = always local catalog fallback with guaranteed local images, `1` = always END)

### 3) Start database and redis (recommended)
```bash
docker compose up -d postgres redis
```

### 4) Prepare Prisma
```bash
npm --workspace backend run prisma:generate
cd backend
npx prisma db push
npm run prisma:seed
npm run catalog:build:local
cd ..
```

### 5) Run backend
```bash
npm --workspace backend run start:dev
```

### 5.1) Sync local END catalog (recommended)
```bash
npm --workspace backend run catalog:sync:end
```

If END blocks live requests with `403`, import local snapshot:
```bash
npm --workspace backend run catalog:import:end
```

Build huge local catalog table (`name + image + price + link`) from branded DB:
```bash
npm --workspace backend run catalog:build:local
```

Export full local clothes pack as files inside project folder:
```bash
npm --workspace backend run catalog:export:pack
```
Output folder: `PACK_ALL_CLOTHES/`

### 6) Run web
```bash
npm --workspace web run dev
```
Open: `http://localhost:3000`

### 7) Run mobile
```bash
npm --workspace mobile run start
```

### 8) Run telegram bot
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r telegram-bot/requirements.txt
python telegram-bot/bot.py
```

### 9) Default admin account
From env:
- `ADMIN_EMAIL` (default `admin@gothyxan.app`)
- `ADMIN_PASSWORD` (default `ChangeMe123!`)

### 10) Production deployment suggestion
- Web: Vercel
- Backend + Postgres + Redis: Railway or AWS ECS/RDS/ElastiCache
- Telegram bot: Railway worker / Docker host / VPS service

## Elite AI System Upgrade

The outfit engine now includes:
- Structured fashion knowledge layer (brand metadata, color matrix, seasonal rules, layering constraints)
- Deterministic outfit validation (style consistency, budget guardrails, weather compatibility)
- Trend intelligence coefficient from rolling generation logs
- Adaptive personalization index from ratings/save/regenerate signals
- Monetization-aware candidate ranking (affiliate + margin + premium/luxury bias)
- Security hardening (CSRF middleware, abuse detection, strict CSP, optional HTTPS redirect, admin route secret)

Detailed architecture and formulas:
- `infra/ELITE_AI_SYSTEM_BLUEPRINT.md`

Nginx reverse proxy template:
- `infra/nginx/gothyxan.conf`

## New Outfit APIs

- `POST /api/outfits/regenerate`
- `POST /api/outfits/feedback`
