# Qwen3-ASR ModelScope API

This directory contains a Next.js API server for calling the Qwen3-ASR ModelScope / Gradio deployment.

## Run Locally

```bash
npm install
npm run dev
```

The custom server starts on `http://localhost:3000` by default and exposes demo pages plus API routes under `src/app`.

## Useful Scripts

```bash
npm run build
npm start
npm run db:generate
npm run db:push
```

## Main Files

```text
server.ts                         Custom Next.js + Socket.IO server
src/app/asr                       Interactive ASR demo page
src/app/api-docs                  API documentation page
src/app/api/asr-inference         ModelScope / Gradio inference endpoint
src/app/api/test-gradio           Connectivity test endpoint
```

## Local Data

SQLite database files are local runtime artifacts and should not be committed. Regenerate local Prisma state with the `db:*` scripts when needed.
