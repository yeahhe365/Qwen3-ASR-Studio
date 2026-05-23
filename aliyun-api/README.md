# ASR Studio Aliyun API

This directory contains a Next.js API server for forwarding transcription requests to Aliyun Bailian / DashScope.

## Run Locally

```bash
npm install
npm run dev
```

The custom server starts on `http://localhost:3000` by default and exposes the API routes under `src/app/api`.

## Useful Scripts

```bash
npm run build
npm start
npm run db:generate
npm run db:push
```

## Main Files

```text
server.ts                                  Custom Next.js + Socket.IO server
src/app/api/proxy/transcribe              Non-streaming proxy endpoint
src/app/api/proxy/transcribe-stream       Streaming proxy endpoint
src/app/api/transcribe                    Direct DashScope transcription endpoint
src/components                            Demo UI and API documentation components
```

## Local Data

SQLite database files are local runtime artifacts and should not be committed. Regenerate local Prisma state with the `db:*` scripts when needed.
