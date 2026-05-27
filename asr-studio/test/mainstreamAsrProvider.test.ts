import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
  ASSEMBLYAI_TRANSCRIPT_URL,
  DEEPGRAM_LISTEN_URL,
  ELEVENLABS_SPEECH_TO_TEXT_URL,
  OPENAI_AUDIO_TRANSCRIPTIONS_URL,
} from '../constants.ts';
import { transcribeWithMainstreamAsr } from '../services/providers/mainstreamAsrProvider.ts';
import { Language, MainstreamAsrModel } from '../types.ts';

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('transcribeWithMainstreamAsr', () => {
  test('calls OpenAI-compatible transcription endpoints with model, prompt, and language', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(
        JSON.stringify({
          text: 'Hello from ASR Studio.',
          language: 'en',
          segments: [{ id: 0, text: 'Hello from ASR Studio.', start: 0, end: 1.5, confidence: 0.98 }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const result = await transcribeWithMainstreamAsr(
      new File(['audio'], 'meeting.wav', { type: 'audio/wav' }),
      'Project name: ASR Studio',
      Language.ENGLISH,
      true,
      {
        model: MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE,
        apiKey: ' openai-key ',
        baseUrl: '',
      },
      new AbortController().signal,
    );

    assert.equal(String(calls[0].input), OPENAI_AUDIO_TRANSCRIPTIONS_URL);
    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer openai-key');
    const body = calls[0].init?.body as FormData;
    assert.equal(body.get('model'), 'gpt-4o-transcribe');
    assert.equal(body.get('language'), 'en');
    assert.equal(body.get('prompt'), 'Project name: ASR Studio');
    assert.equal(body.get('response_format'), 'verbose_json');
    assert.equal(result.transcription, 'Hello from ASR Studio.');
    assert.equal(result.detectedLanguage, 'en');
    assert.deepEqual(result.segments?.[0], {
      id: '0',
      text: 'Hello from ASR Studio.',
      startTime: 0,
      endTime: 1.5,
      confidence: 0.98,
      speaker: undefined,
    });
  });

  test('calls Deepgram listen API with token auth and parses utterance segments', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(
        JSON.stringify({
          results: {
            utterances: [{ transcript: 'Deepgram result', start: 0, end: 2.4, speaker: 1, confidence: 0.91 }],
            channels: [{ alternatives: [{ transcript: 'Deepgram result' }] }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const result = await transcribeWithMainstreamAsr(
      new File(['audio'], 'meeting.wav', { type: 'audio/wav' }),
      '',
      Language.AUTO,
      true,
      {
        model: MainstreamAsrModel.DEEPGRAM_NOVA_3,
        apiKey: 'deepgram-key',
        baseUrl: '',
      },
      new AbortController().signal,
    );

    const url = new URL(String(calls[0].input));
    assert.equal(`${url.origin}${url.pathname}`, DEEPGRAM_LISTEN_URL);
    assert.equal(url.searchParams.get('model'), 'nova-3');
    assert.equal(url.searchParams.get('smart_format'), 'true');
    assert.equal(url.searchParams.get('detect_language'), 'true');
    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Token deepgram-key');
    assert.equal(result.transcription, 'Deepgram result');
    assert.equal(result.segments?.[0].speaker, '1');
  });

  test('uploads local files to AssemblyAI and polls the async transcript', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      const url = String(input);

      if (url.endsWith('/upload')) {
        return new Response(JSON.stringify({ upload_url: 'https://cdn.example.com/audio.wav' }), { status: 200 });
      }

      if (url === ASSEMBLYAI_TRANSCRIPT_URL && init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'transcript-1' }), { status: 200 });
      }

      return new Response(
        JSON.stringify({
          id: 'transcript-1',
          status: 'completed',
          text: 'AssemblyAI result',
          language_code: 'en',
          utterances: [{ text: 'AssemblyAI result', start: 0, end: 1200, speaker: 'A', confidence: 0.95 }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await transcribeWithMainstreamAsr(
      new File(['audio'], 'meeting.wav', { type: 'audio/wav' }),
      '',
      Language.ENGLISH,
      true,
      {
        model: MainstreamAsrModel.ASSEMBLYAI_UNIVERSAL_3_PRO,
        apiKey: 'assembly-key',
        baseUrl: '',
      },
      new AbortController().signal,
    );

    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'assembly-key');
    assert.equal(String(calls[1].input), ASSEMBLYAI_TRANSCRIPT_URL);
    const createBody = JSON.parse(String(calls[1].init?.body));
    assert.equal(createBody.speech_model, 'universal-3-pro');
    assert.equal(createBody.language_code, 'en');
    assert.equal(createBody.format_text, true);
    assert.equal(String(calls[2].input), `${ASSEMBLYAI_TRANSCRIPT_URL}/transcript-1`);
    assert.equal(result.transcription, 'AssemblyAI result');
    assert.equal(result.segments?.[0].endTime, 1.2);
  });

  test('calls ElevenLabs Scribe with xi-api-key auth', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(
        JSON.stringify({
          text: 'ElevenLabs result',
          language_code: 'en',
          words: [{ text: 'ElevenLabs', start: 0, end: 0.7, speaker_id: 'speaker_0', confidence: 0.9 }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const result = await transcribeWithMainstreamAsr(
      new File(['audio'], 'meeting.wav', { type: 'audio/wav' }),
      '',
      Language.ENGLISH,
      false,
      {
        model: MainstreamAsrModel.ELEVENLABS_SCRIBE_V2,
        apiKey: 'eleven-key',
        baseUrl: '',
      },
      new AbortController().signal,
    );

    assert.equal(String(calls[0].input), ELEVENLABS_SPEECH_TO_TEXT_URL);
    assert.equal((calls[0].init?.headers as Record<string, string>)['xi-api-key'], 'eleven-key');
    const body = calls[0].init?.body as FormData;
    assert.equal(body.get('model_id'), 'scribe_v2');
    assert.equal(body.get('language_code'), 'en');
    assert.equal(result.transcription, 'ElevenLabs result');
    assert.equal(result.segments?.[0].speaker, 'speaker_0');
  });
});
