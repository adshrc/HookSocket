/**
 * HookSocket - Serverless WebSocket-to-HTTP Proxy
 *
 * This Cloudflare Worker + Durable Object setup allows clients to connect via WebSocket to:
 *   - wss://your-domain/websocket/:id       → forwards to https://your-domain/webhook/:id
 *   - wss://your-domain/websocket-test/:id  → forwards to https://your-domain/webhook-test/:id
 *
 * Clients can:
 *   - Send messages through a WebSocket → forwarded to a corresponding HTTP endpoint
 *   - Receive messages via HTTP POST → broadcast to all clients in the matching WebSocket room
 *
 * HookSocket supports webhook forwarding, push notifications, real-time APIs, and more.
 * All room connections are isolated by `:id`, and CORS is enabled.
 *
 * Environment Variables:
 * (All environment variables are optional — defaults are used if not provided)
 * - WS_PATH:         WebSocket path prefix for production (default: '/websocket/')
 * - WS_PATH_TEST:    WebSocket path prefix for test (default: '/websocket-test/')
 * - API_PATH:        HTTP path to forward production messages to (default: '/webhook/')
 * - API_PATH_TEST:   HTTP path to forward test messages to (default: '/webhook-test/')
 * - API_HOST:        Hostname override for HTTP forwarding (default: request host)
 */

const DEFAULT_WS_PATH = '/websocket/';
const DEFAULT_WS_PATH_TEST = '/websocket-test/';
const DEFAULT_API_PATH = '/webhook/';
const DEFAULT_API_PATH_TEST = '/webhook-test/';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/**
 * Durable Object class to manage WebSocket rooms for HookSocket
 */
export class WebSocketRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map(); // socketId -> WebSocket instance
  }

  /**
   * Handle incoming fetch requests (WebSocket upgrade, POST broadcast, or OPTIONS preflight)
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      // Handle CORS preflight requests
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      // Upgrade connection to WebSocket
      const [client, server] = Object.values(new WebSocketPair());
      const socketId = crypto.randomUUID();

      server.accept();
      this.connections.set(socketId, server);

      // When a message is received from a WebSocket client, forward it to the HTTP endpoint
      server.addEventListener('message', ({ data }) => {
        const apiHost = this.env.API_HOST || url.host;
        const apiPath = this.translatePath(path);

        fetch(`https://${apiHost}${apiPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
          .then((res) => this.handleResponse(res))
          .catch((err) => console.error('Error forwarding message:', err));
      });

      server.addEventListener('close', () => {
        // Cleanup when client disconnects
        this.connections.delete(socketId);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'POST') {
      // Broadcast a message to all connected WebSocket clients in this room
      await this.handleResponse(request);
      return new Response(null, { status: 200, headers: CORS_HEADERS });
    }

    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  /**
   * Handles responses from webhook or HTTP POST by broadcasting to all connected clients.
   * Cleans up dead WebSocket connections.
   * @param {Response|Request} obj - The incoming response or request object
   */
  async handleResponse(obj) {
    const contentType = obj.headers?.get?.('content-type') || '';
    const isJson = contentType.includes('application/json');
    const parsedRes = await (isJson ? obj.json() : obj.text());

    // Skip default n8n "Workflow was started" response if needed
    if (parsedRes?.message === 'Workflow was started') return;

    const message = isJson ? JSON.stringify(parsedRes) : parsedRes;

    // Broadcast the message to all connections
    const deadConnections = [];
    for (const [socketId, socket] of this.connections.entries()) {
      try {
        socket.send(message);
      } catch {
        deadConnections.push(socketId); // Collect sockets that failed
      }
    }

    // Clean up dead sockets
    deadConnections.forEach(id => this.connections.delete(id));
  }

  /**
   * Translates the WebSocket path to the corresponding HTTP forwarding path.
   * @param {string} path - Incoming request path
   * @returns {string} Translated path for HTTP forwarding
   */
  translatePath(path) {
    const {
      WS_PATH = DEFAULT_WS_PATH,
      WS_PATH_TEST = DEFAULT_WS_PATH_TEST,
      API_PATH = DEFAULT_API_PATH,
      API_PATH_TEST = DEFAULT_API_PATH_TEST,
    } = this.env;

    if (path.startsWith(WS_PATH_TEST)) {
      return path.replace(WS_PATH_TEST, API_PATH_TEST);
    } else if (path.startsWith(WS_PATH)) {
      return path.replace(WS_PATH, API_PATH);
    }

    throw new Error(`Cannot translate path '${path}'`);
  }
}

/**
 * Cloudflare Worker entrypoint that routes requests to the appropriate WebSocketRoom instance
 */
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const {
      WS_PATH = DEFAULT_WS_PATH,
      WS_PATH_TEST = DEFAULT_WS_PATH_TEST,
    } = env;

    if (!path.startsWith(WS_PATH) && !path.startsWith(WS_PATH_TEST)) {
      return new Response('Invalid WebSocket path', { status: 404 });
    }

    const objId = env.WSROOM.idFromName(path);
    const obj = env.WSROOM.get(objId);
    return obj.fetch(request);
  },
};
