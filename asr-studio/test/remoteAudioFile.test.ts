import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createRemoteAudioFile,
  getAudioSourceUrl,
  getFileNameFromRemoteAudioUrl,
  isServerAccessibleHttpUrl,
  isValidHttpUrl,
  parseHttpUrl,
} from '../services/remoteAudioFile.ts';

describe('remote audio files', () => {
  test('validates only HTTP and HTTPS URLs', () => {
    assert.equal(isValidHttpUrl('https://example.com/audio.wav'), true);
    assert.equal(isValidHttpUrl(' http://localhost:8080/audio.wav '), true);
    assert.equal(isValidHttpUrl('ftp://example.com/audio.wav'), false);
    assert.equal(isValidHttpUrl('example.com/audio.wav'), false);
    assert.equal(parseHttpUrl('not a url'), null);
  });

  test('distinguishes server-accessible HTTP URLs from local or private addresses', () => {
    assert.equal(isServerAccessibleHttpUrl('https://example.com/audio.wav'), true);
    assert.equal(isServerAccessibleHttpUrl('https://fc.example.com/audio.wav'), true);
    assert.equal(isServerAccessibleHttpUrl('http://8.8.8.8/audio.wav'), true);
    assert.equal(isServerAccessibleHttpUrl('https://localhost/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('https://studio.local/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('http://127.0.0.1/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('http://10.0.0.5/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('http://100.64.0.5/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('http://172.20.0.5/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('http://192.168.1.20/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('http://198.51.100.2/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('http://224.0.0.1/audio.wav'), false);
    assert.equal(isServerAccessibleHttpUrl('http://[::1]/audio.wav'), false);
  });

  test('extracts safe file names from remote URL paths', () => {
    assert.equal(
      getFileNameFromRemoteAudioUrl('https://example.com/audio/meeting%20notes.wav?token=secret'),
      'meeting notes.wav',
    );
    assert.equal(getFileNameFromRemoteAudioUrl('https://example.com/audio/%E0%A4%A.wav'), '%E0%A4%A.wav');
    assert.equal(getFileNameFromRemoteAudioUrl('https://example.com/audio/'), 'remote-audio');
    assert.equal(getFileNameFromRemoteAudioUrl('not a url'), 'remote-audio');
  });

  test('creates file-like remote audio handles', () => {
    const file = createRemoteAudioFile(' https://example.com/audio/meeting.wav?token=secret ');

    assert.equal(file.name, 'meeting.wav');
    assert.equal(file.size, 0);
    assert.equal(getAudioSourceUrl(file), 'https://example.com/audio/meeting.wav?token=secret');
  });
});
