<h1 align="center" style="font-size: 60px">TikTok Clone</h1>

<p align="center"><strong>A fullstack TikTok clone with Nextjs, Prisma, trpc</strong></p>

<p align="center">
  <img alt="Stars" src="https://badgen.net/github/stars/napthedev/toptop-clone">
  <img alt="Forks" src="https://badgen.net/github/forks/napthedev/toptop-clone">
  <img alt="Issues" src="https://badgen.net/github/issues/napthedev/toptop-clone">
  <img alt="Commits" src="https://badgen.net/github/commits/napthedev/toptop-clone">
</p>

## Live demo

Official website: [https://toptop-clone.vercel.app/](https://toptop-clone.vercel.app/)

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

```
npm install
# Drop and create an empty database
rm -r prisma/migrations
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

See [SELF-HOSTING.md](/SELF-HOSTING.md)
