# ASR Studio Frontend

This directory contains the Vite + React frontend for ASR Studio.

## Run Locally

```bash
npm install
npm run dev
```

The development server normally starts at `http://localhost:5173`.

## Project Layout

```text
.
├── components/      React UI components and local SVG icons
├── services/        ASR, audio, and IndexedDB helpers
├── App.tsx          Main application shell
├── index.tsx        React entry point
├── manifest.json    PWA manifest
└── sw.js            Service worker
```

## API Configuration

The app calls the selected ASR provider directly. Configure Qwen, Doubao, or Gemini credentials from the in-app settings panel.

### Doubao Realtime ASR

When Doubao is selected, the main screen shows a realtime recognition button. It streams microphone audio as 16 kHz PCM to Doubao's realtime BigASR WebSocket API and updates the transcript while recording.

Browser WebSocket connections cannot attach the custom `X-Api-*` headers required by Doubao, so the Vite dev server includes a same-origin proxy at `/doubao-realtime-asr`. Production deployments that serve the app as static files need to provide the same WebSocket proxy path and forward traffic to `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel` with the required Doubao headers.

A minimal Node proxy example is available at `server/doubaoRealtimeProxy.js`:

```bash
PORT=8787 DOUBAO_API_KEY=your-api-key npm run doubao:realtime-proxy
```

Place this proxy behind the same origin as the frontend, or route `/doubao-realtime-asr` to it from your web server.
