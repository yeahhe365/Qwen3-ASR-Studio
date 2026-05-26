import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { QWEN_ASR_API_URL, QWEN_ASR_MODEL } from '../constants.ts';
import { transcribeWithQwen } from '../services/providers/qwenProvider.ts';
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

describe('transcribeWithQwen', () => {
  test('uses qwen3-asr-flash with inline audio', async () => {
    const calls: FetchCall[] = [];
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '  欢迎使用 ASR Studio。  ',
                annotations: [
                  {
                    type: 'audio_info',
                    language: 'zh',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const file = new File(['audio'], 'meeting.webm', { type: 'audio/webm' });
    const result = await transcribeWithQwen(
      file,
      '项目名是 ASR Studio',
      Language.CHINESE,
      true,
      { apiKey: ' qwen-key ' },
      new AbortController().signal,
    );

    assert.deepEqual(result, {
      transcription: '欢迎使用 ASR Studio。',
      detectedLanguage: 'zh',
    });
    assert.equal(calls.length, 1);
    assert.equal(String(calls[0].input), QWEN_ASR_API_URL);
    assert.equal(calls[0].init?.method, 'POST');
    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer qwen-key');

    const body = JSON.parse(String(calls[0].init?.body));
    assert.equal(body.model, QWEN_ASR_MODEL);
    assert.equal(body.model, 'qwen3-asr-flash');
    assert.equal(body.stream, false);
    assert.equal(body.messages[0].role, 'system');
    assert.match(body.messages[0].content, /只返回音频转写文本/);
    assert.match(body.messages[0].content, /ASR Studio/);
    assert.equal(body.messages[1].role, 'user');
    assert.deepEqual(body.messages[1].content[0], {
      type: 'input_audio',
      input_audio: {
        data: 'data:audio/webm;base64,dGVzdC1hdWRpbw==',
      },
    });
    assert.deepEqual(body.asr_options, {
      language: Language.CHINESE,
      enable_itn: true,
    });
  });

  test('surfaces API error details', async () => {
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: { message: 'Invalid model' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )) as typeof fetch;

    const file = new File(['audio'], 'meeting.webm', { type: 'audio/webm' });

    await assert.rejects(
      () => transcribeWithQwen(file, '', Language.AUTO, false, { apiKey: 'qwen-key' }, new AbortController().signal),
      /Invalid model/,
    );
  });

  test('does not call the API when aborted after audio data is prepared', async () => {
    const controller = new AbortController();
    let fetchCalls = 0;

    class AbortingFileReader {
      result: string | ArrayBuffer | null = null;
      onload: null | (() => void) = null;
      onerror: null | ((error: Error) => void) = null;

      readAsDataURL(file: File) {
        void file;
        this.result = 'data:audio/webm;base64,dGVzdC1hdWRpbw==';
        controller.abort();
        queueMicrotask(() => this.onload?.());
      }
    }

    globalThis.FileReader = AbortingFileReader as unknown as typeof FileReader;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const file = new File(['audio'], 'meeting.webm', { type: 'audio/webm' });

    await assert.rejects(
      () => transcribeWithQwen(file, '', Language.AUTO, false, { apiKey: 'qwen-key' }, controller.signal),
      (error) => error instanceof Error && error.name === 'AbortError',
    );
    assert.equal(fetchCalls, 0);
  });

  test('rejects inline audio that exceeds the official size limit', async () => {
    const largeFile = new File([new Uint8Array(8 * 1024 * 1024)], 'large.wav', { type: 'audio/wav' });

    await assert.rejects(
      () =>
        transcribeWithQwen(largeFile, '', Language.AUTO, false, { apiKey: 'qwen-key' }, new AbortController().signal),
      /内联音频上限/,
    );
  });
});
