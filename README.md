# HookSocket

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adshrc/HookSocket)

> **HookSocket** — A serverless WebSocket-to-HTTP bridge for real-time automations, chatbots, IoT, and more. Powered by Cloudflare Workers.

---

## ✨ What is HookSocket?

**HookSocket** is a lightweight, serverless WebSocket bridge that forwards WebSocket messages to HTTP endpoints (like webhooks) — and vice versa.

- Enables full **WebSocket support** in tools like **n8n**, **Make.com**, **Zapier**, etc.
- Works **serverlessly on Cloudflare Workers** (free, scalable, no infra to manage).
- Real-time 2-way communication with **dynamic WebSocket rooms**, isolated by `<id>`.

Perfect for building chatbot frontends, real-time dashboards, alerts, and more — using webhook-based backends.

---

## 🚀 How It Works

HookSocket enables **two-way communication**:

### 1. WebSocket ➡️ Webhook URL

The WebSocket Client sends a message → HookSocket forwards it to a Webhook URL.

```
 WebSocket Client
        |
        |  {"msg": Hello!"} [Message to wss://hooksocket.workers.dev/websocket/<id>]
        ↓
   HookSocket
        |
        |  {"msg": Hello!"} [POST to https://your-webhook.com/webhook/<id>]
        ↓
 Your Webhook URL
```

Note that the Payload will be forwarded, no modifications will be made.

---

### 2. Your Workflow/Server ➡️ WebSocket

Your Workflow/Server sends an HTTP POST → HookSocket forwards it to the WebSocket client(s).

```
Your Workflow/Server
         |
         |  {"msg": "How are you?"} [POST to https://hooksocket.workers.dev/webhook/<id>]
         ↓
   HookSocket
        |
        |  {"msg": "How are you?"} [Message to wss://hooksocket.workers.dev/websocket/<id>]
        ↓
 WebSocket Client
```
---

## ⚙️ Environment Variables

You can configure HookSocket to fit your needs. All variables are optional (defaults apply).

| Variable  | Default               | Description                                |
|-----------|------------------------|--------------------------------------------|
| `WS_PATH` | `/websocket/`          | WebSocket path prefix                      |
| `WH_PATH` | `/webhook/`            | Webhook path prefix                        |
| `WH_HOST` | _(request hostname)_   | Optional override of the target HTTP host  |

---

## 📜 License

MIT License — free to use and modify.