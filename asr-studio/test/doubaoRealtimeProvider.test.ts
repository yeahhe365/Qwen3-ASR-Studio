import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { describe, test } from 'node:test';

import {
  concatDoubaoRealtimeTextFromResponse,
  createDoubaoRealtimeAudioRequest,
  DOUBAO_REALTIME_COMPRESSION,
  DOUBAO_REALTIME_MESSAGE_FLAGS,
  DOUBAO_REALTIME_MESSAGE_TYPE,
  DOUBAO_REALTIME_SERIALIZATION,
} from '../services/providers/doubaoRealtimeProvider.ts';

const parseClientFrame = (frame: ArrayBuffer) => {
  const bytes = new Uint8Array(frame);
  const view = new DataView(frame);
  const headerSize = (bytes[0] & 0x0f) * 4;
  const messageType = bytes[1] >> 4;
  const messageFlags = bytes[1] & 0x0f;
  const serialization = bytes[2] >> 4;
  const compression = bytes[2] & 0x0f;
  let offset = headerSize;

  if (
    messageFlags === DOUBAO_REALTIME_MESSAGE_FLAGS.POS_SEQUENCE ||
    messageFlags === DOUBAO_REALTIME_MESSAGE_FLAGS.NEG_SEQUENCE
  ) {
    offset += 4;
  }

  const payloadSize = view.getInt32(offset, false);
  offset += 4;
  const payload = bytes.slice(offset, offset + payloadSize);

  return {
    messageType,
    messageFlags,
    serialization,
    compression,
    payload: Buffer.from(payload),
  };
};

describe('Doubao realtime ASR protocol', () => {
  test('packs audio chunks as gzip-compressed binary frames', async () => {
    const pcm = new Uint8Array([1, 2, 3, 4]);
    const frame = await createDoubaoRealtimeAudioRequest(pcm, false);
    const parsed = parseClientFrame(frame);

    assert.equal(parsed.messageType, DOUBAO_REALTIME_MESSAGE_TYPE.CLIENT_AUDIO_ONLY_REQUEST);
    assert.equal(parsed.messageFlags, DOUBAO_REALTIME_MESSAGE_FLAGS.NO_SEQUENCE);
    assert.equal(parsed.serialization, DOUBAO_REALTIME_SERIALIZATION.JSON);
    assert.equal(parsed.compression, DOUBAO_REALTIME_COMPRESSION.GZIP);
    assert.deepEqual(new Uint8Array(gunzipSync(parsed.payload)), pcm);
  });

  test('marks the final audio frame with negative sequence flag and empty gzip payload', async () => {
    const frame = await createDoubaoRealtimeAudioRequest(new Uint8Array(), true);
    const parsed = parseClientFrame(frame);

    assert.equal(parsed.messageType, DOUBAO_REALTIME_MESSAGE_TYPE.CLIENT_AUDIO_ONLY_REQUEST);
    assert.equal(parsed.messageFlags, DOUBAO_REALTIME_MESSAGE_FLAGS.NEG_SEQUENCE);
    assert.equal(parsed.compression, DOUBAO_REALTIME_COMPRESSION.GZIP);
    assert.equal(gunzipSync(parsed.payload).byteLength, 0);
  });

  test('concatenates utterance text before falling back to result text', () => {
    assert.equal(concatDoubaoRealtimeTextFromResponse({
      result: {
        text: '整句文本',
        utterances: [
          { text: '你好', definite: true },
          { text: '世界', definite: true },
        ],
      },
    }), '你好世界');

    assert.equal(concatDoubaoRealtimeTextFromResponse({
      result: {
        text: '整句文本',
      },
    }), '整句文本');
  });
});
