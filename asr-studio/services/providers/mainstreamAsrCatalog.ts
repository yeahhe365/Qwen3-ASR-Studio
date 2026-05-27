import {
  ASSEMBLYAI_TRANSCRIPT_URL,
  DEEPGRAM_LISTEN_URL,
  ELEVENLABS_SPEECH_TO_TEXT_URL,
  FIREWORKS_AUDIO_TRANSCRIPTIONS_URL,
  GROQ_AUDIO_TRANSCRIPTIONS_URL,
  MAINSTREAM_ASR_CUSTOM_BASE_URL_PLACEHOLDER,
  MISTRAL_AUDIO_TRANSCRIPTIONS_URL,
  OPENAI_AUDIO_TRANSCRIPTIONS_URL,
} from '../../constants';
import { MainstreamAsrModel } from '../../types';

export type MainstreamAsrVendor =
  | 'openai'
  | 'groq'
  | 'deepgram'
  | 'assemblyai'
  | 'elevenlabs'
  | 'mistral'
  | 'fireworks';

export type MainstreamAsrTransport = 'openai-compatible' | 'deepgram' | 'assemblyai' | 'elevenlabs';

export type MainstreamAsrModelDescriptor = {
  model: MainstreamAsrModel;
  vendor: MainstreamAsrVendor;
  transport: MainstreamAsrTransport;
  label: string;
  modelName: string;
  endpoint: string;
  authHeader: 'bearer' | 'token' | 'plain-authorization' | 'api-key' | 'xi-api-key';
  capability: string;
  notes: string;
  supportsLanguage: boolean;
  supportsPrompt: boolean;
  supportsItn: boolean;
  supportsSegments: boolean;
  requiresEnglish?: boolean;
  baseUrlPlaceholder?: string;
};

export const mainstreamAsrModelDescriptors: Record<MainstreamAsrModel, MainstreamAsrModelDescriptor> = {
  [MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE]: {
    model: MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE,
    vendor: 'openai',
    transport: 'openai-compatible',
    label: 'OpenAI GPT-4o Transcribe',
    modelName: 'gpt-4o-transcribe',
    endpoint: OPENAI_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '高精度通用转写',
    notes: 'OpenAI 官方转写模型，适合多语言与通用会议场景。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.OPENAI_GPT_4O_MINI_TRANSCRIBE]: {
    model: MainstreamAsrModel.OPENAI_GPT_4O_MINI_TRANSCRIBE,
    vendor: 'openai',
    transport: 'openai-compatible',
    label: 'OpenAI GPT-4o Mini Transcribe',
    modelName: 'gpt-4o-mini-transcribe',
    endpoint: OPENAI_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '低延迟低成本转写',
    notes: 'OpenAI 官方轻量转写模型，适合高吞吐与成本敏感场景。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE_DIARIZE]: {
    model: MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE_DIARIZE,
    vendor: 'openai',
    transport: 'openai-compatible',
    label: 'OpenAI GPT-4o Transcribe Diarize',
    modelName: 'gpt-4o-transcribe-diarize',
    endpoint: OPENAI_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '说话人分离转写',
    notes: 'OpenAI 带 diarization 的转写模型，返回结构化响应时会尝试映射 speaker。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.OPENAI_WHISPER_1]: {
    model: MainstreamAsrModel.OPENAI_WHISPER_1,
    vendor: 'openai',
    transport: 'openai-compatible',
    label: 'OpenAI Whisper-1',
    modelName: 'whisper-1',
    endpoint: OPENAI_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '经典 Whisper API',
    notes: 'OpenAI Whisper-1 兼容 verbose_json、segments 与 prompt。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.GROQ_WHISPER_LARGE_V3_TURBO]: {
    model: MainstreamAsrModel.GROQ_WHISPER_LARGE_V3_TURBO,
    vendor: 'groq',
    transport: 'openai-compatible',
    label: 'Groq Whisper Large v3 Turbo',
    modelName: 'whisper-large-v3-turbo',
    endpoint: GROQ_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '高速 Whisper 转写',
    notes: 'Groq OpenAI-compatible Speech API，适合低延迟批量转写。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.GROQ_WHISPER_LARGE_V3]: {
    model: MainstreamAsrModel.GROQ_WHISPER_LARGE_V3,
    vendor: 'groq',
    transport: 'openai-compatible',
    label: 'Groq Whisper Large v3',
    modelName: 'whisper-large-v3',
    endpoint: GROQ_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '高精度 Whisper 转写',
    notes: 'Groq 托管 Whisper Large v3，兼容 OpenAI multipart 请求。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.GROQ_DISTIL_WHISPER_LARGE_V3_EN]: {
    model: MainstreamAsrModel.GROQ_DISTIL_WHISPER_LARGE_V3_EN,
    vendor: 'groq',
    transport: 'openai-compatible',
    label: 'Groq Distil Whisper Large v3 EN',
    modelName: 'distil-whisper-large-v3-en',
    endpoint: GROQ_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '英文高速转写',
    notes: 'Groq 英文优化模型；非英文音频建议换用 whisper-large-v3 或 turbo。',
    supportsLanguage: false,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
    requiresEnglish: true,
  },
  [MainstreamAsrModel.DEEPGRAM_NOVA_3]: {
    model: MainstreamAsrModel.DEEPGRAM_NOVA_3,
    vendor: 'deepgram',
    transport: 'deepgram',
    label: 'Deepgram Nova-3',
    modelName: 'nova-3',
    endpoint: DEEPGRAM_LISTEN_URL,
    authHeader: 'token',
    capability: '实时/离线通用 ASR',
    notes: 'Deepgram Nova-3，支持 smart_format、utterances 与 paragraphs。',
    supportsLanguage: true,
    supportsPrompt: false,
    supportsItn: true,
    supportsSegments: true,
  },
  [MainstreamAsrModel.DEEPGRAM_NOVA_3_MEDICAL]: {
    model: MainstreamAsrModel.DEEPGRAM_NOVA_3_MEDICAL,
    vendor: 'deepgram',
    transport: 'deepgram',
    label: 'Deepgram Nova-3 Medical',
    modelName: 'nova-3-medical',
    endpoint: DEEPGRAM_LISTEN_URL,
    authHeader: 'token',
    capability: '医疗语音识别',
    notes: 'Deepgram 医疗场景模型，适合临床术语与医患对话。',
    supportsLanguage: true,
    supportsPrompt: false,
    supportsItn: true,
    supportsSegments: true,
  },
  [MainstreamAsrModel.ASSEMBLYAI_UNIVERSAL_3_PRO]: {
    model: MainstreamAsrModel.ASSEMBLYAI_UNIVERSAL_3_PRO,
    vendor: 'assemblyai',
    transport: 'assemblyai',
    label: 'AssemblyAI Universal-3 Pro',
    modelName: 'universal-3-pro',
    endpoint: ASSEMBLYAI_TRANSCRIPT_URL,
    authHeader: 'plain-authorization',
    capability: '高精度异步转写',
    notes: 'AssemblyAI Universal-3 Pro，使用 upload_url + transcript 任务轮询。',
    supportsLanguage: true,
    supportsPrompt: false,
    supportsItn: true,
    supportsSegments: true,
  },
  [MainstreamAsrModel.ASSEMBLYAI_UNIVERSAL_2]: {
    model: MainstreamAsrModel.ASSEMBLYAI_UNIVERSAL_2,
    vendor: 'assemblyai',
    transport: 'assemblyai',
    label: 'AssemblyAI Universal-2',
    modelName: 'universal-2',
    endpoint: ASSEMBLYAI_TRANSCRIPT_URL,
    authHeader: 'plain-authorization',
    capability: '成熟异步转写',
    notes: 'AssemblyAI Universal-2，保留兼容已有工作流。',
    supportsLanguage: true,
    supportsPrompt: false,
    supportsItn: true,
    supportsSegments: true,
  },
  [MainstreamAsrModel.ELEVENLABS_SCRIBE_V2]: {
    model: MainstreamAsrModel.ELEVENLABS_SCRIBE_V2,
    vendor: 'elevenlabs',
    transport: 'elevenlabs',
    label: 'ElevenLabs Scribe v2',
    modelName: 'scribe_v2',
    endpoint: ELEVENLABS_SPEECH_TO_TEXT_URL,
    authHeader: 'xi-api-key',
    capability: '多语言转写',
    notes: 'ElevenLabs Scribe v2，返回 words 时会映射到词级片段。',
    supportsLanguage: true,
    supportsPrompt: false,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.ELEVENLABS_SCRIBE_V1]: {
    model: MainstreamAsrModel.ELEVENLABS_SCRIBE_V1,
    vendor: 'elevenlabs',
    transport: 'elevenlabs',
    label: 'ElevenLabs Scribe v1',
    modelName: 'scribe_v1',
    endpoint: ELEVENLABS_SPEECH_TO_TEXT_URL,
    authHeader: 'xi-api-key',
    capability: '多语言转写',
    notes: 'ElevenLabs Scribe v1，兼容其 speech-to-text multipart API。',
    supportsLanguage: true,
    supportsPrompt: false,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.MISTRAL_VOXTRAL_MINI_LATEST]: {
    model: MainstreamAsrModel.MISTRAL_VOXTRAL_MINI_LATEST,
    vendor: 'mistral',
    transport: 'openai-compatible',
    label: 'Mistral Voxtral Mini Latest',
    modelName: 'voxtral-mini-latest',
    endpoint: MISTRAL_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: 'Voxtral 音频理解/转写',
    notes: 'Mistral Voxtral 转写 API，按 OpenAI-compatible multipart 发送。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
  },
  [MainstreamAsrModel.FIREWORKS_WHISPER_V3]: {
    model: MainstreamAsrModel.FIREWORKS_WHISPER_V3,
    vendor: 'fireworks',
    transport: 'openai-compatible',
    label: 'Fireworks Whisper v3',
    modelName: 'whisper-v3',
    endpoint: FIREWORKS_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '托管 Whisper v3',
    notes: 'Fireworks OpenAI-compatible audio transcription。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
    baseUrlPlaceholder: MAINSTREAM_ASR_CUSTOM_BASE_URL_PLACEHOLDER,
  },
  [MainstreamAsrModel.FIREWORKS_WHISPER_V3_TURBO]: {
    model: MainstreamAsrModel.FIREWORKS_WHISPER_V3_TURBO,
    vendor: 'fireworks',
    transport: 'openai-compatible',
    label: 'Fireworks Whisper v3 Turbo',
    modelName: 'whisper-v3-turbo',
    endpoint: FIREWORKS_AUDIO_TRANSCRIPTIONS_URL,
    authHeader: 'bearer',
    capability: '高速托管 Whisper',
    notes: 'Fireworks Whisper v3 Turbo，适合更低延迟的通用转写。',
    supportsLanguage: true,
    supportsPrompt: true,
    supportsItn: false,
    supportsSegments: true,
    baseUrlPlaceholder: MAINSTREAM_ASR_CUSTOM_BASE_URL_PLACEHOLDER,
  },
};

export const mainstreamAsrModelOrder = Object.values(MainstreamAsrModel);

export const getMainstreamAsrModelDescriptor = (model: MainstreamAsrModel) => {
  return (
    mainstreamAsrModelDescriptors[model] ?? mainstreamAsrModelDescriptors[MainstreamAsrModel.OPENAI_GPT_4O_TRANSCRIBE]
  );
};
