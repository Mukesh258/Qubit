"""
Firebase Connection Test Script

Run this script to verify your Firebase setup is working correctly.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from app.firebase_config import initialize_firebase, test_connection

def main():
    """Test Firebase connection"""
    print("=" * 60)
    print("Firebase Connection Test")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    # Check if credentials are configured
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    
    if not cred_path and not cred_json:
        print("❌ ERROR: No Firebase credentials found!")
        print("\nPlease set one of the following in your .env file:")
        print("  1. FIREBASE_CREDENTIALS_PATH=path/to/firebase-credentials.json")
        print("  2. FIREBASE_CREDENTIALS_JSON='{...json content...}'")
        print("\nSee FIREBASE_SETUP_GUIDE.md for detailed instructions.")
        return False
    
    if cred_path:
        print(f"📄 Using credentials file: {cred_path}")
        if not os.path.exists(cred_path):
            print(f"❌ ERROR: File not found: {cred_path}")
            return False
    else:
        print("📄 Using credentials from FIREBASE_CREDENTIALS_JSON env variable")
    
    print("\n🔄 Initializing Firebase...")
    try:
        db = initialize_firebase()
        print("✅ Firebase initialized successfully!")
        print(f"📊 Database client: {type(db).__name__}")
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        return False
    
    print("\n🔄 Testing Firestore connection...")
    if test_connection():
        print("✅ Firestore connection successful!")
        print("\n✨ All tests passed! Your Firebase setup is working correctly.")
        return True
    else:
        print("❌ Firestore connection failed!")
        print("\nPossible issues:")
        print("  1. Incorrect credentials")
        print("  2. Firestore not enabled in Firebase Console")
        print("  3. Network connectivity issues")
        return False

if __name__ == "__main__":
    print()
    success = main()
    print("\n" + "=" * 60)
    if success:
        print("✅ You can now run: uvicorn app.main:app --reload")
    else:
        print("❌ Please fix the issues above before proceeding")
    print("=" * 60)
    print()
    
    sys.exit(0 if success else 1)
