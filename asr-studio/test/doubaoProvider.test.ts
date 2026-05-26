import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { DOUBAO_ASR_MODEL, DOUBAO_ASR_QUERY_URL, DOUBAO_ASR_RESOURCE_ID, DOUBAO_ASR_SUBMIT_URL } from '../constants.ts';
import { createRemoteAudioFile } from '../services/remoteAudioFile.ts';
import { getDoubaoAudioFormat, transcribeWithDoubao } from '../services/providers/doubaoProvider.ts';
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
    this.result = 'data:audio/wav;base64,bG9jYWwtYXVkaW8=';
    queueMicrotask(() => this.onload?.());
  }
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.FileReader = originalFileReader;
});

describe('transcribeWithDoubao', () => {
  test('submits local files as base64 audio.data and queries standard 2.0 results', async () => {
    const calls: FetchCall[] = [];
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });

      if (String(input) === DOUBAO_ASR_SUBMIT_URL) {
        return new Response('{}', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Status-Code': '20000000',
          },
        });
      }

      return new Response(
        JSON.stringify({
          result: {
            text: '  这是标准版 2.0 的结果。  ',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Status-Code': '20000000',
          },
        },
      );
    }) as typeof fetch;

    const file = new File(['audio'], 'meeting.wav', { type: 'audio/wav' });
    const result = await transcribeWithDoubao(
      file,
      '',
      Language.CHINESE,
      true,
      { apiKey: ' doubao-key ', accessKey: '' },
      new AbortController().signal,
    );

    assert.deepEqual(result, {
      transcription: '这是标准版 2.0 的结果。',
      detectedLanguage: '自动识别',
    });
    assert.equal(calls.length, 2);

    const submitHeaders = calls[0].init?.headers as Record<string, string>;
    assert.equal(String(calls[0].input), DOUBAO_ASR_SUBMIT_URL);
    assert.equal(calls[0].init?.method, 'POST');
    assert.equal(submitHeaders['X-Api-Key'], 'doubao-key');
    assert.equal(submitHeaders['X-Api-Resource-Id'], DOUBAO_ASR_RESOURCE_ID);
    assert.equal(DOUBAO_ASR_RESOURCE_ID, 'volc.seedasr.auc');
    assert.equal(submitHeaders['X-Api-Sequence'], '-1');

    const submitBody = JSON.parse(String(calls[0].init?.body));
    assert.equal(submitBody.user.uid, 'asr-studio-web');
    assert.notEqual(submitBody.user.uid, 'doubao-key');
    assert.equal(submitBody.audio.data, 'bG9jYWwtYXVkaW8=');
    assert.equal(submitBody.audio.url, undefined);
    assert.equal(submitBody.audio.format, 'wav');
    assert.equal(submitBody.audio.language, 'zh-CN');
    assert.equal(submitBody.request.model_name, DOUBAO_ASR_MODEL);
    assert.equal(submitBody.request.enable_itn, true);
    assert.equal(submitBody.request.enable_punc, true);

    const queryHeaders = calls[1].init?.headers as Record<string, string>;
    assert.equal(String(calls[1].input), DOUBAO_ASR_QUERY_URL);
    assert.equal(calls[1].init?.method, 'POST');
    assert.equal(queryHeaders['X-Api-Resource-Id'], DOUBAO_ASR_RESOURCE_ID);
    assert.equal(queryHeaders['X-Api-Request-Id'], submitHeaders['X-Api-Request-Id']);
  });

  test('keeps remote URL files as audio.url when provided', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      if (String(input) === DOUBAO_ASR_SUBMIT_URL) {
        return new Response('{}', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Status-Code': '20000000',
          },
        });
      }

      return new Response(JSON.stringify({ result: { text: '远程 URL 结果' } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Status-Code': '20000000',
        },
      });
    }) as typeof fetch;

    await transcribeWithDoubao(
      createRemoteAudioFile('https://example.com/meeting.wav'),
      '',
      Language.AUTO,
      true,
      { apiKey: 'doubao-key', accessKey: '' },
      new AbortController().signal,
    );

    const submitBody = JSON.parse(String(calls[0].init?.body));
    assert.equal(submitBody.audio.url, 'https://example.com/meeting.wav');
    assert.equal(submitBody.audio.data, undefined);
  });

  test('rejects unsupported recording file formats before submit', async () => {
    const file = createRemoteAudioFile('https://example.com/meeting.m4a');

    await assert.rejects(
      () =>
        transcribeWithDoubao(
          file,
          '',
          Language.AUTO,
          true,
          { apiKey: 'doubao-key', accessKey: '' },
          new AbortController().signal,
        ),
      /raw\/wav\/mp3\/ogg/,
    );
  });

  test('detects supported formats from remote URL extension or MIME type', () => {
    assert.equal(getDoubaoAudioFormat(createRemoteAudioFile('https://example.com/path/audio.ogg?x=1')), 'ogg');
    assert.equal(getDoubaoAudioFormat(new File(['audio'], 'capture', { type: 'audio/mpeg; codecs=mp3' })), 'mp3');
    assert.throws(
      () => getDoubaoAudioFormat(createRemoteAudioFile('https://example.com/audio.m4a')),
      /raw\/wav\/mp3\/ogg/,
    );
  });
});
