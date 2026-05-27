import { CompressionLevel, Language, MainstreamAsrModel, NvidiaNimTask } from './types';

export const languageDisplayNames: Record<Language, string> = {
  [Language.AUTO]: '自动识别',
  [Language.CHINESE]: '中文',
  [Language.ENGLISH]: '英文',
  [Language.JAPANESE]: '日文',
  [Language.KOREAN]: '韩文',
  [Language.SPANISH]: '西班牙文',
  [Language.FRENCH]: '法文',
  [Language.GERMAN]: '德文',
  [Language.ARABIC]: '阿拉伯文',
  [Language.ITALIAN]: '意大利文',
  [Language.RUSSIAN]: '俄文',
  [Language.PORTUGUESE]: '葡萄牙文',
};

export const compressionLevelDisplayNames: Record<CompressionLevel, string> = {
  [CompressionLevel.ORIGINAL]: '原始',
  [CompressionLevel.MEDIUM]: '中等',
  [CompressionLevel.MINIMUM]: '最小',
};

export const nvidiaNimTaskDisplayNames: Record<NvidiaNimTask, string> = {
  [NvidiaNimTask.TRANSCRIBE]: '转写',
  [NvidiaNimTask.TRANSLATE]: '英译',
};

export const mainstreamAsrModelDisplayNames: Record<MainstreamAsrModel, string> = {
  [MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE]: 'OpenAI GPT-4o Transcribe',
  [MainstreamAsrModel.OPENAI_GPT_4O_MINI_TRANSCRIBE]: 'OpenAI GPT-4o Mini',
  [MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE_DIARIZE]: 'OpenAI GPT-4o Diarize',
  [MainstreamAsrModel.OPENAI_WHISPER_1]: 'OpenAI Whisper-1',
  [MainstreamAsrModel.GROQ_WHISPER_LARGE_V3_TURBO]: 'Groq Whisper Turbo',
  [MainstreamAsrModel.GROQ_WHISPER_LARGE_V3]: 'Groq Whisper Large v3',
  [MainstreamAsrModel.GROQ_DISTIL_WHISPER_LARGE_V3_EN]: 'Groq Distil Whisper EN',
  [MainstreamAsrModel.DEEPGRAM_NOVA_3]: 'Deepgram Nova-3',
  [MainstreamAsrModel.DEEPGRAM_NOVA_3_MEDICAL]: 'Deepgram Nova-3 Medical',
  [MainstreamAsrModel.ASSEMBLYAI_UNIVERSAL_3_PRO]: 'AssemblyAI Universal-3 Pro',
  [MainstreamAsrModel.ASSEMBLYAI_UNIVERSAL_2]: 'AssemblyAI Universal-2',
  [MainstreamAsrModel.ELEVENLABS_SCRIBE_V2]: 'ElevenLabs Scribe v2',
  [MainstreamAsrModel.ELEVENLABS_SCRIBE_V1]: 'ElevenLabs Scribe v1',
  [MainstreamAsrModel.MISTRAL_VOXTRAL_MINI_LATEST]: 'Mistral Voxtral Mini',
  [MainstreamAsrModel.FIREWORKS_WHISPER_V3]: 'Fireworks Whisper v3',
  [MainstreamAsrModel.FIREWORKS_WHISPER_V3_TURBO]: 'Fireworks Whisper Turbo',
};
