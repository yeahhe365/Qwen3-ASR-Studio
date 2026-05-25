import {
  DOUBAO_ASR_MODEL,
  DOUBAO_REALTIME_ASR_PROXY_PATH,
  DOUBAO_REALTIME_ASR_SAMPLE_RATE,
} from '../../constants';

type DoubaoRealtimeAsrConfig = {
  apiKey: string;
  accessKey: string;
};

type DoubaoRealtimeCallbacks = {
  onStatus: (message: string) => void;
  onPartialResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: Error) => void;
};

export type DoubaoRealtimeSession = {
  stop: () => Promise<{ audioFile: File | null; transcription: string }>;
};

const PROTOCOL_VERSION = 0x1;
const HEADER_SIZE = 0x1;

export const DOUBAO_REALTIME_MESSAGE_TYPE = {
  CLIENT_FULL_REQUEST: 0x1,
  CLIENT_AUDIO_ONLY_REQUEST: 0x2,
  SERVER_FULL_RESPONSE: 0x9,
  SERVER_ERROR_RESPONSE: 0xf,
} as const;

export const DOUBAO_REALTIME_MESSAGE_FLAGS = {
  NO_SEQUENCE: 0x0,
  POS_SEQUENCE: 0x1,
  NEG_SEQUENCE: 0x2,
} as const;

export const DOUBAO_REALTIME_SERIALIZATION = {
  NONE: 0x0,
  JSON: 0x1,
} as const;

export const DOUBAO_REALTIME_COMPRESSION = {
  NONE: 0x0,
  GZIP: 0x1,
} as const;

const createHeader = (
  messageType: number,
  messageFlags: number,
  serialization: number,
  compression: number,
) => new Uint8Array([
  (PROTOCOL_VERSION << 4) | HEADER_SIZE,
  (messageType << 4) | messageFlags,
  (serialization << 4) | compression,
  0,
]);

const writeInt32 = (view: DataView, offset: number, value: number) => {
  view.setInt32(offset, value, false);
};

const createMessage = (
  messageType: number,
  messageFlags: number,
  serialization: number,
  compression: number,
  payload: Uint8Array,
  sequence?: number,
) => {
  const hasSequence = sequence !== undefined;
  const header = createHeader(messageType, messageFlags, serialization, compression);
  const buffer = new ArrayBuffer(header.byteLength + (hasSequence ? 4 : 0) + 4 + payload.byteLength);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let offset = 0;

  bytes.set(header, offset);
  offset += header.byteLength;

  if (hasSequence) {
    writeInt32(view, offset, sequence);
    offset += 4;
  }

  writeInt32(view, offset, payload.byteLength);
  offset += 4;
  bytes.set(payload, offset);

  return buffer;
};

const gzip = async (payload: Uint8Array) => {
  const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
};

const gunzip = async (payload: Uint8Array) => {
  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
};

const createFullRequest = async (apiKey: string, enableItn: boolean) => {
  const body = {
    user: {
      uid: apiKey,
    },
    audio: {
      format: 'pcm',
      codec: 'raw',
      rate: DOUBAO_REALTIME_ASR_SAMPLE_RATE,
      bits: 16,
      channel: 1,
    },
    request: {
      model_name: DOUBAO_ASR_MODEL,
      enable_itn: enableItn,
      enable_punc: true,
      show_utterances: true,
    },
  };

  const payload = await gzip(new TextEncoder().encode(JSON.stringify(body)));

  return createMessage(
    DOUBAO_REALTIME_MESSAGE_TYPE.CLIENT_FULL_REQUEST,
    DOUBAO_REALTIME_MESSAGE_FLAGS.POS_SEQUENCE,
    DOUBAO_REALTIME_SERIALIZATION.JSON,
    DOUBAO_REALTIME_COMPRESSION.GZIP,
    payload,
    1,
  );
};

export const createDoubaoRealtimeAudioRequest = async (pcm: Uint8Array, isFinal: boolean) => createMessage(
  DOUBAO_REALTIME_MESSAGE_TYPE.CLIENT_AUDIO_ONLY_REQUEST,
  isFinal ? DOUBAO_REALTIME_MESSAGE_FLAGS.NEG_SEQUENCE : DOUBAO_REALTIME_MESSAGE_FLAGS.NO_SEQUENCE,
  DOUBAO_REALTIME_SERIALIZATION.JSON,
  DOUBAO_REALTIME_COMPRESSION.GZIP,
  await gzip(pcm),
  isFinal ? -1 : undefined,
);

const readInt32 = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(offset, false);

const readPayload = async (bytes: Uint8Array) => {
  if (bytes.byteLength < 8) {
    throw new Error('豆包实时 ASR 返回了不完整的数据包。');
  }

  const headerSize = (bytes[0] & 0x0f) * 4;
  const messageType = bytes[1] >> 4;
  const messageFlags = bytes[1] & 0x0f;
  const serialization = bytes[2] >> 4;
  const compression = bytes[2] & 0x0f;
  let offset = headerSize;
  let sequence: number | undefined;

  if (
    messageFlags === DOUBAO_REALTIME_MESSAGE_FLAGS.POS_SEQUENCE ||
    messageFlags === DOUBAO_REALTIME_MESSAGE_FLAGS.NEG_SEQUENCE
  ) {
    sequence = readInt32(bytes, offset);
    offset += 4;
  }

  if (messageType === DOUBAO_REALTIME_MESSAGE_TYPE.SERVER_ERROR_RESPONSE) {
    const code = readInt32(bytes, offset);
    offset += 4;
    const errorSize = readInt32(bytes, offset);
    offset += 4;
    const errorPayload = bytes.slice(offset, offset + errorSize);
    const errorBytes = compression === DOUBAO_REALTIME_COMPRESSION.GZIP ? await gunzip(errorPayload) : errorPayload;
    const errorMessage = new TextDecoder().decode(errorBytes);
    throw new Error(`豆包实时 ASR 请求失败 (${code})：${errorMessage}`);
  }

  const payloadSize = readInt32(bytes, offset);
  offset += 4;
  const payload = bytes.slice(offset, offset + payloadSize);

  if (
    messageType !== DOUBAO_REALTIME_MESSAGE_TYPE.SERVER_FULL_RESPONSE ||
    serialization !== DOUBAO_REALTIME_SERIALIZATION.JSON
  ) {
    return { sequence, body: null };
  }

  const payloadBytes = compression === DOUBAO_REALTIME_COMPRESSION.GZIP ? await gunzip(payload) : payload;
  const body = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
    result?: {
      text?: string;
      utterances?: Array<{ text?: string; definite?: boolean }>;
    };
  };

  return { sequence, body };
};

type DoubaoRealtimeResponseBody = Awaited<ReturnType<typeof readPayload>>['body'];

export const concatDoubaoRealtimeTextFromResponse = (body: DoubaoRealtimeResponseBody) => {
  const utterances = body?.result?.utterances;
  if (utterances?.length) {
    return utterances
      .map((utterance) => utterance.text?.trim())
      .filter(Boolean)
      .join('');
  }

  return body?.result?.text?.trim() || '';
};

const createProxyUrl = (config: DoubaoRealtimeAsrConfig) => {
  const url = new URL(DOUBAO_REALTIME_ASR_PROXY_PATH, window.location.origin);
  url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('apiKey', config.apiKey.trim());
  if (config.accessKey.trim()) {
    url.searchParams.set('accessKey', config.accessKey.trim());
  }
  return url.toString();
};

const floatToPcm16 = (input: Float32Array, inputSampleRate: number) => {
  const ratio = inputSampleRate / DOUBAO_REALTIME_ASR_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = Math.min(input.length - 1, Math.floor(i * ratio));
    const sample = Math.max(-1, Math.min(1, input[sourceIndex]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return new Uint8Array(output.buffer);
};

const mergeChunks = (chunks: Uint8Array[]) => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
};

const createWavFile = (pcmChunks: Uint8Array[]) => {
  if (!pcmChunks.length) {
    return null;
  }

  const pcm = mergeChunks(pcmChunks);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };
  const byteRate = DOUBAO_REALTIME_ASR_SAMPLE_RATE * 2;

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, DOUBAO_REALTIME_ASR_SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.byteLength, true);

  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('-');

  return new File([header, pcm], `doubao-realtime-${timestamp}.wav`, { type: 'audio/wav' });
};

export const startDoubaoRealtimeTranscription = async (
  enableItn: boolean,
  selectedDeviceId: string,
  config: DoubaoRealtimeAsrConfig,
  callbacks: DoubaoRealtimeCallbacks,
): Promise<DoubaoRealtimeSession> => {
  const apiKey = config.apiKey.trim();

  if (!apiKey) {
    throw new Error('豆包 API Key 未设置。请在设置中配置。');
  }

  if (!navigator.mediaDevices) {
    throw new Error('您的浏览器不支持录音功能。');
  }

  callbacks.onStatus('正在连接豆包实时 ASR...');

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: selectedDeviceId === 'default' ? undefined : { exact: selectedDeviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const socket = new WebSocket(createProxyUrl(config));
  socket.binaryType = 'arraybuffer';

  const opened = await new Promise<void>((resolve, reject) => {
    socket.onopen = () => resolve();
    socket.onerror = () => reject(new Error('无法连接豆包实时 ASR 代理。请确认开发服务器或部署环境已启用 WebSocket 代理。'));
  });

  void opened;
  callbacks.onStatus('正在发送识别配置...');
  socket.send(await createFullRequest(apiKey, enableItn));

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  let stopped = false;
  let latestText = '';
  let lastSendTime = 0;
  const pcmChunks: Uint8Array[] = [];

  const closeEverything = async () => {
    source.disconnect();
    processor.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  };

  socket.onmessage = (event) => {
    try {
      const bytes = new Uint8Array(event.data as ArrayBuffer);
      void readPayload(bytes)
        .then(({ body }) => {
          const text = concatDoubaoRealtimeTextFromResponse(body);
          if (text) {
            latestText = text;
            callbacks.onPartialResult(text);
          }
        })
        .catch((error) => {
          callbacks.onError(error instanceof Error ? error : new Error('解析豆包实时 ASR 响应失败。'));
        });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('解析豆包实时 ASR 响应失败。'));
    }
  };

  socket.onclose = () => {
    if (!stopped) {
      callbacks.onError(new Error('豆包实时 ASR 连接已断开。'));
    }
  };

  processor.onaudioprocess = (event) => {
    if (stopped || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const pcm = floatToPcm16(event.inputBuffer.getChannelData(0), audioContext.sampleRate);
    pcmChunks.push(pcm);
    const now = Date.now();
    if (now - lastSendTime < 100) {
      return;
    }
    lastSendTime = now;
    void createDoubaoRealtimeAudioRequest(pcm, false).then((message) => {
      if (!stopped && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });
    callbacks.onStatus('实时识别中...');
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: async () => {
      if (stopped) {
        return { audioFile: createWavFile(pcmChunks), transcription: latestText };
      }

      stopped = true;
      callbacks.onStatus('正在结束实时识别...');

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(await createDoubaoRealtimeAudioRequest(new Uint8Array(), true));
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        socket.close();
      }

      await closeEverything();
      callbacks.onFinalResult(latestText);

      return {
        audioFile: createWavFile(pcmChunks),
        transcription: latestText,
      };
    },
  };
};
