# KIT Friend

KIT Friend is a Next.js personal CRM for keeping in touch with people on a schedule, sending a daily digest, and storing lightweight AI-assisted relationship memory.

## Stack

- Next.js 15 App Router
- PostgreSQL + Prisma
- Tailwind CSS v4
- Nodemailer for digest email
- OpenAI for optional AI summaries and briefings

## Prerequisites

- Node.js 20 (`nvm use` reads the repo's `.nvmrc`)
- PostgreSQL database
- SMTP credentials if you want digest email sending
- OpenAI API key if you want AI memory and briefing features

## Setup

```bash
nvm use
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Optional AI features
OPENAI_API_KEY=sk-your-openai-api-key

# Required only for digest sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL="KIT Friend <your-email@gmail.com>"
DIGEST_TO=your-email@gmail.com
```

`digestTime` and category defaults are stored in the app settings row in the database, not in environment variables.

## Main Behavior

- Contacts are due based on `lastContactedAt + intervalDays`, or `createdAt + intervalDays` if they have never been touched.
- The digest always includes all overdue and due-today contacts, plus a configurable number of upcoming contacts.
- Marking a contact as touched updates `lastContactedAt` immediately; adding a note also stores an interaction and, when `OPENAI_API_KEY` is present, updates AI summary/topics/follow-ups asynchronously.
- AI briefing falls back gracefully when OpenAI is not configured.

## API Routes

- `GET /api/contacts`
  Returns contacts plus computed status fields. Use `?active=1` to filter active contacts only.
- `POST /api/contacts/:id/touch`
  Marks the contact as contacted now. Accepts optional JSON body `{ "note": "..." }`.
- `GET /api/contacts/:id/briefing`
  Returns AI briefing data when OpenAI is configured, otherwise returns stored summary/topics/follow-ups with `briefing: null`.
- `GET /api/digest/preview`
  Preview digest data as JSON without sending mail.
- `GET|POST /api/digest/send`
  Sends the digest when SMTP config is present, digest email is enabled in settings, and the current time is within the configured send window.

The app does not currently enforce cron authentication itself. If you expose `/api/digest/send`, protect it at the deployment layer.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## Troubleshooting

- If `npm` resolves to a broken Homebrew Node build, run `nvm use` before running project commands.
- If Prisma types are missing after install, run `npx prisma generate`.
