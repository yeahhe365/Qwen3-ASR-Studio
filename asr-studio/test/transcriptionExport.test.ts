import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createTranscriptExport, getTranscriptExportMimeType } from '../services/transcriptionExport.ts';

describe('createTranscriptExport', () => {
  test('formats SRT timestamps with millisecond carry', () => {
    const content = createTranscriptExport('srt', {
      transcription: 'hello',
      detectedLanguage: 'en',
      segments: [
        {
          id: '1',
          text: 'hello',
          startTime: 1.9996,
          endTime: 2.4996,
        },
      ],
    });

    assert.equal(content, '1\n00:00:02,000 --> 00:00:02,500\nhello');
  });

  test('falls back when subtitle end time is not after start time', () => {
    const content = createTranscriptExport('vtt', {
      transcription: 'line',
      detectedLanguage: 'en',
      segments: [
        {
          id: '1',
          text: 'line',
          startTime: 10,
          endTime: 9,
        },
      ],
    });

    assert.equal(content, 'WEBVTT\n\n00:00:10.000 --> 00:00:13.000\nline');
  });

  test('derives subtitle cues from plain text lines when segments are absent', () => {
    const content = createTranscriptExport('srt', {
      transcription: 'first\n\nsecond',
      detectedLanguage: '',
    });

    assert.equal(
      content,
      ['1\n00:00:00,000 --> 00:00:03,000\nfirst', '2\n00:00:03,000 --> 00:00:06,000\nsecond'].join('\n\n'),
    );
  });

  test('removes blank subtitle cue lines from segment text', () => {
    const content = createTranscriptExport('vtt', {
      transcription: 'ignored fallback text',
      detectedLanguage: 'en',
      segments: [
        {
          id: '1',
          text: ' first line \r\n\r\n second line ',
          startTime: 0,
          endTime: 2,
        },
      ],
    });

    assert.equal(content, 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nfirst line\nsecond line');
  });

  test('uses format-specific MIME types', () => {
    assert.equal(getTranscriptExportMimeType('txt'), 'text/plain;charset=utf-8');
    assert.equal(getTranscriptExportMimeType('md'), 'text/markdown;charset=utf-8');
    assert.equal(getTranscriptExportMimeType('json'), 'application/json;charset=utf-8');
    assert.equal(getTranscriptExportMimeType('srt'), 'application/x-subrip;charset=utf-8');
    assert.equal(getTranscriptExportMimeType('vtt'), 'text/vtt;charset=utf-8');
  });

  test('preserves explicit zero timestamps in JSON exports', () => {
    const content = createTranscriptExport('json', {
      transcription: 'hello',
      detectedLanguage: 'en',
      createdAt: 0,
    });

    assert.equal(JSON.parse(content).createdAt, 0);
  });
});
