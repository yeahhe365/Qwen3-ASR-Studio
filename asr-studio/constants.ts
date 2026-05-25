export const QWEN_ASR_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
export const QWEN_ASR_MODEL = 'qwen3-asr-flash';

export const DOUBAO_ASR_API_URL = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';
export const DOUBAO_ASR_MODEL = 'bigmodel';
export const DOUBAO_ASR_RESOURCE_ID = 'volc.bigasr.auc_turbo';
export const DOUBAO_REALTIME_ASR_API_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
export const DOUBAO_REALTIME_ASR_PROXY_PATH = '/doubao-realtime-asr';
export const DOUBAO_REALTIME_ASR_RESOURCE_ID = 'volc.bigasr.sauc.duration';
export const DOUBAO_REALTIME_ASR_SAMPLE_RATE = 16000;

export const GEMINI_ASR_MODEL = 'gemini-3.5-flash';
export const GEMINI_ASR_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_ASR_MODEL}:generateContent`;

export const PIP_WINDOW_OPTIONS = {
  width: 480,
  height: 70,
} as const;
