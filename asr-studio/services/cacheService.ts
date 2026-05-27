import type { HistoryItem, TranscriptionResult } from '../types';
import type { BenchmarkExperimentRecord } from './benchmarkTypes';
import { normalizeStoredHistoryItems } from './historyStorage';

const DB_NAME = 'ASR-Cache';
const DB_VERSION = 5;
const TRANSCRIPTIONS_STORE = 'transcriptions';
const RECORDINGS_STORE = 'recordings';
const HISTORY_STORE = 'history';
const BENCHMARK_EXPERIMENTS_STORE = 'benchmark-experiments';
const RECORDING_KEY = 'last-recording';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error ?? new Error('Error opening IndexedDB.'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(TRANSCRIPTIONS_STORE)) {
          db.createObjectStore(TRANSCRIPTIONS_STORE);
        }
        if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
          db.createObjectStore(RECORDINGS_STORE);
        }
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(BENCHMARK_EXPERIMENTS_STORE)) {
          db.createObjectStore(BENCHMARK_EXPERIMENTS_STORE, { keyPath: 'id' });
        }
        if (db.objectStoreNames.contains('notes')) {
          db.deleteObjectStore('notes');
        }
      };
    });
  }
  return dbPromise;
}

// Hashing utility
export async function getFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Transcription Cache
export async function getCachedTranscription(hash: string): Promise<TranscriptionResult | null> {
  let db: IDBDatabase;
  try {
    db = await getDb();
  } catch (error) {
    console.error('Failed to open transcription cache:', error);
    return null;
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(TRANSCRIPTIONS_STORE, 'readonly');
    const store = transaction.objectStore(TRANSCRIPTIONS_STORE);
    const request = store.get(hash);
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      console.error('Failed to get cached transcription:', request.error);
      resolve(null);
    };
  });
}

export async function setCachedTranscription(hash: string, data: TranscriptionResult): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSCRIPTIONS_STORE, 'readwrite');
    const store = transaction.objectStore(TRANSCRIPTIONS_STORE);
    const request = store.put(data, hash);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to set cached transcription:', request.error);
      reject(request.error);
    };
  });
}

// Recording Cache
export async function getCachedRecording(): Promise<File | null> {
  const db = await getDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(RECORDINGS_STORE, 'readonly');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.get(RECORDING_KEY);
    request.onsuccess = () => {
      if (request.result && request.result instanceof File) {
        resolve(request.result);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => {
      console.error('Failed to get cached recording:', request.error);
      resolve(null);
    };
  });
}

export async function setCachedRecording(file: File): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RECORDINGS_STORE, 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.put(file, RECORDING_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to set cached recording:', request.error);
      reject(request.error);
    };
  });
}

export async function clearCachedRecording(): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RECORDINGS_STORE, 'readwrite');
    const store = transaction.objectStore(RECORDINGS_STORE);
    const request = store.delete(RECORDING_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to clear cached recording:', request.error);
      reject(request.error);
    };
  });
}

export async function clearTranscriptionCache(): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSCRIPTIONS_STORE, 'readwrite');
    const store = transaction.objectStore(TRANSCRIPTIONS_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to clear transcription cache:', request.error);
      reject(request.error);
    };
  });
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  } catch (error) {
    console.error('Failed to estimate storage:', error);
    return null;
  }
}

// --- History Functions ---

export async function addHistoryItem(item: HistoryItem): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to add history item:', request.error);
      reject(request.error);
    };
  });
}

export async function getHistory(): Promise<HistoryItem[]> {
  const db = await getDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(HISTORY_STORE, 'readonly');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(normalizeStoredHistoryItems(request.result));
    };
    request.onerror = () => {
      console.error('Failed to get history:', request.error);
      resolve([]);
    };
  });
}

export async function deleteHistoryItem(id: number): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to delete history item:', request.error);
      reject(request.error);
    };
  });
}

export async function clearHistory(): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to clear history:', request.error);
      reject(request.error);
    };
  });
}

export async function addBenchmarkExperiment(item: BenchmarkExperimentRecord): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BENCHMARK_EXPERIMENTS_STORE, 'readwrite');
    const store = transaction.objectStore(BENCHMARK_EXPERIMENTS_STORE);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to add benchmark experiment:', request.error);
      reject(request.error);
    };
  });
}

export async function getBenchmarkExperiments(): Promise<BenchmarkExperimentRecord[]> {
  let db: IDBDatabase;
  try {
    db = await getDb();
  } catch (error) {
    console.error('Failed to open benchmark experiment store:', error);
    return [];
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(BENCHMARK_EXPERIMENTS_STORE, 'readonly');
    const store = transaction.objectStore(BENCHMARK_EXPERIMENTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const records = (request.result || []) as BenchmarkExperimentRecord[];
      resolve(records.sort((left, right) => right.createdAt - left.createdAt));
    };
    request.onerror = () => {
      console.error('Failed to get benchmark experiments:', request.error);
      resolve([]);
    };
  });
}

export async function deleteBenchmarkExperiment(id: number): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BENCHMARK_EXPERIMENTS_STORE, 'readwrite');
    const store = transaction.objectStore(BENCHMARK_EXPERIMENTS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to delete benchmark experiment:', request.error);
      reject(request.error);
    };
  });
}

export async function clearBenchmarkExperiments(): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BENCHMARK_EXPERIMENTS_STORE, 'readwrite');
    const store = transaction.objectStore(BENCHMARK_EXPERIMENTS_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to clear benchmark experiments:', request.error);
      reject(request.error);
    };
  });
}
