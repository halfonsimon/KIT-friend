# KIT Friend

**Keep In Touch** - A lightweight personal CRM to help you maintain meaningful relationships.

Track your contacts, set reminder intervals, and receive daily email digests showing who needs your attention.

## Features

- Contact management with custom reminder intervals
- Status tracking (Overdue / Due Today / OK)
- Daily email digest
- Category-based defaults (Family, Friends, Work, Other)

## Tech Stack

- Next.js 15 (App Router)
- PostgreSQL + Prisma (Neon recommended)
- Tailwind CSS v4
- Deployed on Vercel

## Getting Started

See [app/README.md](app/README.md) for detailed setup instructions.

```bash
cd app
npm install
cp .env.example .env  # Fill in your values
npx prisma db push
npm run dev
```

## License

MIT
