"""
WebSocket Chat Handler

Real-time encrypted chat using WebSocket connections.
Messages are encrypted end-to-end using session keys.
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Any
import json
import time
from datetime import datetime
import secrets

from app.models.user_firebase import (
    Message as DBMessage, 
    model_to_dict, 
    MESSAGES_COLLECTION
)

# Store active connections per session
active_connections: Dict[str, Set[WebSocket]] = {}


class ConnectionManager:
    """Manage WebSocket connections for chat sessions"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept WebSocket connection and add to session"""
        await websocket.accept()
        
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        
        self.active_connections[session_id].add(websocket)
        
        # Notify others that user joined
        await self.broadcast(
            session_id,
            {
                "type": "user_joined",
                "session_id": session_id,
                "timestamp": time.time(),
                "connection_count": len(self.active_connections[session_id])
            },
            exclude=websocket
        )
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        """Remove WebSocket connection from session"""
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            
            # Clean up empty sessions
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific WebSocket"""
        await websocket.send_json(message)
    
    async def broadcast(self, session_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast message to all connections in session"""
        if session_id not in self.active_connections:
            return
        
        disconnected = set()
        
        for connection in self.active_connections[session_id]:
            if connection == exclude:
                continue
            
            try:
                await connection.send_json(message)
            except Exception:
                # Mark for removal if send fails
                disconnected.add(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.active_connections[session_id].discard(connection)


# Global connection manager
manager = ConnectionManager()


async def handle_chat_websocket(websocket: WebSocket, session_id: str, db: Any):
    """
    Handle WebSocket connection for chat session with Firestore persistence
    """
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Add timestamp if not present
            if "timestamp" not in message:
                message["timestamp"] = time.time()
            
            # Add session_id
            message["session_id"] = session_id
            
            # Handle different message types
            if message.get("type") == "message":
                # Check if message_id is provided by client (meaning already saved via API)
                client_message_id = message.get("message_id")
                
                if client_message_id:
                    message_id = client_message_id
                    # Skip DB save since it's already persisted via HTTP endpoint
                else:
                    # Persist to Firestore with resilience
                    message_id = f"msg_ws_{secrets.token_hex(4)}"
                    try:
                        db_msg = DBMessage(
                            id=message_id,
                            session_id=session_id,
                            sender_id=message.get("sender_id"),
                            ciphertext=message.get("ciphertext"),
                            nonce=message.get("nonce"),
                            timestamp=datetime.utcnow()
                        )
                        db.collection(MESSAGES_COLLECTION).document(message_id).set(model_to_dict(db_msg))
                    except Exception as e:
                        print(f"  ❌ Firestore Error in WebSocket persistence: {e}")

                # Broadcast encrypted message to all participants
                await manager.broadcast(
                    session_id,
                    {
                        "type": "message",
                        "sender_id": message.get("sender_id"),
                        "ciphertext": message.get("ciphertext"),
                        "nonce": message.get("nonce"),
                        "timestamp": message["timestamp"],
                        "session_id": session_id,
                        "message_id": message_id
                    }
                )
            
            elif message.get("type") == "typing":
                # Broadcast typing indicator
                await manager.broadcast(
                    session_id,
                    {
                        "type": "typing",
                        "sender_id": message.get("sender_id"),
                        "is_typing": message.get("is_typing", True),
                        "timestamp": message["timestamp"]
                    },
                    exclude=websocket
                )
            
            elif message.get("type") == "attack":
                # Broadcast attack status
                await manager.broadcast(
                    session_id,
                    {
                        "type": "attack",
                        "sender_id": message.get("sender_id"),
                        "active": message.get("active", True),
                        "qber": message.get("qber", 0.25),
                        "timestamp": message["timestamp"]
                    }
                )
            
            elif message.get("type") == "read":
                # Broadcast read receipt
                await manager.broadcast(
                    session_id,
                    {
                        "type": "read",
                        "sender_id": message.get("sender_id"),
                        "message_id": message.get("message_id"),
                        "timestamp": message["timestamp"]
                    }
                )
            
            elif message.get("type") == "key_rotation":
                # Notify about session key rotation
                await manager.broadcast(
                    session_id,
                    {
                        "type": "key_rotation",
                        "new_key_id": message.get("new_key_id"),
                        "timestamp": message["timestamp"]
                    }
                )
            
            else:
                # Echo unknown message types
                await manager.send_personal_message(
                    {
                        "type": "error",
                        "message": f"Unknown message type: {message.get('type')}",
                        "timestamp": time.time()
                    },
                    websocket
                )
    
    except WebSocketDisconnect:
        # Handle disconnection
        manager.disconnect(websocket, session_id)
        
        # Notify others that user left
        await manager.broadcast(
            session_id,
            {
                "type": "user_left",
                "session_id": session_id,
                "timestamp": time.time(),
                "connection_count": len(manager.active_connections.get(session_id, set()))
            }
        )
    
    except Exception as e:
        # Handle other errors
        print(f"WebSocket error in session {session_id}: {e}")
        manager.disconnect(websocket, session_id)
