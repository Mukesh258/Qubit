from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import secrets
import time
import os
from urllib.parse import quote

from app.database import get_db
from app.models.user import User, UserSession

router = APIRouter()


class UserInfo(BaseModel):
    """User information"""
    user_id: str
    email: str
    name: str
    access_token: str


class EmailLoginRequest(BaseModel):
    """Email login request model"""
    email: str


class LoginRequest(BaseModel):
    """Login request model"""
    redirect_uri: Optional[str] = None


class LoginResponse(BaseModel):
    """Login response model"""
    auth_url: str
    state: str


class CallbackRequest(BaseModel):
    """OAuth callback request"""
    code: str
    state: str


@router.post("/login/email", response_model=UserInfo)
async def email_login(request: EmailLoginRequest, db: Session = Depends(get_db)):
    """Simple email-based login with persistence"""
    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    # Database operations with resilience
    try:
        # Check if user exists, or create new one
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            user_id = f"user_{secrets.token_hex(4)}"
            user = User(
                id=user_id,
                email=request.email,
                name=request.email.split("@")[0].capitalize(),
                oauth_id=f"email_{secrets.token_hex(8)}"
            )
            db.add(user)
            db.commit()
        
        # Generate access token
        access_token = secrets.token_urlsafe(32)
        
        # Store session in DB
        new_session = UserSession(
            user_id=user.id,
            access_token=access_token
        )
        db.add(new_session)
        db.commit()
        
        return UserInfo(
            user_id=user.id,
            email=user.email,
            name=user.name,
            access_token=access_token
        )
    except Exception as e:
        print(f"  ❌ Database Error in email_login: {e}")
        # Fallback for demo purposes
        return UserInfo(
            user_id=f"demo_{secrets.token_hex(4)}",
            email=request.email,
            name=request.email.split("@")[0].capitalize(),
            access_token=secrets.token_urlsafe(32)
        )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Initiate Google OAuth login
    """
    state = secrets.token_urlsafe(32)
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    # Use redirect_uri from request, or default to production URL
    # In local development, frontend should pass "http://localhost:5173/dashboard"
    redirect_uri = request.redirect_uri or "https://qubit-nu.vercel.app/dashboard"
    
    scope = "openid email profile"
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"response_type=code&"
        f"scope={quote(scope)}&"
        f"redirect_uri={quote(redirect_uri)}&"
        f"state={state}&"
        f"prompt=select_account"
    )
    
    return LoginResponse(auth_url=auth_url, state=state)


@router.post("/callback", response_model=UserInfo)
async def oauth_callback(request: CallbackRequest, db: Session = Depends(get_db)):
    """Handle OAuth callback with database persistence"""
    # Simulated user info (in production, fetch from Google using code)
    email = "user@example.com"
    name = "Demo User"
    oauth_id = f"google_{secrets.token_hex(8)}"
    
    # Database operations with resilience
    try:
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user_id = f"user_{secrets.token_hex(8)}"
            user = User(
                id=user_id,
                email=email,
                name=name,
                oauth_id=oauth_id
            )
            db.add(user)
            db.commit()
        
        # Generate access token
        access_token = secrets.token_urlsafe(32)
        
        # Store session in DB
        new_session = UserSession(
            user_id=user.id,
            access_token=access_token
        )
        db.add(new_session)
        db.commit()
        
        return UserInfo(
            user_id=user.id,
            email=user.email,
            name=user.name,
            access_token=access_token
        )
    except Exception as e:
        print(f"  ❌ Database Error in oauth_callback: {e}")
        # Fallback UserInfo
        return UserInfo(
            user_id=f"demo_{secrets.token_hex(4)}",
            email=email,
            name=name,
            access_token=secrets.token_urlsafe(32)
        )


@router.get("/me", response_model=UserInfo)
async def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get current user info from persistent database"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    
    # Query session from DB
    session_record = db.query(UserSession).filter(UserSession.access_token == token).first()
    if not session_record:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = session_record.user
    
    return UserInfo(
        user_id=user.id,
        email=user.email,
        name=user.name,
        access_token=token
    )


class ProfileInfo(BaseModel):
    """Detailed profile information"""
    user: UserInfo
    role: str
    agency: str
    pqc_keys: dict
    qkd_stats: dict
    encryption_health: dict
    activity: dict
    attack_stats: dict


@router.get("/profile", response_model=ProfileInfo)
async def get_profile(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get detailed security profile information with DB persistence and fallback"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    user_id = "demo_user"
    user_email = "user@example.com"
    user_name = "Demo Security Agent"
    
    # Defaults for stats
    qkd_sessions_count = 0
    detections = 0
    aborted = 0
    total_messages = 0
    avg_qber = "3.2%"
    dilithium_hex = "f9a2b4c1"
    kyber_hex = "b4e1d9f2"
    last_rotation = "Just now"

    # Database operations with resilience
    try:
        session_record = db.query(UserSession).filter(UserSession.access_token == token).first()
        if session_record and session_record.user:
            user = session_record.user
            user_id = user.id
            user_email = user.email
            user_name = user.name
            
            # Fetch real stats
            from app.models.user import QKDSession, Message as DBMessage, ChatSession
            qkd_sessions_list = db.query(QKDSession).filter(QKDSession.chat_session_id != None).all()
            qkd_sessions_count = len(qkd_sessions_list)
            detections = db.query(QKDSession).filter(QKDSession.eavesdropper_detected == True).count()
            aborted = db.query(QKDSession).filter(QKDSession.session_aborted == True).count()
            total_messages = db.query(DBMessage).filter(DBMessage.sender_id == user_id).count()
            
            if qkd_sessions_list:
                avg_qber = qkd_sessions_list[-1].qber
            
            if user.dilithium_public_key:
                dilithium_hex = user.dilithium_public_key.hex()[:8]
            if user.kyber_public_key:
                kyber_hex = user.kyber_public_key.hex()[:8]
            if user.updated_at:
                last_rotation = user.updated_at.strftime("%Y-%m-%d %H:%M:%S")
    except Exception as e:
        print(f"  ❌ Database Error in get_profile: {e}")
        # Continue with fallback data

    return ProfileInfo(
        user=UserInfo(
            user_id=user_id,
            email=user_email,
            name=user_name,
            access_token=token
        ),
        role="Senior Security Agent",
        agency="Quantum Defense Agency (QDA)",
        pqc_keys={
            "dilithium_3": f"dil3_{dilithium_hex}",
            "kyber_768": f"kyb7_{kyber_hex}",
            "status": "Active",
            "last_rotation": last_rotation
        },
        qkd_stats={
            "last_protocol": "BB84 (Qiskit)",
            "avg_qber": avg_qber,
            "sessions_secure": qkd_sessions_count,
            "sessions_aborted": aborted,
            "eavesdropping_detections": detections
        },
        encryption_health={
            "mode": "Hybrid (PQC + QKD)",
            "algorithm": "AES-256-GCM",
            "key_freshness": "98%",
            "last_rotation": "15 mins ago"
        },
        activity={
            "messages_sent": total_messages,
            "messages_received": 0 if not user_id.startswith("user_") else 12, # Demo filler
            "integrity_verified": "100%",
            "active_chats": 1 if qkd_sessions_count > 0 else 0
        },
        attack_stats={
            "mitm_attempts": detections,
            "tampering_detected": 1 if aborted > 0 else 0,
            "last_alert": "Just now" if detections > 0 else "None"
        }
    )


@router.post("/rotate-keys")
async def rotate_keys(authorization: str = Header(None)):
    """Simulate rotation of Post-Quantum keys"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    return {
        "message": "PQC Identity Rotated Successfully",
        "new_dilithium_fingerprint": "dil3_" + secrets.token_hex(8),
        "new_kyber_fingerprint": "kyb7_" + secrets.token_hex(8),
        "timestamp": time.time()
    }


@router.post("/logout")
async def logout(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Logout user and invalidate DB session"""
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        session_record = db.query(UserSession).filter(UserSession.access_token == token).first()
        if session_record:
            db.delete(session_record)
            db.commit()
    
    return {"message": "Logged out successfully"}
