import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { scoreBenchmarkTranscript } from '../services/benchmarkScoring.ts';

describe('scoreBenchmarkTranscript', () => {
  test('scores word insertions and creates diff alignment', () => {
    const score = scoreBenchmarkTranscript({
      referenceText: 'hello world',
      hypothesisText: 'hello brave world',
      options: {
        ignorePunctuation: true,
        normalizeCase: true,
        normalizeItn: true,
      },
    });

    assert.equal(score.wordInsertions, 1);
    assert.equal(score.wordSubstitutions, 0);
    assert.equal(score.wordDeletions, 0);
    assert.equal(score.wer, 0.5);
    assert.equal(score.wordAlignment[1].operation, 'insert');
  });

  test('supports punctuation-sensitive and case-normalized modes', () => {
    const normalizedScore = scoreBenchmarkTranscript({
      referenceText: 'Hello, World!',
      hypothesisText: 'hello world',
      options: {
        ignorePunctuation: true,
        normalizeCase: true,
        normalizeItn: true,
      },
    });
    const sensitiveScore = scoreBenchmarkTranscript({
      referenceText: 'Hello, World!',
      hypothesisText: 'hello world',
      options: {
        ignorePunctuation: false,
        normalizeCase: true,
        normalizeItn: true,
      },
    });

    assert.equal(normalizedScore.wer, 0);
    assert.notEqual(sensitiveScore.wer, 0);
  });

  test('scores CJK character errors and term recall', () => {
    const score = scoreBenchmarkTranscript({
      referenceText: '你好世界',
      hypothesisText: '你好世',
      keywords: ['你好'],
      names: ['张三'],
      terms: ['世界'],
      options: {
        ignorePunctuation: true,
        normalizeCase: true,
        normalizeItn: true,
      },
    });

    assert.equal(score.characterDeletions, 1);
    assert.equal(score.cer, 0.25);
    assert.equal(score.keywordRecall.recall, 1);
    assert.equal(score.nameAccuracy.recall, 0);
    assert.equal(score.termAccuracy.recall, 0);
  });
});
