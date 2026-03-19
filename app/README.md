# KIT Friend

**Keep In Touch** - A lightweight personal CRM to help you maintain meaningful relationships.

KIT Friend tracks your contacts and reminds you when it's time to reach out. It organizes contacts by category (Family, Friends, Work, Other) with customizable intervals, and sends daily email digests showing who needs your attention.

## Features

- **Contact Management**: Add, edit, and organize contacts with custom reminder intervals
- **Smart Status Tracking**: Contacts are marked as Overdue, Due Today, or OK based on last contact date
- **Daily Email Digest**: Automated summary of contacts needing attention
- **Category Defaults**: Set default intervals per category (e.g., Family every 7 days, Friends every 30 days)
- **Active/Inactive Toggle**: Temporarily pause reminders for specific contacts

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Neon recommended)
- **Styling**: Tailwind CSS v4
- **Email**: Nodemailer (Gmail or any SMTP provider)
- **Hosting**: Vercel

## Prerequisites

- Node.js 20+
- PostgreSQL database (Neon, Supabase, or local)
- SMTP credentials for email (Gmail App Password works well)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/halfonsimon/KIT-friend.git
cd KIT-friend/app
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL="KIT Friend <your-email@gmail.com>"
DIGEST_TO=your-email@gmail.com

# Cron Authentication
CRON_SECRET=your-secret-key
```

### 3. Setup Database

```bash
npx prisma db push    # Development: sync schema
# or
npx prisma migrate deploy  # Production: run migrations
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── prisma/
│   └── schema.prisma      # Database schema (Contact, Setting, Interaction)
├── src/
│   ├── app/
│   │   ├── (app)/         # Main app routes (contacts, digest, settings)
│   │   └── api/           # API routes (contacts CRUD, digest send)
│   ├── components/        # React components (forms, buttons, badges)
│   └── lib/
│       ├── db.ts          # Prisma client singleton
│       ├── due.ts         # Contact status computation logic
│       ├── digest.ts      # Digest data builder
│       ├── mailer.ts      # SMTP email transport
│       ├── settings.ts    # App settings with defaults
│       └── validation.ts  # Zod schemas for form validation
```

## Key Concepts

### Contact Status

Each contact has a **due date** calculated as:
- `lastContactedAt + intervalDays` (or `createdAt + intervalDays` if never contacted)

Status is determined by comparing the due date to today:
- **Overdue**: Due date is in the past
- **Today**: Due date is today
- **OK**: Due date is in the future

### Daily Digest

The digest shows:
- All **Overdue** contacts (unlimited)
- All contacts **Due Today** (unlimited)
- Top N **Upcoming** contacts (configurable in settings)

Triggered via `/api/digest/send` endpoint (protect with `CRON_SECRET`).

## Deployment (Vercel)

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel project settings
3. Vercel auto-deploys on push to `main`

### Cron Job for Daily Digest

Use Vercel Cron or an external service to call:
```
POST /api/digest/send
Authorization: Bearer YOUR_CRON_SECRET
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run test     # Run Vitest tests
```

## License

MIT
