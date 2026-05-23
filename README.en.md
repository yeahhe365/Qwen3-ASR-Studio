# ASR Studio

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

A modern Web UI for Qwen ASR with recording, PWA support, local caching, and fast speech transcription workflows.

## Overview

A modern Web UI for Qwen ASR with recording, PWA support, local caching, and fast speech transcription workflows.

## Features

- Record audio and transcribe it in the browser.
- PWA support for desktop and mobile workflows.
- Includes ModelScope and Aliyun API backend examples.
- Frontend built with Vite, React, and TypeScript.

## Quick Start

```bash
git clone https://github.com/yeahhe365/Qwen3-ASR-Studio.git
cd Qwen3-ASR-Studio/qwen3-asr-studio
npm install
npm run dev
```

The frontend development server normally starts at `http://localhost:5173`.
For backend examples, enter `modelscope-api` or `aliyun-api` and run `npm install && npm run dev`.

## Configuration

- Configure API credentials, model service endpoints, and runtime environment variables according to the selected backend.

## Tech Stack

- React
- TypeScript
- Vite
- Qwen ASR

## Project Structure

- `qwen3-asr-studio`: Vite + React frontend.
- `modelscope-api`: Next.js API example for the ModelScope / Gradio deployment.
- `aliyun-api`: Next.js API example for Aliyun Bailian / DashScope.

## Contributing

Issues and pull requests are welcome. Before submitting changes, review the existing structure and keep contributions focused and verifiable.

---

## Related Community

- [Linux.do](https://linux.do/): an active Chinese tech community focused on AI, software development, resource sharing, and frontier technology discussions. Its vision is "a new ideal community", and its community culture emphasizes sincerity, friendliness, unity, and professionalism.

## License

License information is available in the repository `LICENSE` file.
