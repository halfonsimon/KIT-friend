# KIT Friend

**Keep In Touch** - A personal CRM for maintaining meaningful relationships with friends, family, and colleagues.

## Features

- Multi-user authentication (Google OAuth + email/password)
- Contact management with custom reminder intervals
- Status tracking (Overdue / Due Today / Upcoming)
- AI-powered relationship memory using Google Gemini
- Daily email digest of contacts to reach out to
- Voice-to-text note taking
- Category-based defaults (Family, Friends, Work, Other)

## Quick Start

```bash
cd app
nvm use
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma db push
npm run dev
```

See [`app/README.md`](app/README.md) for detailed setup and configuration.

## Tech Stack

- Next.js 15 + React 19
- Auth.js v5 (Google OAuth + Credentials)
- PostgreSQL + Prisma
- Tailwind CSS v4
- Google Gemini AI
- Nodemailer
