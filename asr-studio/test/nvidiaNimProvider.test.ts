import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { NVIDIA_NIM_HTTP_BASE_URL_PLACEHOLDER, NVIDIA_NIM_TRANSCRIPTIONS_PATH } from '../constants.ts';
import { createNvidiaNimTranscriptionsUrl, transcribeWithNvidiaNim } from '../services/providers/nvidiaNimProvider.ts';
import { Language } from '../types.ts';

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('transcribeWithNvidiaNim', () => {
  test('uploads audio to the NIM transcriptions endpoint', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(
        JSON.stringify({
          text: '  NVIDIA NIM 转写完成。  ',
          language: 'multi',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const file = new File(['audio'], 'meeting.wav', { type: 'audio/wav' });
    const result = await transcribeWithNvidiaNim(
      file,
      '上下文会被忽略',
      Language.AUTO,
      true,
      { baseUrl: ' http://localhost:9000/ ', apiKey: ' nim-key ' },
      new AbortController().signal,
    );

    assert.deepEqual(result, {
      transcription: 'NVIDIA NIM 转写完成。',
      detectedLanguage: 'multi',
    });
    assert.equal(calls.length, 1);
    assert.equal(String(calls[0].input), `http://localhost:9000${NVIDIA_NIM_TRANSCRIPTIONS_PATH}`);
    assert.equal(calls[0].init?.method, 'POST');
    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer nim-key');

    const body = calls[0].init?.body as FormData;
    assert.equal(body.get('language'), 'multi');
    const uploadedFile = body.get('file') as File;
    assert.equal(uploadedFile.name, 'meeting.wav');
    assert.equal(uploadedFile.type, 'audio/wav');
  });

  test('maps selected language and supports unauthenticated local NIM', async () => {
    let body: FormData | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = init?.body as FormData;
      return new Response(JSON.stringify({ text: '你好' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const file = new File(['audio'], 'meeting.webm', { type: 'audio/webm' });
    await transcribeWithNvidiaNim(
      file,
      '',
      Language.CHINESE,
      false,
      { baseUrl: 'http://nim.example.com', apiKey: '' },
      new AbortController().signal,
    );

    assert.equal(body?.get('language'), 'zh-CN');
  });

  test('surfaces API error details', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          detail: 'model not ready',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )) as typeof fetch;

    const file = new File(['audio'], 'meeting.wav', { type: 'audio/wav' });

    await assert.rejects(
      () =>
        transcribeWithNvidiaNim(
          file,
          '',
          Language.AUTO,
          false,
          { baseUrl: NVIDIA_NIM_HTTP_BASE_URL_PLACEHOLDER, apiKey: '' },
          new AbortController().signal,
        ),
      /model not ready/,
    );
  });
});

describe('createNvidiaNimTranscriptionsUrl', () => {
  test('normalizes trailing-slash base URLs', () => {
    assert.equal(
      createNvidiaNimTranscriptionsUrl('https://nim.example.com/'),
      `https://nim.example.com${NVIDIA_NIM_TRANSCRIPTIONS_PATH}`,
    );
  });

  test('requires an explicit HTTP base URL', () => {
    assert.throws(() => createNvidiaNimTranscriptionsUrl(''), /NVIDIA NIM HTTP Base URL/);
  });
});
