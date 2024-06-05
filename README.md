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

## Preparation

Spin up mysql DB
```
sudo /etc/init.d/mysql start
sudo /etc/init.d/mysql status
```
Setup Python Environment
```
pip install -r script/requirements.txt && pip install -r script/summarization/requirements.txt 
```
Spin up FAISS Server, in a seperate terminal
```
cd script && python embedding_search.py
## in postman or terminal
curl --location --request GET '172.22.89.82:8000/init_summary' \
  --header 'Content-Type: application/json' \
  --data '{
    "file_path": "../storage/reviewed_papers",
    "chunk_size": 7000
  }'
```

Create and edit `.env` in the format of `.env.example`
For details about `.env`, see [SELF-HOSTING.md](/SELF-HOSTING.md)

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

