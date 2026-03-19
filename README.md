# KIT Friend

Keep In Touch is a lightweight personal CRM for tracking when to reach out to friends, family, and work contacts.

The actual application lives in [`app/`](app/). That folder contains the Next.js app, Prisma schema, and setup instructions.

## What It Does

- Contact management with custom reminder intervals
- Status tracking (Overdue / Due Today / OK)
- Daily email digest
- AI-assisted relationship memory and briefings
- Category-based defaults (Family, Friends, Work, Other)

## Quick Start

```bash
cd app
nvm use
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

See [`app/README.md`](app/README.md) for the full setup, environment variables, API route behavior, and deployment notes.
