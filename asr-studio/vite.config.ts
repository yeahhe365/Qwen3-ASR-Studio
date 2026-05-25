import path from 'path';
import { randomUUID } from 'node:crypto';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, type Plugin } from 'vite';
import WebSocket, { WebSocketServer, type RawData } from 'ws';

const DOUBAO_REALTIME_ASR_API_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
const DOUBAO_REALTIME_ASR_PROXY_PATH = '/doubao-realtime-asr';
const DOUBAO_REALTIME_ASR_RESOURCE_ID = 'volc.bigasr.sauc.duration';

const createDoubaoRealtimeProxyPlugin = (): Plugin => ({
  name: 'doubao-realtime-asr-proxy',
  configureServer(server) {
    server.httpServer?.on('upgrade', (request, socket, head) => {
      const requestUrl = new URL(request.url || '/', 'http://localhost');

      if (requestUrl.pathname !== DOUBAO_REALTIME_ASR_PROXY_PATH) {
        return;
      }

      const apiKey = requestUrl.searchParams.get('apiKey') || '';
      const accessKey = requestUrl.searchParams.get('accessKey') || '';

      if (!apiKey) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const client = new WebSocketServer({ noServer: true });

      client.handleUpgrade(request, socket, head, (browserSocket) => {
        const headers: Record<string, string> = {
          'X-Api-Resource-Id': DOUBAO_REALTIME_ASR_RESOURCE_ID,
          'X-Api-Request-Id': randomUUID(),
          'X-Api-Connect-Id': randomUUID(),
        };

        if (accessKey) {
          headers['X-Api-App-Key'] = apiKey;
          headers['X-Api-Access-Key'] = accessKey;
        } else {
          headers['X-Api-Key'] = apiKey;
        }

        const doubaoSocket = new WebSocket(DOUBAO_REALTIME_ASR_API_URL, { headers });
        const pendingMessages: Array<{ data: RawData; isBinary: boolean }> = [];

        const closePair = () => {
          if (browserSocket.readyState === WebSocket.OPEN) {
            browserSocket.close();
          }
          if (doubaoSocket.readyState === WebSocket.OPEN) {
            doubaoSocket.close();
          }
        };

        browserSocket.on('message', (data: RawData, isBinary) => {
          if (doubaoSocket.readyState === WebSocket.OPEN) {
            doubaoSocket.send(data, { binary: isBinary });
          } else if (doubaoSocket.readyState === WebSocket.CONNECTING) {
            pendingMessages.push({ data, isBinary });
          }
        });

        doubaoSocket.on('open', () => {
          while (pendingMessages.length > 0 && doubaoSocket.readyState === WebSocket.OPEN) {
            const message = pendingMessages.shift();
            if (message) {
              doubaoSocket.send(message.data, { binary: message.isBinary });
            }
          }
        });

        doubaoSocket.on('message', (data: RawData, isBinary) => {
          if (browserSocket.readyState === WebSocket.OPEN) {
            browserSocket.send(data, { binary: isBinary });
          }
        });

        browserSocket.on('close', closePair);
        browserSocket.on('error', closePair);
        doubaoSocket.on('close', closePair);
        doubaoSocket.on('error', closePair);
      });
    });
  },
});

export default defineConfig({
  plugins: [basicSsl(), createDoubaoRealtimeProxyPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
