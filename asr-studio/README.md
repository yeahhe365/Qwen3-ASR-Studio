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

The app calls the selected ASR provider directly. Configure Qwen or Doubao credentials from the in-app settings panel.
