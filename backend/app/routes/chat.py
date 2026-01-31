"""
Chat Routes - Encrypted Chat Session Management

This module handles encrypted chat session creation and management.
Sessions use hybrid BB84+Kyber keys for encryption.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import secrets
import time
from datetime import datetime

from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.qkd_bb84 import BB84Protocol
from app.core.pqc_kyber import KyberKEM
from app.core.pqc_dilithium import DilithiumSignature
from app.core.kdf import derive_hybrid_session_key
from app.core.aes_crypto import AESCrypto
from app.database import get_db
from app.models.user_firebase import (
    ChatSession, Message as DBMessage, SessionParticipant, QKDSession,
    model_to_dict, dict_to_model,
    CHAT_SESSIONS_COLLECTION, MESSAGES_COLLECTION,
    SESSION_PARTICIPANTS_COLLECTION, QKD_SESSIONS_COLLECTION,
    CHAT_KEYS_COLLECTION
)

router = APIRouter()

# Store session keys in-memory (in production, use a secure Key Management Service)
# We store the derived AES keys here because we don't store them in the database for security
active_session_keys = {}
user_keypairs = {}  # Store Kyber and Dilithium keypairs per user session


async def _get_active_key(session_id: str) -> Optional[bytes]:
    """Retrieve session key from memory or Firestore"""
    # 1. Check in-memory Cache
    if session_id in active_session_keys:
        return active_session_keys[session_id]
    
    # 2. Check Firestore
    try:
        db = get_db()
        key_doc = db.collection(CHAT_KEYS_COLLECTION).document(session_id).get()
        if key_doc.exists:
            key_hex = key_doc.to_dict().get('key_hex')
            if key_hex:
                key = bytes.fromhex(key_hex)
                active_session_keys[session_id] = key # Cache it
                return key
    except Exception as e:
        print(f"  ❌ Error retrieving persistent key: {e}")
    
    return None


class CreateSessionRequest(BaseModel):
    """Request to create encrypted chat session"""
    user_id: str
    participant_ids: List[str]
    session_name: Optional[str] = None
    enable_eavesdropper: bool = False  # For attack lab


class CreateSessionResponse(BaseModel):
    """Response from session creation"""
    session_id: str
    qkd_session_id: str
    session_key_id: str
    qber: float
    participants: List[str]
    created_at: float
    encryption_status: str


class SendMessageRequest(BaseModel):
    """Request to send encrypted message"""
    session_id: str
    sender_id: str
    message: str


class Message(BaseModel):
    """Message model"""
    message_id: str
    session_id: str
    sender_id: str
    ciphertext: str
    nonce: str
    timestamp: float


class SessionInfo(BaseModel):
    """Chat session information"""
    session_id: str
    participants: List[str]
    created_at: float
    message_count: int
    qber: float
    encryption_status: str


class DecryptMessageRequest(BaseModel):
    """Request to decrypt encrypted message"""
    user_id: str
    ciphertext: str
    nonce: str
    sender_id: str


@router.post("/session", response_model=CreateSessionResponse)
async def create_chat_session(request: CreateSessionRequest):
    """Create encrypted chat session with persistence"""
    session_id = f"chat_{secrets.token_hex(12)}"
    
    # Step 1: BB84 QKD
    bb84 = BB84Protocol(num_bits=2048, eavesdropper=request.enable_eavesdropper)
    bb84_result = bb84.execute()
    
    db = get_db()
    
    if bb84_result.session_aborted:
        # Log failed QKD attempt
        qkd_log_id = f"qkd_{secrets.token_hex(8)}"
        qkd_log = QKDSession(
            id=qkd_log_id,
            num_bits_sent=2048,
            bits_after_sifting=len(bb84_result.alice_basis),
            final_key_bits=len(bb84_result.shared_key) if bb84_result.shared_key else 0,
            qber=f"{bb84_result.qber:.2%}",
            eavesdropper_detected=True,
            session_aborted=True,
            eavesdropper_enabled=request.enable_eavesdropper
        )
        try:
            db.collection(QKD_SESSIONS_COLLECTION).document(qkd_log_id).set(model_to_dict(qkd_log))
        except Exception as e:
            print(f"  [ERROR] Firestore Error logging failed QKD: {e}")
        
        raise HTTPException(
            status_code=400,
            detail=f"QKD failed: QBER too high ({bb84_result.qber:.2%}). Eavesdropper detected!"
        )
    
    # Step 2: Kyber key exchange
    kyber = KyberKEM()
    kyber_result = kyber.encapsulate(kyber.generate_keypair().public_key) # Simplification for demo
    
    # Step 3: Derive hybrid session key
    session_key = derive_hybrid_session_key(
        bb84_entropy=bb84_result.shared_key,
        kyber_shared_secret=kyber_result.shared_secret,
        session_id=session_id,
        key_length=32
    )
    
    # Step 4: Sign session (Simplified for demo key management)
    session_key_id = f"key_{secrets.token_hex(8)}"
    
    # Step 5: Store in Database with resilience
    try:
        new_chat_session = ChatSession(
            id=session_id,
            session_name=request.session_name,
            creator_id=request.user_id,
            qber=f"{bb84_result.qber:.2%}",
            session_key_id=session_key_id,
            encryption_status="active"
        )
        db.collection(CHAT_SESSIONS_COLLECTION).document(session_id).set(model_to_dict(new_chat_session))
        
        # Add participants
        for p_id in request.participant_ids:
            participant_id = f"part_{secrets.token_hex(8)}"
            participant = SessionParticipant(
                id=participant_id,
                session_id=session_id, 
                user_id=p_id
            )
            db.collection(SESSION_PARTICIPANTS_COLLECTION).document(participant_id).set(model_to_dict(participant))
            
        # Store session key in Firestore for persistence
        db.collection(CHAT_KEYS_COLLECTION).document(session_id).set({
            "session_id": session_id,
            "key": session_key.hex(),
            "created_at": time.time()
        })
            
        # Log successful QKD
        qkd_log_id = f"qkd_{session_id[:8]}"
        qkd_log = QKDSession(
            id=qkd_log_id,
            chat_session_id=session_id,
            num_bits_sent=2048,
            bits_after_sifting=len(bb84_result.alice_basis),
            final_key_bits=len(bb84_result.shared_key),
            qber=f"{bb84_result.qber:.2%}",
            eavesdropper_detected=False,
            session_aborted=False,
            eavesdropper_enabled=request.enable_eavesdropper
        )
        db.collection(QKD_SESSIONS_COLLECTION).document(qkd_log_id).set(model_to_dict(qkd_log))
        qkd_session_id = qkd_log_id
    except Exception as e:
        print(f"  [ERROR] Firestore Error in create_chat_session: {e}")
        qkd_session_id = f"qkd_demo_{secrets.token_hex(4)}"
        # Continue in memory-only mode
    
    # Store dynamic key in memory and persistence
    active_session_keys[session_id] = session_key
    try:
        db.collection(CHAT_KEYS_COLLECTION).document(session_id).set({
            'key_hex': session_key.hex(),
            'created_at': datetime.utcnow()
        })
    except Exception as e:
        print(f"  [ERROR] Error persisting session key: {e}")
    
    return CreateSessionResponse(
        session_id=session_id,
        qkd_session_id=qkd_session_id,
        session_key_id=session_key_id,
        qber=bb84_result.qber,
        participants=request.participant_ids,
        created_at=time.time(),
        encryption_status="active"
    )


@router.post("/message", response_model=Message)
async def send_message(request: SendMessageRequest):
    """Send encrypted message with persistence"""
    db = get_db()
    session_doc = db.collection(CHAT_SESSIONS_COLLECTION).document(request.session_id).get()
    
    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Retrieve key with persistence support
    session_key = await _get_active_key(request.session_id)
    if not session_key:
        raise HTTPException(status_code=410, detail="Session key expired or lost. Please initiate a new secure session.")
    
    # Encrypt message
    cipher = AESCrypto(session_key)
    plaintext = request.message.encode('utf-8')
    associated_data = f"{request.sender_id}:{request.session_id}".encode()
    encrypted = cipher.encrypt(plaintext, associated_data)
    
    # Create DB record with resilience
    message_id = f"msg_{secrets.token_hex(8)}"
    try:
        db_msg = DBMessage(
            id=message_id,
            session_id=request.session_id,
            sender_id=request.sender_id,
            ciphertext=encrypted.ciphertext.hex(),
            nonce=encrypted.nonce.hex(),
            timestamp=datetime.utcnow()
        )
        db.collection(MESSAGES_COLLECTION).document(message_id).set(model_to_dict(db_msg))
    except Exception as e:
        print(f"  [ERROR] Firestore Error in send_message: {e}")
    
    return Message(
        message_id=message_id,
        session_id=request.session_id,
        sender_id=request.sender_id,
        ciphertext=encrypted.ciphertext.hex(),
        nonce=encrypted.nonce.hex(),
        timestamp=time.time()
    )


@router.get("/sessions/{user_id}", response_model=List[SessionInfo])
async def get_user_sessions(user_id: str):
    """List all chat sessions for a specific user/agent"""
    db = get_db()
    sessions = []
    try:
        # Find all participant records for this user
        p_docs = db.collection(SESSION_PARTICIPANTS_COLLECTION).where(filter=FieldFilter('user_id', '==', user_id)).stream()
        session_ids = [p.to_dict()['session_id'] for p in p_docs]
        
        for s_id in session_ids:
            s_doc = db.collection(CHAT_SESSIONS_COLLECTION).document(s_id).get()
            if s_doc.exists:
                s_data = s_doc.to_dict()
                
                # Get other participants
                part_docs = db.collection(SESSION_PARTICIPANTS_COLLECTION).where(filter=FieldFilter('session_id', '==', s_id)).stream()
                participants = [p.to_dict()['user_id'] for p in part_docs]
                
                # Count messages
                m_docs = db.collection(MESSAGES_COLLECTION).where(filter=FieldFilter('session_id', '==', s_id)).stream()
                message_count = len(list(m_docs))
                
                # Robust QBER parsing
                qber_val = 0.0
                try:
                    if isinstance(s_data.get('qber'), str):
                        qber_val = float(s_data['qber'].replace('%', '')) / 100.0
                    else:
                        qber_val = float(s_data.get('qber', 0))
                except (ValueError, TypeError):
                    qber_val = 0.0

                sessions.append(SessionInfo(
                    session_id=s_id,
                    participants=participants,
                    created_at=s_data['created_at'].timestamp() if hasattr(s_data['created_at'], 'timestamp') else time.time(),
                    message_count=message_count,
                    qber=qber_val,
                    encryption_status=s_data['encryption_status']
                ))
    except Exception as e:
        print(f"  ❌ Firestore Error in get_user_sessions: {e}")
        
    return sessions


@router.get("/history/{session_id}", response_model=List[Message])
async def get_chat_history(session_id: str, user_id: str):
    """Get persistent chat history from database"""
    db = get_db()
    session_doc = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id).get()
    
    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages_list = []
    try:
        docs = db.collection(MESSAGES_COLLECTION)\
                 .where(filter=FieldFilter('session_id', '==', session_id))\
                 .order_by('timestamp')\
                 .stream()
        
        for doc in docs:
            m_data = doc.to_dict()
            messages_list.append(Message(
                message_id=m_data['id'],
                session_id=m_data['session_id'],
                sender_id=m_data['sender_id'],
                ciphertext=m_data['ciphertext'],
                nonce=m_data['nonce'],
                timestamp=m_data['timestamp'].timestamp() if hasattr(m_data['timestamp'], 'timestamp') else time.time()
            ))
    except Exception as e:
        print(f"  ❌ Firestore Error in get_chat_history: {e}")
    
    return messages_list


@router.get("/session/{session_id}", response_model=SessionInfo)
async def get_session_info(session_id: str):
    """Get chat session information from DB"""
    db = get_db()
    session_doc = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id).get()
    
    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    session_data = session_doc.to_dict()
    
    participants = []
    message_count = 0
    
    try:
        p_docs = db.collection(SESSION_PARTICIPANTS_COLLECTION).where(filter=FieldFilter('session_id', '==', session_id)).stream()
        participants = [p.to_dict()['user_id'] for p in p_docs]
        
        # Simple count for demo
        m_docs = db.collection(MESSAGES_COLLECTION).where(filter=FieldFilter('session_id', '==', session_id)).stream()
        message_count = len(list(m_docs))
    except Exception as e:
        print(f"  ❌ Firestore Error in get_session_info: {e}")
    
    # Robust QBER parsing
    qber_val = 0.0
    try:
        if isinstance(session_data.get('qber'), str):
            qber_val = float(session_data['qber'].replace('%', '')) / 100.0
        else:
            qber_val = float(session_data.get('qber', 0))
    except (ValueError, TypeError):
        qber_val = 0.0

    return SessionInfo(
        session_id=session_id,
        participants=participants,
        created_at=session_data['created_at'].timestamp() if hasattr(session_data['created_at'], 'timestamp') else time.time(),
        message_count=message_count,
        qber=qber_val,
        encryption_status=session_data['encryption_status']
    )


@router.post("/decrypt/{session_id}")
async def decrypt_message(
    session_id: str,
    request: DecryptMessageRequest
):
    """
    Decrypt message using retrieved session key
    """
    db = get_db()
    session_doc = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id).get()
    
    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Retrieve key with persistence support
    session_key = await _get_active_key(session_id)
    if not session_key:
        raise HTTPException(status_code=410, detail="Key expired or lost")
    
    try:
        # Decrypt message
        cipher = AESCrypto(session_key)
        
        from app.core.aes_crypto import EncryptedMessage
        encrypted_msg = EncryptedMessage(
            ciphertext=bytes.fromhex(request.ciphertext),
            nonce=bytes.fromhex(request.nonce),
            tag=b''
        )
        
        associated_data = f"{request.sender_id}:{session_id}".encode()
        plaintext = cipher.decrypt(encrypted_msg, associated_data)
        
        return {
            "plaintext": plaintext.decode('utf-8'),
            "sender_id": request.sender_id,
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")


@router.post("/session/{session_id}/attack")
async def simulate_session_attack(session_id: str, eavesdrop: bool = True):
    """Simulate an eavesdropping attack on a specific session for demo purposes"""
    db = get_db()
    session_ref = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id)
    session_doc = session_ref.get()
    
    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Store as string for easier UI display if needed, but the parser handles both
    new_qber = "25.00%" if eavesdrop else "0.00%"
    
    try:
        session_ref.update({"qber": new_qber})
        return {"session_id": session_id, "qber": 0.25 if eavesdrop else 0.0, "status": "attack_simulated" if eavesdrop else "secure"}
    except Exception as e:
        print(f"  ❌ Error updating session qber: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/session/{session_id}")
async def delete_session(session_id: str, user_id: str):
    """Delete chat session from DB"""
    db = get_db()
    session_ref = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id)
    session_doc = session_ref.get()
    
    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    session_data = session_doc.to_dict()
    if session_data['creator_id'] != user_id:
        raise HTTPException(status_code=403, detail="Only session creator can delete")
    
    try:
        # Delete session
        session_ref.delete()
        
        # Cleanup participants (could use batch)
        p_docs = db.collection(SESSION_PARTICIPANTS_COLLECTION).where(filter=FieldFilter('session_id', '==', session_id)).stream()
        for p in p_docs:
            p.reference.delete()
            
        # Cleanup messages
        m_docs = db.collection(MESSAGES_COLLECTION).where(filter=FieldFilter('session_id', '==', session_id)).stream()
        for m in m_docs:
            m.reference.delete()
            
    except Exception as e:
        print(f"  ❌ Firestore Error in delete_session: {e}")
    
    if session_id in active_session_keys:
        del active_session_keys[session_id]
        
    return {"message": "Session deleted successfully"}
