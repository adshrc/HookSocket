# HookSocket

[![Deploy to Cloudflare Workers](https://developers.cloudflare.com/assets/deploy-button.svg)](https://deploy.cloudflare.com/?url=https://github.com/adshrc/HookSocket)

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

| Variable         | Default               | Description                                |
|------------------|------------------------|--------------------------------------------|
| `WS_PATH`        | `/websocket/`          | WebSocket path prefix                      |
| `API_PATH`       | `/webhook/`            | Webhook path prefix                        |
| `API_HOST`       | _(request hostname)_   | Optional override of the target HTTP host  |

---

## 🤖 Supported Platforms

HookSocket makes real-time possible in tools that only support HTTP:

- [n8n](https://n8n.io/)
- [Zapier](https://zapier.com/)
- [Make.com](https://make.com/)
- Any HTTP webhook endpoint

---

## 🔧 Example Use Case

A chatbot web app connects to `wss://your-domain/websocket/chat-123`.

- User sends: `"Hello!"` → WebSocket → HookSocket → n8n webhook
- n8n responds with `"Hi there!"` → POST → HookSocket → all clients in chat-123 room receive it

✅ Real-time  
✅ Serverless  
✅ Bi-directional automation bridge

---

## 🛡 Limitations

- Idle connections are kept alive with pings every 30 seconds.
- Cloudflare’s limits still apply (1000 connections per DO, ~60s idle timeout).

---

## 📜 License

MIT License — free to use and modify.

---

> Built with ❤️ on Cloudflare Workers  
> by [@yourname](https://github.com/yourusername)