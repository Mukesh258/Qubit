# Firebase Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         QUBIT QUANTUM CHAT                          │
│                    Firebase/Firestore Backend                       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   FRONTEND   │────────▶│   BACKEND    │────────▶│   FIREBASE   │
│  (React JS)  │  HTTP   │  (FastAPI)   │   SDK   │  (Firestore) │
│              │ WS      │              │         │              │
│ localhost    │         │ localhost    │         │   Cloud      │
│  :5173       │         │  :8000       │         │   Hosted     │
└──────────────┘         └──────────────┘         └──────────────┘
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
   [Users]              [API Routes]             [Collections]
   - Login              - Auth                   - users
   - Chat               - QKD                    - user_sessions
   - Profile            - Chat                   - chat_sessions
   - QKD Viz            - Attack Lab             - messages
                        - WebSocket              - session_participants
                                                  - qkd_sessions
```

## 📦 Component Breakdown

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx          → /api/auth/login/email
│   │   ├── Dashboard.jsx      → /api/chat/sessions
│   │   ├── Chat.jsx           → /ws/chat/{session_id}
│   │   └── Profile.jsx        → /api/auth/profile
│   │
│   ├── components/
│   │   ├── QKDVisualizer.jsx  → /api/qkd/simulate
│   │   ├── ChatWindow.jsx     → WebSocket messages
│   │   └── AttackLab.jsx      → /api/attack/demo
│   │
│   └── services/
│       ├── api.js             → HTTP client (axios)
│       └── socket.js          → WebSocket client
```

### Backend (FastAPI + Firebase)
```
backend/
├── app/
│   ├── main.py                    # FastAPI app entry point
│   ├── firebase_config.py         # Firebase initialization
│   ├── database.py                # DB client getter
│   │
│   ├── models/
│   │   └── user_firebase.py       # Pydantic models + helpers
│   │
│   ├── routes/
│   │   ├── auth_firebase.py       # ✅ Authentication (Firestore)
│   │   ├── chat.py                # ⚠️ Chat sessions (needs update)
│   │   ├── qkd.py                 # ⚠️ QKD operations (needs update)
│   │   └── attack_lab.py          # ⚠️ Attack demos (needs update)
│   │
│   ├── websocket/
│   │   └── chat_ws.py             # ⚠️ Real-time chat (needs update)
│   │
│   └── core/
│       ├── qkd_bb84.py            # BB84 QKD simulation
│       ├── pqc_kyber.py           # Kyber KEX
│       ├── pqc_dilithium.py       # Dilithium signatures
│       └── aes_crypto.py          # AES-256-GCM encryption
```

### Firebase (Cloud)
```
Firestore Database
├── users/                         # User accounts
│   └── {userId}/
│       ├── id: string
│       ├── email: string
│       ├── name: string
│       ├── oauth_provider: string
│       ├── oauth_id: string
│       ├── dilithium_public_key: bytes
│       ├── kyber_public_key: bytes
│       └── timestamps
│
├── user_sessions/                 # Active sessions
│   └── {sessionId}/
│       ├── user_id: string
│       ├── access_token: string
│       └── timestamps
│
├── chat_sessions/                 # Encrypted chat sessions
│   └── {sessionId}/
│       ├── creator_id: string
│       ├── session_name: string
│       ├── qber: string
│       ├── session_key_id: string
│       └── encryption_status: string
│
├── messages/                      # Encrypted messages
│   └── {messageId}/
│       ├── session_id: string
│       ├── sender_id: string
│       ├── ciphertext: string
│       ├── nonce: string
│       └── timestamp
│
├── session_participants/          # Chat participants
│   └── {participantId}/
│       ├── session_id: string
│       ├── user_id: string
│       └── joined_at
│
└── qkd_sessions/                  # QKD audit logs
    └── {qkdId}/
        ├── num_bits_sent: number
        ├── bits_after_sifting: number
        ├── final_key_bits: number
        ├── qber: string
        ├── eavesdropper_detected: boolean
        └── timestamps
```

## 🔐 Data Flow - Login Example

```
1. User enters email in Frontend
   │
   ▼
2. Frontend calls: POST /api/auth/login/email
   │  Body: { "email": "user@example.com" }
   │
   ▼
3. Backend (auth_firebase.py)
   │  - Receives request
   │  - Gets Firestore client
   │  - Queries: users.where('email', '==', email)
   │
   ▼
4. Firestore
   │  - Searches 'users' collection
   │  - Returns user document (if exists)
   │
   ▼
5. Backend
   │  - If user not found: Create new user
   │  - Generate access_token
   │  - Create session in 'user_sessions'
   │  - Return: { user_id, email, name, access_token }
   │
   ▼
6. Frontend
   │  - Store access_token in localStorage
   │  - Redirect to Dashboard
   │
   ▼
7. Future requests include:
   │  Authorization: Bearer {access_token}
```

## 🔐 Data Flow - Chat Message

```
1. User types message in Chat
   │
   ▼
2. Frontend encrypts message (AES-256-GCM)
   │  - Uses session key from QKD
   │
   ▼
3. Frontend sends via WebSocket
   │  ws://localhost:8000/ws/chat/{session_id}
   │
   ▼
4. Backend (chat_ws.py)
   │  - Receives encrypted message
   │  - Creates message document
   │
   ▼
5. Firestore
   │  - Stores in 'messages' collection
   │  - Document contains: ciphertext, nonce, sender_id
   │
   ▼
6. Backend broadcasts to all participants
   │  - Via WebSocket connections
   │
   ▼
7. Frontend
   │  - Receives encrypted message
   │  - Decrypts using session key
   │  - Displays plaintext
```

## 🔑 Authentication Flow

```
┌─────────┐                ┌─────────┐                ┌───────────┐
│ Browser │                │ FastAPI │                │ Firestore │
└────┬────┘                └────┬────┘                └─────┬─────┘
     │                          │                           │
     │  POST /login/email       │                           │
     ├─────────────────────────▶│                           │
     │  {email: "user@test.com"}│                           │
     │                          │                           │
     │                          │  Query users              │
     │                          ├──────────────────────────▶│
     │                          │  where email == ...       │
     │                          │                           │
     │                          │  Return user (if exists)  │
     │                          │◀──────────────────────────┤
     │                          │                           │
     │                          │  Create/Update user       │
     │                          ├──────────────────────────▶│
     │                          │                           │
     │                          │  Create session           │
     │                          ├──────────────────────────▶│
     │                          │                           │
     │  Return user + token     │                           │
     │◀─────────────────────────┤                           │
     │  {user_id, access_token} │                           │
     │                          │                           │
     │  Subsequent requests     │                           │
     ├─────────────────────────▶│                           │
     │  Header: Bearer {token}  │                           │
     │                          │  Validate token           │
     │                          ├──────────────────────────▶│
     │                          │  Query user_sessions      │
     │                          │◀──────────────────────────┤
     │                          │                           │
     │  Protected resource      │                           │
     │◀─────────────────────────┤                           │
     │                          │                           │
```

## 🚀 Deployment Architecture

### Development
```
Local Machine
├── Frontend (Vite Dev Server)     → localhost:5173
├── Backend (Uvicorn)               → localhost:8000
└── Firebase (Cloud)                → Firestore hosted
```

### Production
```
Cloud Platform
├── Frontend (Vercel/Netlify)       → yourdomain.com
├── Backend (Render/Railway)        → api.yourdomain.com
└── Firebase (Cloud)                → Firestore hosted
```

## 📊 Technology Stack

```
┌─────────────────────────────────────────┐
│           FRONTEND STACK                │
├─────────────────────────────────────────┤
│ React 18                                │
│ Vite (Build Tool)                       │
│ Tailwind CSS                            │
│ React Router v6                         │
│ Axios (HTTP Client)                     │
│ WebSocket Client                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           BACKEND STACK                 │
├─────────────────────────────────────────┤
│ Python 3.8+                             │
│ FastAPI (Web Framework)                 │
│ Uvicorn (ASGI Server)                   │
│ Firebase Admin SDK                      │
│ Pydantic (Data Validation)              │
│ WebSockets                              │
│ Python-dotenv                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│        CRYPTOGRAPHY STACK               │
├─────────────────────────────────────────┤
│ Qiskit (Quantum Simulation)             │
│ Cryptography (AES, HKDF)                │
│ PyCryptodome (Crypto Primitives)        │
│ Custom BB84/B92 Implementation          │
│ Custom Kyber Implementation             │
│ Custom Dilithium Implementation         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         DATABASE STACK                  │
├─────────────────────────────────────────┤
│ Firebase Firestore (NoSQL)              │
│ Google Cloud Infrastructure             │
│ Real-time Sync                          │
│ Automatic Scaling                       │
└─────────────────────────────────────────┘
```

## 🔄 Migration Path (SQL → NoSQL)

### Before (PostgreSQL + SQLAlchemy)
```python
# Query
user = db.query(User).filter(User.email == email).first()

# Create
user = User(id=user_id, email=email, name=name)
db.add(user)
db.commit()

# Update
user.name = "New Name"
db.commit()

# Delete
db.delete(user)
db.commit()
```

### After (Firestore)
```python
# Query
query = db.collection('users').where('email', '==', email)
docs = query.stream()
user_doc = next(docs, None)

# Create
user_data = {'id': user_id, 'email': email, 'name': name}
db.collection('users').document(user_id).set(user_data)

# Update
db.collection('users').document(user_id).update({'name': 'New Name'})

# Delete
db.collection('users').document(user_id).delete()
```

## 📈 Scalability

```
Firestore Advantages:
✅ Auto-scaling (no server management)
✅ Real-time sync (built-in)
✅ Global distribution
✅ 99.99% uptime SLA
✅ Pay-per-use pricing
✅ No SQL migrations needed

Firestore Limits (Free Tier):
- 50K document reads/day
- 20K document writes/day
- 20K document deletes/day
- 1GB storage
```

## 🎯 Summary

- **Frontend**: React app making HTTP/WS calls to backend
- **Backend**: FastAPI app using Firebase Admin SDK
- **Database**: Firestore (NoSQL, cloud-hosted)
- **Crypto**: Hybrid PQC + QKD for quantum-safe security
- **Deployment**: Easy cloud deployment with managed database

**Result**: A modern, scalable, quantum-safe chat application! 🚀
