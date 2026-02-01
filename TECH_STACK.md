# 🔧 Tech Stack - Qubit Force

> **Post-Quantum Secure Anonymous Reporting Platform**

---

## 🎨 Frontend Technologies

### Core Framework
- **React 18** - Modern component-based UI library
- **Vite** - Next-generation frontend build tool for lightning-fast development
- **React Router v6** - Client-side routing and navigation

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS transformation and optimization
- **Framer Motion** - Production-ready animation library
- **Lucide React** - Beautiful & consistent icon set

### State Management
- **React Context API** - Global state for security metrics (QBER, attack detection)
- Custom hooks (`useSecurity`) for shared state access

### HTTP & WebSocket
- **Axios** - Promise-based HTTP client for REST API calls
- **Socket.io Client** - Real-time bidirectional communication for secure chat

### Cryptography (Client-Side)
- **CryptoJS** - JavaScript cryptographic library
- **Web Crypto API** - Browser native cryptography
- Custom implementations:
  - BB84 Quantum Key Distribution simulation
  - Kyber-768 KEM simulation
  - AES-256-GCM authenticated encryption
  - HKDF (Hybrid Key Derivation Function)

---

## ⚙️ Backend Technologies

### Core Framework
- **Python 3.9+** - Programming language
- **FastAPI** - Modern, high-performance web framework
- **Uvicorn** - Lightning-fast ASGI server
- **Pydantic** - Data validation using Python type annotations

### Database
- **Firebase Admin SDK** - Firebase/Firestore integration
- **Firestore (NoSQL)** - Cloud-native document database
  - Collections: `anonymous_reports`, `agents`, `audit_logs`, `users`, `chat_messages`

### Authentication & Security
- **Firebase Authentication** - User authentication (anonymous & email/password)
- **python-jose[cryptography]** - JWT token creation and verification
- **passlib[bcrypt]** - Secure password hashing
- **python-multipart** - Form data and file upload handling

### Cryptographic Components
- **BB84 QKD Protocol** - Quantum key distribution simulation
- **Kyber-768** - Post-quantum key encapsulation mechanism (simulated)
- **Dilithium-3** - Post-quantum digital signatures (simulated)
- **AES-256-GCM** - Authenticated encryption
- **HKDF** - Hybrid key derivation

---

## 📦 Package Management

### Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "axios": "^1.x",
    "socket.io-client": "^4.x",
    "crypto-js": "^4.x",
    "framer-motion": "^10.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.x",
    "vite": "^5.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x"
  }
}
```

### Backend
```txt
fastapi
uvicorn[standard]
firebase-admin
python-jose[cryptography]
passlib[bcrypt]
python-multipart
pydantic
```

---

## 🚀 Deployment & Infrastructure

### Frontend Deployment
- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment**: Node.js 18+

### Backend Deployment
- **Platform**: Render
- **Runtime**: Python 3.9+
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Cloud Services
- **Firebase/Firestore** - Database and authentication
- **Render** - Backend hosting
- **Vercel** - Frontend hosting

---

## 🔐 Security Architecture

### Quantum-Safe Cryptography Stack

```
┌─────────────────────────────────────────┐
│     CLIENT-SIDE ENCRYPTION FLOW         │
├─────────────────────────────────────────┤
│ 1. BB84 QKD Simulation                  │
│    └─> Generate quantum-secure entropy  │
│                                          │
│ 2. Kyber-768 KEM                        │
│    └─> Post-quantum key exchange        │
│                                          │
│ 3. HKDF (Hybrid KDF)                    │
│    └─> Combine BB84 + Kyber secrets     │
│                                          │
│ 4. AES-256-GCM                          │
│    └─> Encrypt payload with derived key │
│                                          │
│ 5. Dilithium-3 Signature (Simulated)    │
│    └─> Authenticate encrypted payload   │
└─────────────────────────────────────────┘
```

### Transport Security
- **HTTPS/TLS 1.3** - Encrypted communication
- **CORS** - Cross-Origin Resource Sharing configured
- **JWT** - Stateless authentication tokens
- **Firebase Rules** - Database access control

---

## 🛠️ Development Tools

### Code Quality
- **ESLint** - JavaScript/React linting (configured)
- **Prettier** - Code formatting (recommended)
- **Python Type Hints** - Static type checking with Pydantic

### Build Tools
- **Vite** - Frontend bundler with HMR (Hot Module Replacement)
- **PostCSS** - CSS processing and optimization
- **Tailwind JIT** - Just-in-Time compilation for CSS

### Version Control
- **Git** - Source control
- **GitHub** - Repository hosting (`Mukesh258/Qubit-Force`)

---

## 🌐 API Architecture

### REST Endpoints
```
POST   /api/auth/signup              - User registration
POST   /api/auth/login               - User authentication
POST   /api/auth/logout              - Session termination
GET    /api/auth/me                  - Current user info

POST   /api/report/anonymous         - Submit encrypted report
GET    /api/report/agent/list        - List all reports (agents only)
POST   /api/report/agent/decrypt/:id - Decrypt report (agents only)

POST   /api/chat/send                - Send encrypted message
GET    /api/chat/history             - Retrieve chat history

GET    /api/qkd/bb84                 - BB84 simulation
POST   /api/qkd/verify               - Verify quantum channel

POST   /api/attack/simulate/eavesdrop - Simulate eavesdrop attack
POST   /api/attack/simulate/tamper    - Simulate tampering attack
```

### WebSocket Events
```
connect              - Establish secure chat connection
disconnect           - Close connection
chat_message         - Send/receive encrypted messages
user_typing          - Typing indicators
delivery_receipt     - Message delivery confirmation
```

---

## 📊 Performance Optimizations

### Frontend
- **Code Splitting** - Dynamic imports with React.lazy()
- **Tree Shaking** - Vite eliminates unused code
- **Asset Optimization** - Image and SVG compression
- **CSS Purging** - Tailwind removes unused styles

### Backend
- **Async/Await** - Non-blocking I/O with FastAPI
- **Connection Pooling** - Firestore connection reuse
- **Response Caching** - Strategic endpoint caching (planned)
- **Lazy Loading** - Import heavy crypto modules on-demand

---

## 🧪 Testing (Planned)

### Frontend Testing Stack
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing
- **Cypress** - E2E testing

### Backend Testing Stack
- **pytest** - Python testing framework
- **httpx** - Async HTTP client for testing
- **pytest-asyncio** - Async test support

---

## 📈 Monitoring & Analytics

### Current Implementation
- **Console Logging** - Development debugging
- **Audit Logs** - Agent decrypt actions tracked in Firestore
- **QBER Monitoring** - Real-time quantum channel integrity tracking

### Planned Enhancements
- **Sentry** - Error tracking and monitoring
- **Google Analytics** - Usage analytics (privacy-preserving)
- **Performance Monitoring** - Firebase Performance SDK

---

## 🔄 CI/CD Pipeline

### Automated Deployments
- **Frontend**: Vercel Git integration (auto-deploy on push to `main`)
- **Backend**: Render Git integration (auto-deploy on push to `main`)

### Workflow
```
git push origin main
    │
    ├─> Vercel Build & Deploy (Frontend)
    │   └─> Preview URL + Production URL
    │
    └─> Render Build & Deploy (Backend)
        └─> Production API URL
```

---

## 📱 Browser Compatibility

### Supported Browsers
- **Chrome/Edge** 90+ (Chromium-based)
- **Firefox** 88+
- **Safari** 14+
- **Opera** 76+

### Required Features
- Web Crypto API
- ES6+ JavaScript
- CSS Grid & Flexbox
- WebSocket support
- LocalStorage

---

## 🎯 Future Tech Considerations

### Planned Upgrades
- **Real PQC Libraries** - Replace simulations with liboqs (WASM)
- **Redis** - Caching layer for improved performance
- **GraphQL** - Alternative to REST for complex queries
- **TypeScript** - Gradual migration for type safety
- **Docker** - Containerization for consistent deployments
- **Kubernetes** - Orchestration for horizontal scaling

---

## 📝 License & Credits

### Open Source Dependencies
All dependencies are used under their respective licenses (MIT, Apache 2.0, BSD).

### Cryptographic Algorithms
- **BB84**: Charles Bennett & Gilles Brassard (1984)
- **Kyber**: CRYSTALS-Kyber NIST PQC Winner
- **Dilithium**: CRYSTALS-Dilithium NIST PQC Winner

---

**Last Updated**: February 1, 2026  
**Version**: 1.0.0  
**Maintainer**: Qubit Force Development Team
