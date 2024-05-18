<h1 align="center" style="font-size: 60px">TikTok Clone</h1>

<p align="center"><strong>Urban Planning Assistance Platform</strong></p>

## Main technology used

- The t3 stack: [create.t3.gg](https://create.t3.gg/)
  - Nextjs
  - Prisma
  - trpc
  - Typescript
  - Tailwind
- next-auth
- react-hot-toast

## Installation

Tested node version: v18.13.0, npm version: 8.19.3

```
npm install
# Drop and create an empty database
rm -r prisma/migrations
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

See [SELF-HOSTING.md](/SELF-HOSTING.md)
