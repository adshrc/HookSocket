# HookSocket

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adshrc/HookSocket)

> **HookSocket** — A serverless WebSocket-to-HTTP bridge for real-time automations, chatbots, IoT, and more. Powered by Cloudflare Workers.

---

## ✨ What is HookSocket?

**HookSocket** is a lightweight, serverless WebSocket bridge that forwards WebSocket messages to HTTP endpoints (like webhooks) — and vice versa.

- Enables full **WebSocket support** in tools like **n8n**, **Make.com** or **Zapier** but also for any other custom Server implementation
- Works **serverlessly on Cloudflare Workers** (free, scalable, no infra to manage).
- Real-time 2-way communication with **dynamic WebSocket rooms**, isolated by `<roomId>`.

Perfect for building chatbot frontends, real-time dashboards, alerts, and more — using webhook-based backends.

---

## 🚀 How It Works

HookSocket enables **two-way communication**:

### 1. WebSocket ➡️ Webhook URL

The WebSocket Client sends a message → HookSocket forwards it to a Webhook URL.

```
 WebSocket Client
        |
        |  {"msg": Hello!"} [Message to wss://hooksocket.workers.dev/websocket/<roomId>]
        ↓
   HookSocket
        |
        |  {"msg": Hello!"} [POST to https://your-webhook.com/webhook/<roomId>]
        ↓
 Your Webhook URL
```

> ⚠️ Note that the Payload will be forwarded as is, no modifications will be made.

---

### 2. Your Workflow/Server ➡️ WebSocket

Your Workflow/Server sends an HTTP POST → HookSocket forwards it to the WebSocket client(s).

```
Your Workflow/Server
         |
         |  {"msg": "How are you?"} [POST to https://hooksocket.workers.dev/webhook/<roomId>]
         ↓
   HookSocket
        |
        |  {"msg": "How are you?"} [Message to wss://hooksocket.workers.dev/websocket/<roomId>]
        ↓
 WebSocket Client
```
---

## 🧑🏽‍💻 Example
1. Deploy HookSocket:

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adshrc/HookSocket)

    and note the domain, e.g. `hooksocket.workers.dev`
2. Open Postman and set the request type to "WebSocket". Connect to `wss://hooksocket.workers.dev/websocket/test`.
3. Open another Postman Tab and set the request type to "HTTP". Send a POST request to `https://hooksocket.workers.dev/websocket/test` with any JSON or Text payload.
4. Switch back to the "WebSocket" Tab and you will see that your payload has been received.

> ✅ You can open multiple WebSocket Tabs, all of them will receive the same message

> ⚠️ You can have unlimited rooms, the `roomId` in this case is `test`

---

## ⚙️ Environment Variables

You can configure HookSocket to fit your needs. All variables are optional (defaults apply).

| Variable  | Default               | Description                                |
|-----------|------------------------|--------------------------------------------|
| `WS_PATH` | `/websocket/`          | WebSocket path prefix                      |
| `WH_PATH` | `/webhook/`            | Webhook path prefix                        |
| `WH_HOST` | _(request hostname)_   | Optional override of the target HTTP host  |

> ⚠️ Adjust your CF Workers environment variables in the Settings

---

## Bonus: Make it look like a n8n Endpoint

If you have a self-hosted n8n instance, and you use Cloudflare anyway, you can create a new route, so it looks like a n8n Endpoint:

1. Open the CF Worker Settings
2. Add a new route `https://your-n8n-domain.com/websocket/*`

Now your Clients can connect to `wss://your-n8n-domain.com/websocket/<roomId>` and your n8n workflow can send requests to `https://your-n8n-domain.com/websocket/<roomId>` 🥳

---

## 📜 License

MIT License — free to use and modify.