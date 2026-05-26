# ASR Studio Frontend

This directory contains the Vite + React frontend for ASR Studio.

## Current Capabilities

- Qwen, Doubao recording file standard 2.0, Gemini, and NVIDIA NIM provider adapters.
- Local upload, batch upload queue, microphone recording, and Doubao remote URL input.
- Browser-side compression, silence trimming, long-audio chunking, and provider-compatible audio conversion.
- Waveform preview with playback controls, clipping, download, and remote URL handling.
- Editable transcript workspace with text/segment views, search, save-to-history, and TXT/Markdown/JSON/SRT/VTT export.
- Local history search, provider/language filters, batch delete, JSON/Markdown export, and JSON import.
- Settings for credentials, recognition options, browser audio constraints, provider diagnostics, storage usage, cache cleanup, and PWA install.

## Run Locally

```bash
npm install
npm run dev
```

The development server normally starts at `https://localhost:5173`.

It listens on `0.0.0.0:5173` with a local HTTPS certificate, so phones or other computers on the same LAN can open `https://YOUR_LOCAL_IP:5173`. Accept the development certificate warning on first visit so browser microphone permissions are available outside localhost.

## Docker Deployment

From the repository root:

```bash
docker compose up -d --build
```

The app will be available at `http://localhost:8081`.

To build and run without Compose:

```bash
docker build -t asr-studio .
docker run -d --name asr-studio -p 8081:80 asr-studio
```

## Project Layout

```text
.
├── components/      React UI components, feature folders, and local SVG icons
├── services/        Provider adapters, audio helpers, IndexedDB, and shared utilities
├── App.tsx          Main application shell
├── index.tsx        React entry point
├── manifest.json    PWA manifest
└── public/sw.js     Service worker
```

## API Configuration

The app calls the selected ASR provider directly. Configure Qwen, Doubao, Gemini, or NVIDIA NIM credentials from the in-app settings panel.

- Doubao standard 2.0 currently submits local files as base64 `audio.data`; a server-accessible HTTP(S) `audio.url` can still be used from the optional URL input.
- NVIDIA NIM requires a self-hosted HTTP service or proxy base URL; the hosted NVIDIA Whisper Large v3 endpoint is gRPC/Riva and is not directly callable from the browser.

### Doubao Realtime ASR

Browser WebSocket connections cannot attach the custom `X-Api-*` headers required by Doubao, so the Vite dev server includes a same-origin proxy at `/doubao-realtime-asr`. Production deployments that serve the app as static files need to provide the same WebSocket proxy path and forward traffic to `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel` with the required Doubao headers.

A minimal Node proxy example is available at `server/doubaoRealtimeProxy.js`:

```bash
PORT=8787 DOUBAO_API_KEY=your-api-key npm run doubao:realtime-proxy
```

Place this proxy behind the same origin as the frontend, or route `/doubao-realtime-asr` to it from your web server.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
