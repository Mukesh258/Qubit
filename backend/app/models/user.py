"""
Database Models for Quantum-Safe Chat

SQLAlchemy models for PostgreSQL database.
For production deployment with Supabase.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(String(50), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    oauth_provider = Column(String(50), default="google")
    oauth_id = Column(String(255), unique=True, nullable=False)
    
    # Post-quantum cryptography keys
    dilithium_public_key = Column(LargeBinary, nullable=True)  # For signatures
    kyber_public_key = Column(LargeBinary, nullable=True)      # For key exchange
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_sessions = relationship("ChatSession", back_populates="creator", foreign_keys="ChatSession.creator_id")
    messages = relationship("Message", back_populates="sender")
    active_sessions = relationship("UserSession", back_populates="user")


class UserSession(Base):
    """Active user sessions (storage for access tokens)"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    access_token = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="active_sessions")


class ChatSession(Base):
    """Chat session model"""
    __tablename__ = "chat_sessions"
    
    id = Column(String(50), primary_key=True)
    session_name = Column(String(255), nullable=True)
    creator_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    
    # Cryptographic metadata
    qber = Column(String(20), nullable=False)  # Quantum Bit Error Rate
    session_key_id = Column(String(100), nullable=False)
    encryption_status = Column(String(20), default="active")  # active, rotated, expired
    
    # Session data
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    creator = relationship("User", back_populates="created_sessions", foreign_keys=[creator_id])
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    participants = relationship("SessionParticipant", back_populates="session", cascade="all, delete-orphan")


class SessionParticipant(Base):
    """Session participants (many-to-many)"""
    __tablename__ = "session_participants"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(50), ForeignKey("chat_sessions.id"), nullable=False)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="participants")
    user = relationship("User")


class Message(Base):
    """Encrypted message model"""
    __tablename__ = "messages"
    
    id = Column(String(50), primary_key=True)
    session_id = Column(String(50), ForeignKey("chat_sessions.id"), nullable=False)
    sender_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    
    # Encrypted content
    ciphertext = Column(Text, nullable=False)  # Hex-encoded
    nonce = Column(String(100), nullable=False)  # Hex-encoded
    
    # Metadata
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_file = Column(Boolean, default=False)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    sender = relationship("User", back_populates="messages")


class QKDSession(Base):
    """QKD session log for auditing"""
    __tablename__ = "qkd_sessions"
    
    id = Column(String(50), primary_key=True)
    chat_session_id = Column(String(50), ForeignKey("chat_sessions.id"), nullable=True)
    
    # QKD parameters
    num_bits_sent = Column(Integer, nullable=False)
    bits_after_sifting = Column(Integer, nullable=False)
    final_key_bits = Column(Integer, nullable=False)
    qber = Column(String(20), nullable=False)
    
    # Security
    eavesdropper_detected = Column(Boolean, default=False)
    session_aborted = Column(Boolean, default=False)
    eavesdropper_enabled = Column(Boolean, default=False)  # For attack lab
    
    created_at = Column(DateTime, default=datetime.utcnow)


# Database initialization
def init_db(engine):
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def get_db_url(
    user: str = "postgres",
    password: str = "password",
    host: str = "localhost",
    port: int = 5432,
    database: str = "quantum_chat"
) -> str:
    """Generate database URL"""
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"
