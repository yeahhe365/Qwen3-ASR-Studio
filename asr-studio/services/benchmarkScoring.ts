import type {
  BenchmarkAlignmentOperation,
  BenchmarkAlignmentToken,
  BenchmarkScore,
  BenchmarkScoringOptions,
  BenchmarkTermMetric,
} from './benchmarkTypes';

const DEFAULT_SCORING_OPTIONS: BenchmarkScoringOptions = {
  ignorePunctuation: true,
  normalizeCase: true,
  normalizeItn: true,
};

const punctuationRegex = /[\p{P}\p{S}]/gu;
const cjkRegex = /\p{Script=Han}/u;
const fullWidthOffset = '０'.charCodeAt(0) - '0'.charCodeAt(0);

const normalizeFullWidth = (text: string) => {
  return text.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
};

const normalizeItnText = (text: string) => {
  return normalizeFullWidth(text)
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - fullWidthOffset))
    .replace(/([0-9])[,，](?=[0-9]{3}\b)/g, '$1')
    .replace(/[％﹪]/g, '%')
    .replace(/[＋]/g, '+')
    .replace(/[－]/g, '-');
};

export const normalizeBenchmarkText = (
  text: string,
  options: BenchmarkScoringOptions = DEFAULT_SCORING_OPTIONS,
) => {
  let normalized = text.normalize('NFKC');

  if (options.normalizeItn) {
    normalized = normalizeItnText(normalized);
  }

  if (options.normalizeCase) {
    normalized = normalized.toLocaleLowerCase();
  }

  if (options.ignorePunctuation) {
    normalized = normalized.replace(punctuationRegex, ' ');
  }

  return normalized.replace(/\s+/g, ' ').trim();
};

export const tokenizeWordsForBenchmark = (
  text: string,
  options: BenchmarkScoringOptions = DEFAULT_SCORING_OPTIONS,
) => {
  const normalizedText = normalizeBenchmarkText(text, options);
  if (!normalizedText) {
    return [];
  }

  const tokens: string[] = [];
  let latinBuffer = '';

  const flushLatinBuffer = () => {
    if (latinBuffer) {
      tokens.push(latinBuffer);
      latinBuffer = '';
    }
  };

  for (const char of normalizedText) {
    if (/\s/u.test(char)) {
      flushLatinBuffer();
      continue;
    }

    if (cjkRegex.test(char)) {
      flushLatinBuffer();
      tokens.push(char);
      continue;
    }

    latinBuffer += char;
  }

  flushLatinBuffer();
  return tokens;
};

export const tokenizeCharactersForBenchmark = (
  text: string,
  options: BenchmarkScoringOptions = DEFAULT_SCORING_OPTIONS,
) => {
  return Array.from(normalizeBenchmarkText(text, options).replace(/\s+/g, ''));
};

type AlignmentResult = {
  hits: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  alignment: BenchmarkAlignmentToken[];
};

const operationPriority: Record<BenchmarkAlignmentOperation, number> = {
  equal: 0,
  substitute: 1,
  delete: 2,
  insert: 3,
};

const chooseOperation = (
  candidates: Array<{ cost: number; operation: BenchmarkAlignmentOperation; previous: [number, number] }>,
) => {
  return candidates.sort((left, right) => {
    if (left.cost !== right.cost) {
      return left.cost - right.cost;
    }
    return operationPriority[left.operation] - operationPriority[right.operation];
  })[0];
};

export const alignBenchmarkTokens = (referenceTokens: string[], hypothesisTokens: string[]): AlignmentResult => {
  const rows = referenceTokens.length + 1;
  const columns = hypothesisTokens.length + 1;
  const costs = Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0));
  const backtrace = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ({ operation: 'equal' as BenchmarkAlignmentOperation, previous: [0, 0] })),
  );

  for (let row = 1; row < rows; row += 1) {
    costs[row][0] = row;
    backtrace[row][0] = { operation: 'delete', previous: [row - 1, 0] };
  }

  for (let column = 1; column < columns; column += 1) {
    costs[0][column] = column;
    backtrace[0][column] = { operation: 'insert', previous: [0, column - 1] };
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const isEqual = referenceTokens[row - 1] === hypothesisTokens[column - 1];
      const diagonalOperation: BenchmarkAlignmentOperation = isEqual ? 'equal' : 'substitute';
      const diagonalCost = costs[row - 1][column - 1] + (isEqual ? 0 : 1);
      const selected = chooseOperation([
        { cost: diagonalCost, operation: diagonalOperation, previous: [row - 1, column - 1] },
        { cost: costs[row - 1][column] + 1, operation: 'delete', previous: [row - 1, column] },
        { cost: costs[row][column - 1] + 1, operation: 'insert', previous: [row, column - 1] },
      ]);

      costs[row][column] = selected.cost;
      backtrace[row][column] = selected;
    }
  }

  const alignment: BenchmarkAlignmentToken[] = [];
  let row = referenceTokens.length;
  let column = hypothesisTokens.length;

  while (row > 0 || column > 0) {
    const step = backtrace[row][column];
    const [previousRow, previousColumn] = step.previous;
    const token: BenchmarkAlignmentToken = { operation: step.operation };

    if (step.operation === 'equal' || step.operation === 'substitute') {
      token.reference = referenceTokens[row - 1];
      token.hypothesis = hypothesisTokens[column - 1];
    } else if (step.operation === 'delete') {
      token.reference = referenceTokens[row - 1];
    } else {
      token.hypothesis = hypothesisTokens[column - 1];
    }

    alignment.push(token);
    row = previousRow;
    column = previousColumn;
  }

  alignment.reverse();

  return {
    hits: alignment.filter((item) => item.operation === 'equal').length,
    substitutions: alignment.filter((item) => item.operation === 'substitute').length,
    deletions: alignment.filter((item) => item.operation === 'delete').length,
    insertions: alignment.filter((item) => item.operation === 'insert').length,
    alignment,
  };
};

const createTermMetric = (terms: string[], hypothesis: string, options: BenchmarkScoringOptions): BenchmarkTermMetric => {
  const normalizedTerms = terms
    .map((term) => normalizeBenchmarkText(term, options))
    .filter(Boolean)
    .filter((term, index, allTerms) => allTerms.indexOf(term) === index);

  if (normalizedTerms.length === 0) {
    return {
      total: 0,
      matched: 0,
      recall: null,
    };
  }

  const normalizedHypothesis = normalizeBenchmarkText(hypothesis, options);
  const matched = normalizedTerms.filter((term) => normalizedHypothesis.includes(term)).length;

  return {
    total: normalizedTerms.length,
    matched,
    recall: matched / normalizedTerms.length,
  };
};

export const scoreBenchmarkTranscript = ({
  referenceText,
  hypothesisText,
  keywords = [],
  names = [],
  terms = [],
  options = DEFAULT_SCORING_OPTIONS,
}: {
  referenceText: string;
  hypothesisText: string;
  keywords?: string[];
  names?: string[];
  terms?: string[];
  options?: BenchmarkScoringOptions;
}): BenchmarkScore => {
  const referenceWordTokens = tokenizeWordsForBenchmark(referenceText, options);
  const hypothesisWordTokens = tokenizeWordsForBenchmark(hypothesisText, options);
  const referenceCharacterTokens = tokenizeCharactersForBenchmark(referenceText, options);
  const hypothesisCharacterTokens = tokenizeCharactersForBenchmark(hypothesisText, options);
  const wordAlignment = alignBenchmarkTokens(referenceWordTokens, hypothesisWordTokens);
  const characterAlignment = alignBenchmarkTokens(referenceCharacterTokens, hypothesisCharacterTokens);

  return {
    wer:
      referenceWordTokens.length > 0
        ? (wordAlignment.substitutions + wordAlignment.deletions + wordAlignment.insertions) /
          referenceWordTokens.length
        : null,
    cer:
      referenceCharacterTokens.length > 0
        ? (characterAlignment.substitutions + characterAlignment.deletions + characterAlignment.insertions) /
          referenceCharacterTokens.length
        : null,
    wordHits: wordAlignment.hits,
    wordSubstitutions: wordAlignment.substitutions,
    wordDeletions: wordAlignment.deletions,
    wordInsertions: wordAlignment.insertions,
    referenceWordCount: referenceWordTokens.length,
    characterHits: characterAlignment.hits,
    characterSubstitutions: characterAlignment.substitutions,
    characterDeletions: characterAlignment.deletions,
    characterInsertions: characterAlignment.insertions,
    referenceCharacterCount: referenceCharacterTokens.length,
    wordAlignment: wordAlignment.alignment,
    characterAlignment: characterAlignment.alignment,
    keywordRecall: createTermMetric(keywords, hypothesisText, options),
    nameAccuracy: createTermMetric(names, hypothesisText, options),
    termAccuracy: createTermMetric(terms, hypothesisText, options),
  };
};

export const benchmarkDefaultScoringOptions = DEFAULT_SCORING_OPTIONS;
