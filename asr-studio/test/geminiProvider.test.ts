import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { GEMINI_ASR_API_URL } from '../constants.ts';
import { transcribeWithGemini } from '../services/providers/geminiProvider.ts';
import { Language } from '../types.ts';

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

const originalFetch = globalThis.fetch;
const originalFileReader = globalThis.FileReader;

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

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.FileReader = originalFileReader;
});

describe('transcribeWithGemini', () => {
  test('sends inline audio and transcription instructions', async () => {
    const calls: FetchCall[] = [];
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: '  会议将在 10 点开始。  ' }],
            },
          },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const file = new File(['audio'], 'meeting.webm', { type: 'audio/webm' });
    const result = await transcribeWithGemini(
      file,
      '项目名是 ASR Studio',
      Language.CHINESE,
      true,
      { apiKey: ' gemini-key ' },
      new AbortController().signal,
    );

    assert.deepEqual(result, {
      transcription: '会议将在 10 点开始。',
      detectedLanguage: Language.CHINESE,
    });
    assert.equal(calls.length, 1);
    assert.equal(String(calls[0].input), GEMINI_ASR_API_URL);
    assert.equal(calls[0].init?.method, 'POST');
    assert.equal((calls[0].init?.headers as Record<string, string>)['X-Goog-Api-Key'], 'gemini-key');

    const body = JSON.parse(String(calls[0].init?.body));
    assert.equal(body.contents[0].role, 'user');
    assert.match(body.contents[0].parts[0].text, /只返回音频转写文本/);
    assert.match(body.contents[0].parts[0].text, /目标语言：zh/);
    assert.match(body.contents[0].parts[0].text, /启用 ITN/);
    assert.match(body.contents[0].parts[0].text, /ASR Studio/);
    assert.deepEqual(body.contents[0].parts[1].inlineData, {
      mimeType: 'audio/webm',
      data: 'dGVzdC1hdWRpbw==',
    });
  });

  test('surfaces API error details', async () => {
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.fetch = (async () => new Response(JSON.stringify({
      error: { message: 'API key not valid' },
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    const file = new File(['audio'], 'meeting.webm', { type: 'audio/webm' });

    await assert.rejects(
      () => transcribeWithGemini(
        file,
        '',
        Language.AUTO,
        false,
        { apiKey: 'gemini-key' },
        new AbortController().signal,
      ),
      /API key not valid/,
    );
  });
});
