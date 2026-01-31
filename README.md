# Qubit Force
<img width="1890" height="855" alt="image" src="https://github.com/user-attachments/assets/d4924398-bb51-4b11-8a36-79825771f2dd" />

A production-ready quantum-resilient secure communication platform demonstrating why classical ECC fails against quantum attacks and how hybrid cryptography (BB84 QKD + Post-Quantum Cryptography) provides future-proof security.

![Quantum-Safe Architecture](https://img.shields.io/badge/Security-Quantum--Safe-brightgreen)
![BB84](https://img.shields.io/badge/QKD-BB84-blue)
![Kyber](https://img.shields.io/badge/PQC-Kyber--768-purple)
![Dilithium](https://img.shields.io/badge/PQC-Dilithium--3-purple)
![AES-256](https://img.shields.io/badge/Encryption-AES--256--GCM-orange)
![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-yellow)

---

## 🚀 Quick Start with Firebase

### Prerequisites
- Python 3.8+
- Node.js 16+
- Firebase Account (free tier is fine)

### Setup Steps

1. **Clone and Navigate**
   ```bash
   cd C:\Users\Mukesh\Desktop\Qubit
   ```

2. **Set Up Firebase** (See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md))
   - Create Firebase project
   - Enable Firestore
   - Download service account JSON
   - Place in `backend/firebase-credentials.json`

3. **Configure Environment**
   ```bash
   cd backend
   copy .env.example .env
   # Edit .env and add: FIREBASE_CREDENTIALS_PATH=C:\Users\Mukesh\Desktop\Qubit\backend\firebase-credentials.json
   ```

4. **Quick Setup (Windows)**
   ```bash
   setup_firebase.bat
   ```

5. **Start Backend**
   ```bash
   start_backend.bat
   ```
   Or manually:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

6. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

7. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - WebSocket (real-time chat): ws://localhost:8000/ws/chat/{session_id}

   For **same-network** (LAN) links and WebSocket setup, see **[NETWORK_LINKS.md](NETWORK_LINKS.md)**.

---

## 📚 Documentation

- **[FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md)** - Complete Firebase setup instructions
- **[FIREBASE_MIGRATION_SUMMARY.md](FIREBASE_MIGRATION_SUMMARY.md)** - Migration overview and details
- **[MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md)** - Quick reference for remaining tasks

---

## 🎯 Project Overview

This system replaces vulnerable classical cryptography (ECC) with a **hybrid quantum-safe architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                 QUANTUM-SAFE ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   BB84/B92   │─────▶│     HKDF     │◀─────│   Kyber   │ │
│  │ QKD Entropy  │      │ Key Combine  │      │ (PQ-KEX)  │ │
│  └──────────────┘      └──────┬───────┘      └───────────┘ │
│                               │                              │
│                               ▼                              │
│                      ┌─────────────────┐                     │
│                      │  AES-256-GCM    │                     │
│                      │  Session Keys   │                     │
│                      └─────────────────┘                     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Dilithium Signatures (Identity Verification)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 Why Classical ECC Fails Against Quantum Computers

### The Problem

**Elliptic Curve Cryptography (ECDH/ECDSA)** is vulnerable to quantum attacks:

| Attack Vector | Classical Security | Quantum Vulnerability |
|--------------|-------------------|----------------------|
| **Shor's Algorithm** | Exponential time (secure) | Polynomial time (broken) |
| **ECDH Key Exchange** | Discrete log problem | Solvable with ~1000-4000 qubits |
| **ECDSA Signatures** | Private key recovery impossible | Private key recoverable |
| **Timeline** | Secure today | **Store-now-decrypt-later attacks happening NOW** |

### Real-World Impact

- **Financial Systems**: Encrypted transactions can be captured and decrypted later
- **Government Communications**: Classified data vulnerable to future quantum attacks
- **Healthcare**: Patient records encrypted today will be readable in 5-10 years
- **Critical Infrastructure**: Long-term secrets (certificates, keys) at risk

---

## ✅ How This System Protects

### 1. **BB84 Quantum Key Distribution (Simulation)**

**Information-Theoretic Security** - Not based on computational hardness

```python
# Eavesdropping Detection via QBER
if QBER > 11%:
    abort_session()  # Eve detected!
    alert_users()
else:
    proceed_with_key()  # Secure
```

**Key Features:**
- Random bit & basis generation (rectilinear `+` / diagonal `×`)
- Photon transmission simulation
- Automatic eavesdropper detection via Quantum Bit Error Rate (QBER)
- Session abort on high QBER (>11%)

**Why It Works:**
- **No-Cloning Theorem**: Cannot copy unknown quantum states
- **Measurement Disturbance**: Eve's measurement collapses quantum state
- **QBER Spike**: Eve's wrong basis guesses create detectable errors

### 2. **Kyber-768 (Post-Quantum Key Exchange)**

**Lattice-Based Cryptography** - Resistant to Shor's Algorithm

```
Security Basis: Module-LWE (Learning With Errors)
Quantum Resistance: 128-bit post-quantum security
NIST Status: Selected for standardization (2022)
```

**Why Quantum Computers Can't Break It:**
- Based on lattice problems (shortest vector problem)
- No known quantum algorithm provides exponential speedup
- Grover's algorithm only provides quadratic speedup (still secure)

### 3. **Dilithium-3 (Post-Quantum Signatures)**

**Digital Signatures Without Discrete Logarithms**

```
Security Basis: Module-LWE + Module-SIS
Use Cases: Identity verification, message authentication
Advantage: Deterministic signatures, fast verification
```

### 4. **Hybrid Key Derivation (HKDF)**

**Defense-in-Depth Strategy**

```python
session_key = HKDF(
    bb84_entropy || kyber_shared_secret,
    salt=None,
    info=f"session-{session_id}"
)
```

**Security Guarantee:**
- If BB84 is compromised → Kyber still protects
- If Kyber is broken (future attack) → BB84 entropy contributes
- **Both must be broken simultaneously** to compromise key

### 5. **AES-256-GCM (Authenticated Encryption)**

**Quantum-Resistant Symmetric Encryption**

```
Grover's Algorithm Impact: 256-bit → 128-bit security (still secure)
Authentication: GCM mode prevents tampering
Performance: Hardware-accelerated on modern CPUs
```

---

## 📂 Project Structure

```
quantum-secure-chat/
│
├── frontend/                    # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── QKDVisualizer.jsx      # BB84 photon transmission visualization
│   │   │   ├── QBERChart.jsx          # Real-time QBER monitoring
│   │   │   ├── ChatWindow.jsx         # End-to-end encrypted chat
│   │   │   └── AttackLab.jsx          # Security demonstration
│   │   ├── pages/
│   │   │   ├── Login.jsx              # Authentication
│   │   │   ├── Dashboard.jsx          # Security metrics & controls
│   │   │   └── Chat.jsx               # Secure messaging
│   │   └── services/
│   │       ├── api.js                 # API client
│   │       └── socket.js              # WebSocket client
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                     # FastAPI + Python
│   ├── app/
│   │   ├── core/
│   │   │   ├── qkd_bb84.py           # BB84 protocol simulation
│   │   │   ├── pqc_kyber.py          # Kyber-768 KEM
│   │   │   ├── pqc_dilithium.py      # Dilithium-3 signatures
│   │   │   ├── kdf.py                # Hybrid key derivation
│   │   │   └── aes_crypto.py         # AES-256-GCM encryption
│   │   ├── routes/
│   │   │   ├── auth.py               # Authentication
│   │   │   ├── qkd.py                # QKD endpoints
│   │   │   ├── chat.py               # Chat session management
│   │   │   └── attack_lab.py         # Attack simulations
│   │   ├── websocket/
│   │   │   └── chat_ws.py            # Real-time chat handler
│   │   ├── models/
│   │   │   └── user.py               # Database models
│   │   └── main.py                   # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
│
└── README.md                    # This file
```

---

## 🚀 Local Setup

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **PostgreSQL** (optional, for production)
- **Redis** (optional, for sessions)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

**Backend will be available at:** `http://localhost:8000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

**Frontend will be available at:** `http://localhost:5173`

### Environment Variables

Create `.env` files:

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/quantum_chat
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SECRET_KEY=your_secret_key
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## 🌐 Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

**Environment Variables (Vercel Dashboard):**
- `VITE_API_URL`: Your backend URL (e.g., `https://your-backend.onrender.com`)
- `VITE_WS_URL`: Your WebSocket URL

### Backend (Render)

1. Create new **Web Service** on Render
2. Connect GitHub repository
3. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (see above)

### Database (Supabase)

1. Create new project on [Supabase](https://supabase.com)
2. Copy connection string
3. Run migrations:

```bash
# Create tables
python -c "from app.models.user import init_db, get_db_url; from sqlalchemy import create_engine; init_db(create_engine(get_db_url()))"
```

---

## 🧪 Testing the System

### 1. **BB84 QKD Simulation**

```bash
# Test without eavesdropper
python backend/app/core/qkd_bb84.py

# Expected: QBER < 5%
```

### 2. **Eavesdropper Detection**

```bash
# Run with eavesdropper enabled
# Expected: QBER > 15%, session aborted
```

### 3. **End-to-End Chat**

1. Create chat session
2. Send encrypted message
3. Verify ciphertext in network tab
4. Confirm decryption only on authorized clients

### 4. **Attack Lab**

- Toggle eavesdropper → QBER spikes
- Tamper with ciphertext → Authentication fails
- Review educational explanations

---

## 📊 Security Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **QBER (No Eve)** | < 5% | ✅ Secure |
| **QBER (With Eve)** | > 15% | 🚨 Detected & Aborted |
| **Kyber Security** | 128-bit PQ | ✅ Quantum-Safe |
| **Dilithium Security** | 128-bit PQ | ✅ Quantum-Safe |
| **AES-256 Security** | 128-bit PQ (Grover) | ✅ Quantum-Resistant |

---

## ⚠️ Important Disclaimers

### BB84 is a SIMULATION

- This implementation simulates BB84 protocol for **educational purposes**
- **NOT actual quantum hardware** - uses classical random number generation
- Real QKD requires quantum photon sources and single-photon detectors
- Production systems should use commercial QKD hardware (ID Quantique, Toshiba, etc.)

### Post-Quantum Cryptography

- Using reference implementations (or simulations if `pqcrypto` unavailable)
- Production systems should use **NIST-validated libraries**
- Kyber and Dilithium are standardized but implementations vary

### For Educational/Demonstration Purposes

- Simplified authentication (no real Google OAuth in demo)
- In-memory storage (use PostgreSQL + Redis in production)
- No rate limiting or advanced security hardening

---

## 🎓 Educational Resources

### Why This Matters

**Store-Now-Decrypt-Later Attacks:**
Adversaries are capturing encrypted traffic TODAY to decrypt when quantum computers become available (estimated 5-10 years).

**Migration Timeline:**
- **2024-2025**: NIST finalizes PQC standards
- **2025-2030**: Industry migration to PQC
- **2030+**: Quantum computers capable of breaking RSA/ECC

### Learn More

- [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [BB84 Protocol (Original Paper)](https://doi.org/10.1016/j.tcs.2014.05.025)
- [Kyber Specification](https://pq-crystals.org/kyber/)
- [Dilithium Specification](https://pq-crystals.org/dilithium/)

---

## 🤝 Contributing

This is an educational project. Contributions welcome:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -m 'Add improvement'`)
4. Push to branch (`git push origin feature/improvement`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **NIST** for Post-Quantum Cryptography standardization
- **Charles Bennett & Gilles Brassard** for BB84 protocol
- **CRYSTALS** team for Kyber and Dilithium
- Open-source cryptography community

---

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Review documentation in `/docs`
- Check educational endpoints: `/api/attack/educational/*`

---

**Built with ❤️ for a quantum-safe future**

