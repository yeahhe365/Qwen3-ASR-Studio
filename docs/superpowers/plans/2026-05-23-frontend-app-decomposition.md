# Frontend App Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `qwen3-asr-studio/App.tsx` to a thin composition layer by moving transcription flow, history/notes persistence, and PiP lifecycle into focused hooks without changing the user experience.

**Architecture:** Keep the current React UI and service layer intact. Extract the stateful browser and cache workflows into small hooks under `qwen3-asr-studio/hooks/`, let `App.tsx` own only page composition and cross-cutting wiring, and preserve the current settings, keyboard shortcut, and restore behaviors.

**Tech Stack:** React, TypeScript, Vite, browser APIs, IndexedDB helpers, existing service modules.

---

### Task 1: Extract transcription workflow

**Files:**
- Create: `qwen3-asr-studio/hooks/useTranscriptionFlow.ts`
- Modify: `qwen3-asr-studio/App.tsx`
- Read-only references: `qwen3-asr-studio/services/audioService.ts`, `qwen3-asr-studio/services/gradioService.ts`, `qwen3-asr-studio/services/cacheService.ts`, `qwen3-asr-studio/components/ResultDisplay.tsx`, `qwen3-asr-studio/components/AudioUploader.tsx`

- [x] **Step 1: Create `useTranscriptionFlow` with the existing transcription state and actions**

  Move the current `audioFile`, `transcription`, `detectedLanguage`, `isLoading`, `loadingMessage`, `elapsedTime`, `copied`, `isRecording`, `transcribeAfterRecording`, `abortControllerRef`, and the transcription callbacks into a hook that accepts the current settings and a `notify` callback. Keep the cache lookup, compression, auto-copy, retry, cancel, example loading, and PiP transcription result handling in one place so `App.tsx` stops owning the workflow itself.

- [x] **Step 2: Switch `App.tsx` to consume the hook outputs**

  Replace the local transcription state and handlers in `App.tsx` with the hook return values. Keep only the small UI coordination callbacks in the page component, such as scrolling after restore and clearing notifications when a new file arrives.

- [x] **Step 3: Verify the transcription refactor compiles cleanly**

  Run: `npx tsc --noEmit`

  Expected: pass with no TypeScript errors in `qwen3-asr-studio`.

### Task 2: Extract history and notes persistence

**Files:**
- Create: `qwen3-asr-studio/hooks/useHistoryItems.ts`
- Create: `qwen3-asr-studio/hooks/useNotes.ts`
- Modify: `qwen3-asr-studio/App.tsx`
- Read-only references: `qwen3-asr-studio/services/cacheService.ts`, `qwen3-asr-studio/components/HistoryPanel.tsx`, `qwen3-asr-studio/components/NotesPanel.tsx`, `qwen3-asr-studio/types.ts`

- [x] **Step 1: Add `useHistoryItems` for loading and mutating history rows**

  Move the initial `getHistory()` load, `addHistoryItem()` prepend path, `deleteHistoryItem()`, and `clearHistory()` logic into a hook that returns the current history array plus the action functions. Keep restore-to-editor behavior in `App.tsx` because it coordinates page state and scrolling.

- [x] **Step 2: Add `useNotes` for loading and mutating note rows**

  Move the initial `getNotes()` load, `addNoteItem()`, and `deleteNoteItem()` logic into a hook that returns the current notes array plus the action functions. Keep the note restore callback in `App.tsx` so it can keep the editor state and mode changes in one place.

- [x] **Step 3: Wire `App.tsx` to the new persistence hooks**

  Remove the direct IndexedDB calls from the page component and pass the returned arrays and handlers into `HistoryPanel` and `NotesPanel` exactly as before.

### Task 3: Extract PiP lifecycle management

**Files:**
- Create: `qwen3-asr-studio/hooks/useDocumentPip.ts`
- Modify: `qwen3-asr-studio/App.tsx`
- Read-only references: `qwen3-asr-studio/components/PipView.tsx`, `qwen3-asr-studio/constants.ts`, `qwen3-asr-studio/types.ts`

- [x] **Step 1: Create a hook that owns the PiP window and container**

  Move the `documentPictureInPicture` feature check, window creation, style/script cloning, `pagehide` cleanup, and active-state tracking into a hook that exposes `isPipActive`, `pipContainer`, `openPip`, `closePip`, and `togglePip`.

- [x] **Step 2: Update `App.tsx` to render the portal from the hook state**

  Keep the `PipView` props unchanged, but read `pipContainer` and `isPipActive` from the hook instead of local state so the page component no longer owns the PiP lifecycle itself.

- [x] **Step 3: Verify the UI still builds**

  Run: `npm run build`

  Expected: pass in `qwen3-asr-studio` with no runtime or type regressions.

### Task 4: Final hygiene check

**Files:**
- Modify: only files touched above if a small cleanup is needed

- [x] **Step 1: Remove any leftover unused imports, state, or callbacks from `App.tsx`**

  Make sure the page component still only coordinates layout, settings, restore callbacks, and cross-hook wiring.

- [x] **Step 2: Run the repo-local sanity check**

  Run: `git diff --check`

  Expected: no whitespace or patch formatting issues.

- [x] **Step 3: Re-run the frontend build if the final cleanup changed code paths**

  Run: `npm run build`

  Expected: same green result as the earlier verification step.
