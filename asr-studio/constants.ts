export const APP_VERSION = '1.1.0';

export const QWEN_ASR_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
export const QWEN_ASR_MODEL = 'qwen3-asr-flash';
export const QWEN_INLINE_AUDIO_LIMIT_BYTES = 10 * 1024 * 1024;

export const DOUBAO_ASR_SUBMIT_URL = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit';
export const DOUBAO_ASR_QUERY_URL = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query';
export const DOUBAO_ASR_MODEL = 'bigmodel';
export const DOUBAO_ASR_RESOURCE_ID = 'volc.seedasr.auc';
export const DOUBAO_REALTIME_ASR_API_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
export const DOUBAO_REALTIME_ASR_PROXY_PATH = '/doubao-realtime-asr';
export const DOUBAO_REALTIME_ASR_RESOURCE_ID = 'volc.bigasr.sauc.duration';
export const DOUBAO_REALTIME_ASR_SAMPLE_RATE = 16000;

export const GEMINI_ASR_MODEL = 'gemini-3.5-flash';
export const GEMINI_ASR_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_ASR_MODEL}:generateContent`;
export const GEMINI_INLINE_REQUEST_LIMIT_BYTES = 20 * 1024 * 1024;

export const NVIDIA_NIM_ASR_MODEL = 'whisper-large-v3';
export const NVIDIA_HOSTED_GRPC_SERVER = 'grpc.nvcf.nvidia.com:443';
export const NVIDIA_WHISPER_LARGE_V3_FUNCTION_ID = 'b702f636-f60c-4a3d-a6f4-f3568c13bd7d';
export const NVIDIA_NIM_HTTP_BASE_URL_PLACEHOLDER = 'http://0.0.0.0:9000';
export const NVIDIA_NIM_TRANSCRIPTIONS_PATH = '/v1/audio/transcriptions';
export const NVIDIA_NIM_TRANSLATIONS_PATH = '/v1/audio/translations';

export const MAINSTREAM_ASR_MODEL_LIBRARY_NAME = '主流 ASR 模型库';
export const OPENAI_AUDIO_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
export const GROQ_AUDIO_TRANSCRIPTIONS_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
export const MISTRAL_AUDIO_TRANSCRIPTIONS_URL = 'https://api.mistral.ai/v1/audio/transcriptions';
export const FIREWORKS_AUDIO_TRANSCRIPTIONS_URL = 'https://api.fireworks.ai/inference/v1/audio/transcriptions';
export const DEEPGRAM_LISTEN_URL = 'https://api.deepgram.com/v1/listen';
export const ASSEMBLYAI_TRANSCRIPT_URL = 'https://api.assemblyai.com/v2/transcript';
export const ELEVENLABS_SPEECH_TO_TEXT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
export const MAINSTREAM_ASR_CUSTOM_BASE_URL_PLACEHOLDER = 'https://api.example.com/v1/audio/transcriptions';
