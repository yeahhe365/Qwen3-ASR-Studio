# Project Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up small maintainability issues in Qwen3-ASR-Studio without changing user-facing ASR behavior.

**Architecture:** Keep the three existing subprojects intact. Apply low-risk hygiene changes first, then extract only isolated frontend concerns from `App.tsx` into small hooks and shared constants.

**Tech Stack:** React, TypeScript, Vite, Next.js, Prisma, ESLint.

---

### Task 1: Repository Hygiene

**Files:**
- Create: `.gitignore`
- Delete: `.DS_Store`
- Delete: `aliyun-api/db/custom.db`
- Delete: `modelscope-api/db/custom.db`

- [x] Add root ignore rules for OS files, local databases, logs, build output, dependencies, and local tool state.
- [x] Remove tracked local artifacts that should not live in source control.
- [x] Verify `git status --short` shows the three files as deleted and the root ignore file as added.

### Task 2: Package and Documentation Names

**Files:**
- Modify: `aliyun-api/package.json`
- Modify: `aliyun-api/package-lock.json`
- Modify: `modelscope-api/package.json`
- Modify: `modelscope-api/package-lock.json`
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `qwen3-asr-studio/README.md`
- Modify: `aliyun-api/README.md`
- Modify: `modelscope-api/README.md`

- [x] Rename scaffold package names to project-specific names.
- [x] Replace scaffold and AI Studio README leftovers with project-specific setup notes.
- [x] Make root setup instructions point to the correct subproject directories.

### Task 3: Lint and Logging Hygiene

**Files:**
- Modify: `aliyun-api/eslint.config.mjs`
- Modify: `modelscope-api/eslint.config.mjs`
- Modify: selected API and frontend service files with obvious debug logs.

- [x] Re-enable basic bug-catching lint rules while leaving larger type cleanup for later.
- [x] Remove or gate noisy request/response debug logs.
- [x] Keep necessary startup and error logs.

### Task 4: Frontend Readability

**Files:**
- Create: `qwen3-asr-studio/constants.ts`
- Create: `qwen3-asr-studio/hooks/useAudioDevices.ts`
- Create: `qwen3-asr-studio/hooks/useElapsedTimer.ts`
- Create: `qwen3-asr-studio/hooks/usePersistentState.ts`
- Create: `qwen3-asr-studio/hooks/usePwaInstall.ts`
- Modify: `qwen3-asr-studio/App.tsx`
- Modify: `qwen3-asr-studio/types.ts`
- Modify: `qwen3-asr-studio/services/gradioService.ts`

- [x] Move shared API URLs and storage-backed settings out of the main component.
- [x] Move isolated browser side effects into focused hooks.
- [x] Keep transcription flow and UI behavior unchanged.

### Task 5: Verification

**Commands:**
- `npm run build` in `qwen3-asr-studio`
- `npm run build` in `aliyun-api`
- `npm run build` in `modelscope-api`
- targeted grep checks for scaffold leftovers and tracked local artifacts

- [x] Run available builds/checks.
- [x] Report any pre-existing or new failures with exact command output.
