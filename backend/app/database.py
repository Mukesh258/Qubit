"""
Database Module - Firebase Firestore Integration

This module provides Firestore database access for the application.
Replaces the previous SQLAlchemy/PostgreSQL implementation.
"""

from app.firebase_config import get_db, test_connection, initialize_firebase

__all__ = ['get_db', 'test_connection', 'initialize_firebase']
