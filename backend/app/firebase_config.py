"""
Firebase Configuration and Initialization

This module initializes Firebase Admin SDK and provides
Firestore database access for the Quantum-Safe Chat application.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials"""
    try:
        # Check if already initialized
        if len(firebase_admin._apps) > 0:
            print("  [INFO] Firebase already initialized")
            return firestore.client()
        
        # Get Firebase credentials path from environment
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        
        if cred_path and os.path.exists(cred_path):
            # Initialize with service account file
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("  [INFO] Firebase initialized with service account")
        else:
            # Try to initialize with environment variable JSON
            cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
            if cred_json:
                import json
                cred_dict = json.loads(cred_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("  [INFO] Firebase initialized with JSON credentials")
            else:
                # Initialize with default credentials (for local development/testing)
                firebase_admin.initialize_app()
                print("  [INFO] Firebase initialized with default credentials")
        
        return firestore.client()
    
    except Exception as e:
        print(f"  [ERROR] Firebase Initialization Failed: {e}")
        raise


def test_connection(timeout_seconds: float = 10.0):
    """Test if Firestore is reachable (with timeout to avoid long startup hang)."""
    import concurrent.futures
    def _do_test():
        db = get_db()
        test_ref = db.collection('_connection_test').document('test')
        test_ref.set({'timestamp': firestore.SERVER_TIMESTAMP})
        test_ref.delete()
        return True
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(_do_test)
            if fut.result(timeout=timeout_seconds):
                return True
    except concurrent.futures.TimeoutError:
        _log_connectivity_error("Connection timed out. Check network or Firebase config.")
        return False
    except Exception as e:
        err_str = str(e).lower()
        if "dns" in err_str or "getaddrinfo" in err_str or "11001" in err_str or "unavailable" in err_str:
            _log_connectivity_error("Network/DNS unreachable. Ensure internet access and firewall allow firestore.googleapis.com.")
        else:
            _log_connectivity_error(str(e))
        return False
    return False


def _log_connectivity_error(msg: str):
    """Single-line connectivity failure message (no stack trace)."""
    print(f"  [WARNING] Firestore connectivity: {msg}")


# Global Firestore client
_db_client = None

def get_db():
    """Get Firestore database client (singleton pattern)"""
    global _db_client
    if _db_client is None:
        _db_client = initialize_firebase()
    return _db_client
