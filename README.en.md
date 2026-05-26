# ASR Studio

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

A modern Web UI for Qwen, Doubao, Gemini, and NVIDIA NIM ASR-style transcription with recording, batch queues, local preprocessing, PWA support, local caching, and fast speech workflows.

## Features

- Upload one or more local audio files, record from the microphone, or use a public remote audio URL for Doubao standard 2.0.
- Queue multiple files for batch transcription with per-file status updates.
- Preview audio with a waveform, playback controls, loop/mute/rate controls, clipping, download, and remote URL awareness.
- Preprocess audio in the browser with compression, silence trimming, long-audio chunking, and provider-compatible conversion.
- Use provider adapters for Qwen ASR, Doubao recording file standard 2.0, Gemini audio understanding, and NVIDIA NIM.
- Edit transcripts, view segments, search within results, save edits back to history, and export TXT, Markdown, JSON, SRT, or VTT.
- Manage local history with search, provider/language filters, batch delete, JSON/Markdown export, and JSON import.
- Run provider diagnostics, clear caches, restore defaults, and inspect local storage usage from settings.
- PWA support for desktop and mobile workflows.
- Frontend built with Vite, React, and TypeScript.

## Quick Start

```bash
git clone https://github.com/yeahhe365/ASR-Studio.git
cd ASR-Studio/asr-studio
npm install
npm run dev
```

The frontend development server normally starts at `http://localhost:5173`.

## Docker Deployment

The repository includes a multi-stage `Dockerfile` and a `docker-compose.yml`. The image builds the Vite frontend and serves the static output with Nginx.

```bash
docker compose up -d --build
```

Open `http://localhost:8081` after the container starts.

To use Docker directly:

```bash
docker build -t asr-studio .
docker run -d --name asr-studio -p 8081:80 asr-studio
```

The container exposes a health check at `GET /healthz`.

## Configuration

- Choose Qwen, Doubao, Gemini, or NVIDIA NIM in the in-app settings panel and configure the matching API credentials.
- Qwen and Gemini send inline browser requests, so large files may need compression, trimming, or chunking.
- Doubao recording file standard 2.0 requires a public audio URL.
- NVIDIA hosted Whisper Large v3 is a gRPC/Riva service and cannot be called directly from the browser; configure a self-hosted NIM container or HTTP proxy base URL.

## Development Checks

```bash
cd asr-studio
npm run typecheck
npm test
npm run build
```

## Tech Stack

- React
- TypeScript
- Vite
- Qwen ASR
- Doubao ASR
- Gemini API
- NVIDIA NIM
- WaveSurfer.js
- IndexedDB

## Project Structure

- `asr-studio`: Vite + React frontend.
- `deploy-compat`: deployment compatibility wrapper that mirrors the frontend build output.

## Contributing

Issues and pull requests are welcome. Before submitting changes, review the existing structure and keep contributions focused and verifiable.

---

## Related Community

- [Linux.do](https://linux.do/): an active Chinese tech community focused on AI, software development, resource sharing, and frontier technology discussions. Its vision is "a new ideal community", and its community culture emphasizes sincerity, friendliness, unity, and professionalism.

## License

License information is available in the repository `LICENSE` file.
