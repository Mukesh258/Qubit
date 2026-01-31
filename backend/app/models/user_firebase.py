"""
Firestore Data Models for Quantum-Safe Chat

Pydantic models and helper functions for Firestore database operations.
Replaces SQLAlchemy models with Firestore document structure.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from firebase_admin import firestore


# Pydantic Models for data validation

class User(BaseModel):
    """User model"""
    id: str
    email: str
    name: str
    password: Optional[str] = None  # Plain text for demo; use hashing in production
    oauth_provider: str = "google"
    oauth_id: str
    dilithium_public_key: Optional[bytes] = None  # For signatures
    kyber_public_key: Optional[bytes] = None      # For key exchange
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Config:
        arbitrary_types_allowed = True


class UserSession(BaseModel):
    """Active user sessions (storage for access tokens)"""
    id: str
    user_id: str
    access_token: str
    created_at: datetime = datetime.utcnow()
    expires_at: Optional[datetime] = None


class Agent(BaseModel):
    """Agent model"""
    id: str
    email: str
    name: str
    password: Optional[str] = None  # Plain text for demo
    role: str = "Agent"
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Config:
        arbitrary_types_allowed = True


class AgentSession(BaseModel):
    """Active agent sessions (storage for access tokens)"""
    id: str
    agent_id: str
    access_token: str
    created_at: datetime = datetime.utcnow()
    expires_at: Optional[datetime] = None


class ChatSession(BaseModel):
    """Chat session model"""
    id: str
    session_name: Optional[str] = None
    creator_id: str
    qber: str  # Quantum Bit Error Rate
    session_key_id: str
    encryption_status: str = "active"  # active, rotated, expired
    created_at: datetime = datetime.utcnow()
    expires_at: Optional[datetime] = None


class SessionParticipant(BaseModel):
    """Session participant model"""
    id: str
    session_id: str
    user_id: str
    joined_at: datetime = datetime.utcnow()


class Message(BaseModel):
    """Encrypted message model"""
    id: str
    session_id: str
    sender_id: str
    ciphertext: str  # Hex-encoded
    nonce: str  # Hex-encoded
    timestamp: datetime = datetime.utcnow()
    is_file: bool = False
    file_name: Optional[str] = None
    file_size: Optional[int] = None


class QKDSession(BaseModel):
    """QKD session log for auditing"""
    id: str
    chat_session_id: Optional[str] = None
    num_bits_sent: int
    bits_after_sifting: int
    final_key_bits: int
    qber: str
    eavesdropper_detected: bool = False
    session_aborted: bool = False
    eavesdropper_enabled: bool = False
    created_at: datetime = datetime.utcnow()


# Helper functions for Firestore operations

def model_to_dict(model: BaseModel) -> Dict[str, Any]:
    """Convert Pydantic model to dictionary for Firestore"""
    data = model.dict()
    # Convert datetime objects to Firestore timestamps
    for key, value in data.items():
        if isinstance(value, datetime):
            data[key] = value
        elif isinstance(value, bytes):
            # Convert bytes to base64 string for storage
            import base64
            data[key] = base64.b64encode(value).decode('utf-8')
    return data


def dict_to_model(data: Dict[str, Any], model_class: type) -> BaseModel:
    """Convert Firestore document to Pydantic model"""
    # Handle bytes fields
    if 'dilithium_public_key' in data and data['dilithium_public_key']:
        import base64
        data['dilithium_public_key'] = base64.b64decode(data['dilithium_public_key'])
    if 'kyber_public_key' in data and data['kyber_public_key']:
        import base64
        data['kyber_public_key'] = base64.b64decode(data['kyber_public_key'])
    
    return model_class(**data)


# Firestore collection names
USERS_COLLECTION = 'users'
USER_SESSIONS_COLLECTION = 'user_sessions'
AGENTS_COLLECTION = 'agents'
AGENT_SESSIONS_COLLECTION = 'agent_sessions'
CHAT_SESSIONS_COLLECTION = 'chat_sessions'
MESSAGES_COLLECTION = 'messages'
SESSION_PARTICIPANTS_COLLECTION = 'session_participants'
QKD_SESSIONS_COLLECTION = 'qkd_sessions'
CHAT_KEYS_COLLECTION = 'chat_keys'


def init_db():
    """Initialize Firestore (no schema needed, but can set up indexes)"""
    # Firestore is schemaless, but you can create composite indexes
    # through Firebase Console or firebase.indexes.json
    print("  ✓ Firestore Schema Ready (NoSQL)")
    pass
