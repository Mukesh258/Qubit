"""
Quantum-Safe Secure Chat - FastAPI Backend

This is the main FastAPI application that provides:
- QKD simulation endpoints
- Post-quantum cryptography integration
- Real-time encrypted chat via WebSocket
- Attack lab for educational demonstrations
"""
import warnings
# Suppress Google API Python version FutureWarning (upgrade Python when possible)
warnings.filterwarnings("ignore", category=FutureWarning, module="google.api_core")
warnings.filterwarnings("ignore", message=".*Python version.*which Google will stop supporting.*", category=FutureWarning)
# Suppress Firestore "prefer filter keyword" UserWarning (we use FieldFilter)
warnings.filterwarnings("ignore", message=".*positional arguments.*Prefer using the 'filter' keyword.*", category=UserWarning)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routes
from app.routes import auth_firebase as auth, qkd, chat, attack_lab, report
from app.websocket import chat_ws
from app.database import get_db, test_connection
from app.models.user_firebase import init_db

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[START] Quantum-Safe Chat Backend Starting...")
    
    # Initialize Firebase/Firestore
    try:
        print("[INIT] Initializing Firebase/Firestore Database...")
        if test_connection():
            init_db()
            print("  ✓ Firestore Connection Successful")
        else:
            print("  ! Falling back to in-memory/demo mode for some features")
    except Exception as e:
        print(f"  [ERROR] Firebase Initialization Failed: {e}")
        print("  ! Falling back to in-memory mode for some features")

    print("=" * 60)
    print("Cryptographic Components:")
    print("  ✓ BB84 QKD Simulation")
    print("  ✓ Kyber-768 (Post-Quantum KEX)")
    print("  ✓ Dilithium-3 (Post-Quantum Signatures)")
    print("  ✓ AES-256-GCM (Authenticated Encryption)")
    print("  ✓ HKDF (Hybrid Key Derivation)")
    print("=" * 60)
    yield
    # Shutdown
    print("[STOP] Quantum-Safe Chat Backend Shutting Down...")


# Initialize FastAPI app
app = FastAPI(
    title="Quantum-Safe Secure Chat API",
    description="Post-quantum cryptography + QKD simulation for secure communications",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "https://*.vercel.app",   # Vercel deployment
        "*"  # For development - restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - API status"""
    return {
        "status": "online",
        "service": "Quantum-Safe Secure Chat API",
        "version": "1.0.0",
        "cryptography": {
            "qkd": "BB84 Simulation",
            "kex": "Kyber-768",
            "signature": "Dilithium-3",
            "encryption": "AES-256-GCM"
        }
    }


@app.get("/health")
async def health_check():
    """Health check for deployment platforms"""
    return {"status": "healthy"}


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(qkd.router, prefix="/api/qkd", tags=["Quantum Key Distribution"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(attack_lab.router, prefix="/api/attack", tags=["Attack Lab"])
app.include_router(report.router, prefix="/api/report", tags=["Anonymous Secure Reporting"])


# WebSocket endpoint for real-time chat
@app.websocket("/ws/chat/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time encrypted chat"""
    db = get_db()
    await chat_ws.handle_chat_websocket(websocket, session_id, db)


# Run with uvicorn
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
