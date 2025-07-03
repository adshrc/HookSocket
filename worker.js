/**
 * HookSocket - Serverless WebSocket-to-HTTP Proxy
 *
 * This Cloudflare Worker + Durable Object setup allows clients to connect via WebSocket to:
 *   - wss://your-worker/websocket/<roomId>       → forwards to https://your-worker/webhook/<roomId>
 *
 * Clients can:
 *   - Send messages through the WebSocket → forwarded to the corresponding n8n webhook
 *   - Receive messages via HTTP POST → broadcast to all clients in the matching WebSocket room
 *
 * All room connections are isolated by `<roomId>`, and CORS is enabled.
 *
 * Environment Variables:
 * (All environment variables are optional — defaults are used if not provided)
 * - WS_PATH:        WebSocket path prefix for production (default: '/websocket')
 * - WH_PATH:        API path to forward production WebSocket messages to (default: '/webhook')
 * - WH_HOST:        (optional) Hostname override for webhook forwarding (default: request host)
 */
const DEFAULT_WS_PATH = '/websocket';
const DEFAULT_WH_PATH = '/webhook';
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
};

/**
 * Durable Object class to manage WebSocket rooms
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
            return new Response(null, {status: 204, headers: CORS_HEADERS});
        }

        if (request.headers.get('Upgrade') === 'websocket') {
            // Upgrade connection to WebSocket
            const [client, server] = Object.values(new WebSocketPair());
            const socketId = crypto.randomUUID();

            server.accept();
            this.connections.set(socketId, server);

            // Start sending periodic pings to keep the connection alive
            this.startPing(server, socketId);

            // When a message is received from a WebSocket client
            server.addEventListener('message', ({data}) => {
                const apiHost = this.env.WH_HOST || url.host;
                const apiPath = this.translatePath(path);

                fetch(`https://${apiHost}${apiPath}`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data),
                })
                    .then((res) => this.handleResponse(res))
                    .catch((err) => console.error('Error forwarding message:', err));
            });

            server.addEventListener('close', () => {
                // Cleanup when client disconnects
                this.connections.delete(socketId);
            });

            return new Response(null, {status: 101, webSocket: client});
        }

        if (request.method === 'POST') {
            // Send a message to all connected WebSocket clients
            await this.handleResponse(request);
            return new Response(null, {status: 200, headers: CORS_HEADERS});
        }

        return new Response('Method Not Allowed', {status: 405, headers: CORS_HEADERS});
    }

    /**
     * Forwards the incoming Webhook payload to all connected WebSocket clients.
     * Cleans up dead WebSocket connections.
     * @param {Response|Request} obj - The incoming response or request object
     */
    async handleResponse(obj) {
        const contentType = obj.headers?.get?.('content-type') || '';
        const isJson = contentType.includes('application/json');
        const parsedRes = await (isJson ? obj.json() : obj.text());

        // Skip default n8n "Workflow was started" response
        if (parsedRes?.message === 'Workflow was started') return;

        const message = isJson ? JSON.stringify(parsedRes) : parsedRes;

        // Send the message to all connections
        const deadConnections = [];
        for (const [socketId, socket] of this.connections.entries()) {
            try {
                socket.send(message);
            } catch {
                deadConnections.push(socketId); // Collect sockets that failed
            }
        }

        // Clean up dead sockets
        deadConnections.forEach((id) => this.connections.delete(id));
    }

    /**
     * Starts sending periodic ping messages to keep the WebSocket connection alive.
     * Cleans up the connection if sending a ping fails.
     * @param {WebSocket} socket - The WebSocket connection
     * @param {string} socketId - The unique ID associated with the WebSocket
     */
    startPing(socket, socketId) {
        const interval = setInterval(() => {
            try {
                socket.send('ping');
            } catch {
                clearInterval(interval);
                this.connections.delete(socketId);
            }
        }, 30000); // Send a ping every 30 seconds

        socket.addEventListener('close', () => clearInterval(interval));
    }

    /**
     * Translates the WebSocket path to the corresponding Webhook path.
     * @param {string} path - Incoming request path
     * @returns {string} Translated path for webhook forwarding
     */
    translatePath(path) {
        const {
            WS_PATH = DEFAULT_WS_PATH,
            WH_PATH = DEFAULT_WH_PATH,
        } = this.env;

        if (path.startsWith(WH_PATH)) {
            return path.replace(WH_PATH, WS_PATH);
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
            WS_PATH = DEFAULT_WS_PATH
        } = env;

        if (WS_PATH && !path.startsWith(WS_PATH)) {
            return new Response('Invalid WebSocket path', {status: 404});
        }

        const objId = env.WSROOM.idFromName(path);
        const obj = env.WSROOM.get(objId);
        return obj.fetch(request);
    },
};
