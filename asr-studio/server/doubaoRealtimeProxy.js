import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import WebSocket, { WebSocketServer } from 'ws';

const listenPort = Number(process.env.PORT || 8787);
const doubaoRealtimeUrl = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
const proxyPath = '/doubao-realtime-asr';
const resourceId = 'volc.bigasr.sauc.duration';

const server = createServer((_request, response) => {
  response.writeHead(404);
  response.end('Not found');
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname !== proxyPath) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  const apiKey = requestUrl.searchParams.get('apiKey') || process.env.DOUBAO_API_KEY || '';
  const accessKey = requestUrl.searchParams.get('accessKey') || process.env.DOUBAO_ACCESS_KEY || '';

  if (!apiKey) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (browserSocket) => {
    const headers = {
      'X-Api-Resource-Id': resourceId,
      'X-Api-Request-Id': randomUUID(),
      'X-Api-Connect-Id': randomUUID(),
      ...(accessKey
        ? {
          'X-Api-App-Key': apiKey,
          'X-Api-Access-Key': accessKey,
        }
        : {
          'X-Api-Key': apiKey,
        }),
    };

    const doubaoSocket = new WebSocket(doubaoRealtimeUrl, { headers });
    const pendingMessages = [];

    const closePair = () => {
      if (browserSocket.readyState === WebSocket.OPEN) {
        browserSocket.close();
      }
      if (doubaoSocket.readyState === WebSocket.OPEN) {
        doubaoSocket.close();
      }
    };

    browserSocket.on('message', (data, isBinary) => {
      if (doubaoSocket.readyState === WebSocket.OPEN) {
        doubaoSocket.send(data, { binary: isBinary });
      } else if (doubaoSocket.readyState === WebSocket.CONNECTING) {
        pendingMessages.push({ data, isBinary });
      }
    });

    doubaoSocket.on('open', () => {
      while (pendingMessages.length > 0 && doubaoSocket.readyState === WebSocket.OPEN) {
        const message = pendingMessages.shift();
        doubaoSocket.send(message.data, { binary: message.isBinary });
      }
    });

    doubaoSocket.on('message', (data, isBinary) => {
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

server.listen(listenPort, () => {
  console.log(`Doubao realtime ASR proxy listening on ws://localhost:${listenPort}${proxyPath}`);
});
