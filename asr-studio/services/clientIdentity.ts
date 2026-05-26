const CLIENT_UID_STORAGE_KEY = 'asr-studio-client-uid';
const FALLBACK_CLIENT_UID = 'asr-studio-web';
const CLIENT_UID_PATTERN = /^asr-studio-[a-zA-Z0-9._-]{8,96}$/;

export const createRequestId = () => {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getClientUid = () => {
  if (typeof window === 'undefined') {
    return FALLBACK_CLIENT_UID;
  }

  try {
    const storage = window.localStorage;
    if (!storage) {
      return FALLBACK_CLIENT_UID;
    }

    const existingUid = storage.getItem(CLIENT_UID_STORAGE_KEY);
    if (existingUid && CLIENT_UID_PATTERN.test(existingUid)) {
      return existingUid;
    }

    const uid = `asr-studio-${createRequestId()}`;
    storage.setItem(CLIENT_UID_STORAGE_KEY, uid);
    return uid;
  } catch {
    return FALLBACK_CLIENT_UID;
  }
};
