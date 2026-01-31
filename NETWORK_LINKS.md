# Network Links for Qubit (WebSocket Real-Time Chat)

Use these URLs to run and access the app. For **real-time chat**, both API and WebSocket must point to the same backend.

---

## Local (same machine)

| Purpose        | URL |
|----------------|-----|
| **Frontend (app)** | http://localhost:5173 |
| **Backend API**    | http://localhost:8000 |
| **API docs**       | http://localhost:8000/docs |
| **WebSocket (chat)** | ws://localhost:8000/ws/chat/{session_id} |

**Frontend `.env` (default):**
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

**Start:**
- Backend: `cd backend && uvicorn app.main:app --reload --port 8000`
- Frontend: `cd frontend && npm run dev`

---

## Same network (LAN) – user and agent on different devices

When the frontend runs on one device (e.g. `http://192.168.1.10:5173`) and the backend on another (or same), use the **backend machine’s IP** for API and WebSocket.

Example: backend on `192.168.1.5`, frontend on any device on the same LAN.

| Purpose        | URL |
|----------------|-----|
| **Frontend (app)** | http://192.168.1.5:5173 (or the machine where Vite runs) |
| **Backend API**    | http://192.168.1.5:8000 |
| **WebSocket (chat)** | ws://192.168.1.5:8000/ws/chat/{session_id} |

**Frontend `.env` on each device (replace with your backend IP):**
```env
VITE_API_URL=http://192.168.1.5:8000
VITE_WS_URL=ws://192.168.1.5:8000
```

**Backend:** Start so it listens on all interfaces (not only localhost):
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:** To serve to other devices on the LAN:
```bash
npm run dev -- --host
```
Then open `http://<this-machine-IP>:5173` from other devices.

---

## Summary

| Scenario   | Frontend URL        | API URL              | WebSocket URL                    |
|-----------|----------------------|----------------------|-----------------------------------|
| Local     | http://localhost:5173 | http://localhost:8000 | ws://localhost:8000/ws/chat/{id} |
| Same LAN  | http://&lt;IP&gt;:5173 | http://&lt;IP&gt;:8000 | ws://&lt;IP&gt;:8000/ws/chat/{id} |

Replace `<IP>` with the machine’s LAN IP (e.g. `192.168.1.5`). For real-time chat, **API and WebSocket must use the same host and port** (the backend).
