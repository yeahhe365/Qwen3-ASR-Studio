import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { QWEN_ASR_API_URL } from '../constants.ts';
import { transcribeAudio } from '../services/asrService.ts';
import { AsrProvider, Language, MainstreamAsrModel, NvidiaNimTask, type AsrProviderConfig } from '../types.ts';

const originalFetch = globalThis.fetch;
const originalFileReader = globalThis.FileReader;
const originalConsoleWarn = console.warn;

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: null | (() => void) = null;
  onerror: null | ((error: Error) => void) = null;

  readAsDataURL(file: File) {
    void file;
    this.result = 'data:audio/webm;base64,dGVzdC1hdWRpbw==';
    queueMicrotask(() => this.onload?.());
  }
}

const qwenConfig: AsrProviderConfig = {
  provider: AsrProvider.QWEN,
  qwenApiKey: 'qwen-key',
  doubaoApiKey: '',
  doubaoAccessKey: '',
  geminiApiKey: '',
  nvidiaNimBaseUrl: '',
  nvidiaNimApiKey: '',
  nvidiaNimTask: NvidiaNimTask.TRANSCRIBE,
  mainstreamAsrModel: MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE,
  mainstreamAsrApiKey: '',
  mainstreamAsrBaseUrl: '',
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.FileReader = originalFileReader;
  console.warn = originalConsoleWarn;
});

describe('transcribeAudio', () => {
  test('aborts immediately during retry backoff', async () => {
    const controller = new AbortController();
    const progressMessages: string[] = [];
    let fetchCalls = 0;

    console.warn = () => {};
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      assert.equal(String(input), QWEN_ASR_API_URL);
      fetchCalls += 1;
      return new Response(JSON.stringify({ error: { message: 'temporary failure' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const request = transcribeAudio(
      new File(['audio'], 'meeting.webm', { type: 'audio/webm' }),
      '',
      Language.AUTO,
      false,
      qwenConfig,
      (message) => {
        progressMessages.push(message);
        if (message.includes('秒后重试')) {
          controller.abort();
        }
      },
      controller.signal,
    );

    await assert.rejects(request, (error) => error instanceof Error && error.name === 'AbortError');
    assert.equal(fetchCalls, 1);
    assert(progressMessages.includes('识别出错，将在 2 秒后重试...'));
  });
});
