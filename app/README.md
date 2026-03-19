# KIT Friend

A personal CRM for keeping in touch with people on a schedule, with AI-powered relationship memory.

## Stack

- Next.js 15 App Router
- PostgreSQL + Prisma
- Tailwind CSS v4
- Nodemailer for digest email
- Google Gemini for AI summaries

## Prerequisites

- Node.js 20 (`nvm use` reads `.nvmrc`)
- PostgreSQL database (e.g., Neon)
- SMTP credentials for digest emails (optional)
- Gemini API key for AI features (optional)

## Setup

```bash
nvm use
npm install
cp .env.example .env
# Edit .env with your database URL and API keys
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Optional - AI-powered relationship memory
GEMINI_API_KEY=your-gemini-api-key

# Optional - Daily digest email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL="KIT Friend <your-email@gmail.com>"
DIGEST_TO=your-email@gmail.com
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

- `GET /api/contacts` - List contacts with status
- `POST /api/contacts/:id/touch` - Mark contact as reached, optionally with note
- `GET /api/digest/preview` - Preview digest data
- `POST /api/digest/send` - Send digest email

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
npm run test     # Vitest
```
