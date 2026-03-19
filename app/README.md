# Kit Friend

Lightweight contacts CRM with daily email digest. Built on Next.js App Router + Prisma/Postgres, deployed on Vercel.

## Prerequisites
- Node 20+
- Postgres database (set `DATABASE_URL`)

## Environment
Create `.env.local` with:
```
DATABASE_URL=postgres://user:pass@host:5432/db
DIGEST_TO=you@example.com          # comma separated list
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587                      # 465 for SSL
SMTP_USER=apikey-or-username
SMTP_PASS=secret
FROM_EMAIL="Kit Friend <no-reply@yourdomain.com>"
```

## Develop
```bash
npm install
npm run dev
```
Visit http://localhost:3000.

## Database
```bash
npx prisma migrate dev
# or in CI/Prod: npx prisma migrate deploy
```

## Tests
```bash
npm test
npm run lint
```

## Deploy (Vercel)
- Set the env vars above in Vercel project settings.
- Ensure a Postgres add-on/connection is configured.
- Vercel will run `npm run build` and `prisma migrate deploy` on deploy.

## Notes
- Email digest is the only notification channel.
- Push/WhatsApp functionality and VAPID keys are removed to keep the surface minimal.
