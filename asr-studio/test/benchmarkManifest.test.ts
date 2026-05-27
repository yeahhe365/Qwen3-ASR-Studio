import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseBenchmarkManifest } from '../services/benchmarkManifest.ts';

describe('parseBenchmarkManifest', () => {
  test('imports CSV samples with metadata and list fields', () => {
    const result = parseBenchmarkManifest(
      [
        'id,fileName,referenceText,language,domain,duration,speaker,noise,tags,keywords,names,terms',
        'sample-1,audio/a.wav,"Hello, ASR Studio",en,read,00:01:05,spk-1,clean,"clean;short","ASR","Alice","Studio"',
      ].join('\n'),
      'benchmark.csv',
    );

    assert.equal(result.errors.length, 0);
    assert.equal(result.samples.length, 1);
    assert.equal(result.samples[0].id, 'sample-1');
    assert.equal(result.samples[0].fileName, 'audio/a.wav');
    assert.equal(result.samples[0].durationSeconds, 65);
    assert.deepEqual(result.samples[0].tags, ['clean', 'short']);
    assert.deepEqual(result.samples[0].keywords, ['ASR']);
    assert.deepEqual(result.samples[0].names, ['Alice']);
    assert.deepEqual(result.samples[0].terms, ['Studio']);
  });

  test('imports JSONL samples and reports invalid rows', () => {
    const result = parseBenchmarkManifest(
      [
        JSON.stringify({
          id: 'remote-1',
          audioUrl: 'https://example.com/audio.wav',
          referenceText: 'hello world',
          language: 'en',
        }),
        JSON.stringify({ id: 'broken', audioUrl: 'ftp://example.com/a.wav', referenceText: 'bad url' }),
        JSON.stringify({ id: 'missing-reference', fileName: 'a.wav' }),
      ].join('\n'),
      'benchmark.jsonl',
    );

    assert.equal(result.samples.length, 1);
    assert.equal(result.samples[0].audioUrl, 'https://example.com/audio.wav');
    assert.equal(result.errors.length, 2);
    assert.match(result.errors[0].message, /audioUrl/);
    assert.match(result.errors[1].message, /referenceText/);
  });

  test('imports reference segments and speaker turns for timestamp and diarization scoring', () => {
    const result = parseBenchmarkManifest(
      JSON.stringify({
        id: 'meeting-1',
        fileName: 'meeting.wav',
        referenceText: 'hello world',
        referenceSegments: [{ text: 'hello world', startTime: 0, endTime: 1.5, speaker: 'spk1' }],
        speakerTurns: [{ speaker: 'spk1', startTime: 0, endTime: 1.5 }],
      }),
      'benchmark.jsonl',
    );

    assert.equal(result.errors.length, 0);
    assert.equal(result.samples[0].referenceSegments?.[0].startTime, 0);
    assert.equal(result.samples[0].speakerTurns?.[0].speaker, 'spk1');
  });
});
