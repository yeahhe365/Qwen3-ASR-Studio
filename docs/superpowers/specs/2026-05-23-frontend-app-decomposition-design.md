# Frontend App Decomposition Design

## Goal

Continue improving `qwen3-asr-studio/App.tsx` readability by moving cohesive behavior into focused hooks. The user-facing ASR workflow, UI layout, settings, history, notes, and PiP behavior must stay unchanged.

## Scope

This pass only touches the React frontend. It will not redesign the UI, change API payloads, change cache storage formats, or upgrade dependencies.

## Design

`App.tsx` should become the composition layer for the page: it owns top-level wiring and renders components, while reusable behavior lives under `qwen3-asr-studio/hooks/`.

Add these hooks:

- `useTranscriptionFlow`: owns transcription lifecycle state and actions, including loading state, progress message, cancellation, retry, cache lookup, compression, service calls, auto-copy, elapsed time, history creation, and notes-mode insertion.
- `useHistoryItems`: owns loading, deleting, clearing, and prepending history items.
- `useNotes`: owns loading, saving, deleting, and restoring notes data operations.
- `useDocumentPip`: owns Document Picture-in-Picture window creation, stylesheet/script copying, cleanup, and active state.

Keep small UI-specific callbacks in `App.tsx` when they directly coordinate several hooks or scroll the page after restoring content.

## Error Handling

Hooks should accept `notify` or `onError` callbacks instead of creating their own toast state. Existing console errors may remain for unexpected browser/storage failures, but noisy success/debug logs should not be added.

## Testing

After implementation, run:

- `npx tsc --noEmit` in `qwen3-asr-studio`
- `npm run build` in `qwen3-asr-studio`
- Existing full-repo verification can be repeated if shared files changed unexpectedly.
