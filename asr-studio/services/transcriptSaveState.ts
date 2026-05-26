export type TranscriptSaveState = 'saved' | 'dirty' | 'detached';

type GetTranscriptSaveStateOptions = {
  hasTranscription: boolean;
  hasActiveHistoryItem: boolean;
  isDirty: boolean;
};

export const getTranscriptSaveState = ({
  hasTranscription,
  hasActiveHistoryItem,
  isDirty,
}: GetTranscriptSaveStateOptions): TranscriptSaveState | null => {
  if (!hasTranscription) {
    return null;
  }

  if (!hasActiveHistoryItem) {
    return 'detached';
  }

  return isDirty ? 'dirty' : 'saved';
};

export const isTranscriptSavePending = (state: TranscriptSaveState | null | undefined) => {
  return state === 'dirty' || state === 'detached';
};

export const getTranscriptSaveStatusLabel = (state: TranscriptSaveState | null | undefined) => {
  if (state === 'dirty') {
    return '有未保存修改';
  }

  if (state === 'detached') {
    return '尚未保存到历史';
  }

  if (state === 'saved') {
    return '已保存';
  }

  return '';
};

export const getTranscriptSaveButtonLabel = (state: TranscriptSaveState | null | undefined) => {
  if (state === 'saved') {
    return '已保存';
  }

  if (state === 'detached') {
    return '另存';
  }

  return '保存';
};

export const getTranscriptSaveButtonTitle = (state: TranscriptSaveState | null | undefined) => {
  if (state === 'saved') {
    return '已保存到历史记录';
  }

  if (state === 'detached') {
    return '另存为新的历史记录';
  }

  return '保存到历史记录';
};
