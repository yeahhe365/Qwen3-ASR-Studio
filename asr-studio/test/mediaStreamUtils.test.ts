import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { stopMediaStreamTracks } from '../services/mediaStreamUtils.ts';

describe('media stream utilities', () => {
  test('stops every track in a stream-like object', () => {
    let stoppedCount = 0;
    const stream = {
      getTracks: () => [{ stop: () => (stoppedCount += 1) }, { stop: () => (stoppedCount += 1) }],
    };

    stopMediaStreamTracks(stream);

    assert.equal(stoppedCount, 2);
  });

  test('ignores missing streams', () => {
    assert.doesNotThrow(() => stopMediaStreamTracks(null));
    assert.doesNotThrow(() => stopMediaStreamTracks(undefined));
  });
});
