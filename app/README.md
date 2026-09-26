# KIT Friend

A personal CRM for keeping in touch with people on a schedule, with AI-powered relationship memory.

## Stack

- Next.js 15 App Router
- PostgreSQL + Prisma
- Auth.js v5 (Google OAuth + email/password)
- Tailwind CSS v4
- Nodemailer for digest email
- Google Gemini for AI summaries

## Prerequisites

- Node.js 20 (`nvm use` reads `.nvmrc`)
- PostgreSQL database (e.g., Neon)
- Google OAuth credentials (from Google Cloud Console)
- SMTP credentials for digest emails (optional)
- Gemini API key for AI features (optional)

## Setup

```bash
nvm use
npm install
cp .env.example .env
# Edit .env with your database URL, auth secrets, and API keys
npx auth secret            # generates AUTH_SECRET
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Go to APIs & Services > Credentials
4. Create an OAuth 2.0 Client ID (Web application)
5. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
6. For production, add `https://your-domain.com/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env`

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Auth.js (required)
AUTH_SECRET=generated-by-npx-auth-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Cron secret (protects /api/digest/send)
CRON_SECRET=a-random-secret

# Optional - AI-powered relationship memory
GEMINI_API_KEY=your-gemini-api-key

# Optional - Daily digest email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL="KIT Friend <your-email@gmail.com>"
```

## Features

- **Contact Management**: Track contacts with custom reminder intervals
- **Status Tracking**: See who's overdue, due today, or upcoming
- **AI Memory**: Automatically extracts key topics and suggested questions from your notes
- **Daily Digest**: Email summary of who to contact today
- **Categories**: Family, Friends, Work, Other - each with customizable defaults

## How It Works

1. Add contacts with reminder intervals (e.g., "call Mom every 7 days")
2. When you touch base, add a note about what you discussed
3. AI extracts key topics and suggests questions for next time
4. Get a daily digest of who to reach out to

## API Routes

- `POST /api/contacts/:id/touch` - Mark contact as reached, optionally with note
- `POST /api/digest/send` - Send digest email

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
npm run test     # Vitest (unit + database tests)
```

## Tests

Unit tests (`*.test.ts`) are pure and need nothing. Database tests (`*.db.test.ts`) run against a throwaway Postgres in Docker:

```bash
npm run test:db:up    # start the test database (localhost:54329)
npm run test          # run everything
npm run test:unit     # unit tests only, no database needed
npm run test:db:down  # stop it
```

Point `TEST_DATABASE_URL` at another Postgres if you don't use Docker. The database name must end in `_test`: the suite truncates every table before each test, and it never falls back to `DATABASE_URL`.
