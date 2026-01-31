"""
AES-256-GCM Authenticated Encryption

This module provides authenticated encryption using AES-256 in GCM mode.
Session keys are derived from the hybrid BB84+Kyber KDF.

Why AES-256-GCM?
- Confidentiality: AES-256 encryption (quantum-resistant with 256-bit keys)
- Integrity: GCM authentication tag prevents tampering
- Efficiency: Hardware-accelerated on modern CPUs
- Standard: NIST-approved, widely used and tested

Quantum Resistance:
- Grover's algorithm reduces AES-256 security to 128-bit (still secure)
- AES-128 would only provide 64-bit quantum security (insufficient)
- AES-256 is the recommended choice for post-quantum security
"""

import os
from typing import Tuple
from dataclasses import dataclass
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend


@dataclass
class EncryptedMessage:
    """Encrypted message with authentication"""
    ciphertext: bytes
    nonce: bytes
    tag: bytes  # Authentication tag (included in ciphertext for GCM)
    
    def to_bytes(self) -> bytes:
        """Serialize for transmission"""
        # Format: nonce_length (1 byte) || nonce || ciphertext (includes tag)
        return bytes([len(self.nonce)]) + self.nonce + self.ciphertext
    
    @staticmethod
    def from_bytes(data: bytes) -> 'EncryptedMessage':
        """Deserialize from transmission"""
        nonce_length = data[0]
        nonce = data[1:1+nonce_length]
        ciphertext = data[1+nonce_length:]
        # GCM tag is included in ciphertext
        return EncryptedMessage(ciphertext=ciphertext, nonce=nonce, tag=b'')


class AESCrypto:
    """
    AES-256-GCM Authenticated Encryption
    
    Features:
    - Encryption + Authentication in one operation
    - Prevents tampering and forgery
    - Nonce-based (never reuse nonce with same key!)
    - Associated data support (encrypt-then-MAC)
    
    Security:
    - 256-bit keys provide 128-bit quantum security
    - GCM mode provides authentication (prevents tampering)
    - Random nonces prevent replay attacks
    - Session-based keys provide forward secrecy
    """
    
    NONCE_SIZE = 12  # 96 bits (recommended for GCM)
    KEY_SIZE = 32    # 256 bits
    
    def __init__(self, session_key: bytes):
        """
        Initialize AES-GCM cipher
        
        Args:
            session_key: 256-bit session key from hybrid KDF
        """
        if len(session_key) != self.KEY_SIZE:
            raise ValueError(f"Session key must be {self.KEY_SIZE} bytes")
        
        self.aesgcm = AESGCM(session_key)
    
    def encrypt(
        self,
        plaintext: bytes,
        associated_data: bytes = None
    ) -> EncryptedMessage:
        """
        Encrypt and authenticate message
        
        Args:
            plaintext: Message to encrypt
            associated_data: Optional data to authenticate (not encrypted)
        
        Returns:
            EncryptedMessage with ciphertext, nonce, and tag
        """
        # Generate random nonce (MUST be unique for each message)
        nonce = os.urandom(self.NONCE_SIZE)
        
        # Encrypt and authenticate
        # GCM automatically includes authentication tag in ciphertext
        ciphertext = self.aesgcm.encrypt(nonce, plaintext, associated_data)
        
        return EncryptedMessage(
            ciphertext=ciphertext,
            nonce=nonce,
            tag=b''  # Tag is included in ciphertext for GCM
        )
    
    def decrypt(
        self,
        encrypted_message: EncryptedMessage,
        associated_data: bytes = None
    ) -> bytes:
        """
        Decrypt and verify message
        
        Args:
            encrypted_message: Encrypted message with nonce
            associated_data: Optional associated data (must match encryption)
        
        Returns:
            Decrypted plaintext
        
        Raises:
            cryptography.exceptions.InvalidTag: If authentication fails
        """
        try:
            plaintext = self.aesgcm.decrypt(
                encrypted_message.nonce,
                encrypted_message.ciphertext,
                associated_data
            )
            return plaintext
        except Exception as e:
            raise ValueError(f"Decryption failed: {e}")
    
    @staticmethod
    def get_info() -> dict:
        """Get information about AES-GCM"""
        return {
            "algorithm": "AES-256-GCM",
            "key_size": "256 bits",
            "nonce_size": "96 bits",
            "quantum_security": "128-bit (Grover's algorithm)",
            "classical_security": "256-bit",
            "mode": "Galois/Counter Mode (GCM)",
            "features": [
                "Authenticated encryption",
                "Prevents tampering",
                "Hardware-accelerated",
                "NIST-approved"
            ],
            "nist_status": "FIPS 197 (AES), SP 800-38D (GCM)"
        }


def demonstrate_aes_encryption():
    """
    Demonstrate AES-256-GCM encryption
    """
    print("=" * 70)
    print("AES-256-GCM Authenticated Encryption Demonstration")
    print("=" * 70)
    
    # Display info
    info = AESCrypto.get_info()
    print("\n[AES-GCM INFO]")
    for key, value in info.items():
        if isinstance(value, list):
            print(f"  {key}:")
            for item in value:
                print(f"    • {item}")
        else:
            print(f"  {key}: {value}")
    
    # Simulate session key (would come from kdf.py)
    session_key = os.urandom(32)
    print(f"\n[SESSION KEY]")
    print(f"Session key (32 bytes): {session_key.hex()}")
    
    # Initialize cipher
    cipher = AESCrypto(session_key)
    
    # Test 1: Basic encryption
    print("\n[TEST 1] Basic Message Encryption")
    message = b"This is a quantum-safe encrypted message!"
    print(f"Plaintext: {message.decode()}")
    
    encrypted = cipher.encrypt(message)
    print(f"Nonce: {encrypted.nonce.hex()}")
    print(f"Ciphertext: {encrypted.ciphertext.hex()}")
    print(f"Total size: {len(encrypted.to_bytes())} bytes")
    
    decrypted = cipher.decrypt(encrypted)
    print(f"Decrypted: {decrypted.decode()}")
    print(f"Match: {'✓ YES' if decrypted == message else '✗ NO'}")
    
    # Test 2: Encryption with associated data
    print("\n[TEST 2] Encryption with Associated Data")
    message2 = b"Secret payload"
    associated_data = b"sender:alice,receiver:bob,timestamp:1234567890"
    print(f"Plaintext: {message2.decode()}")
    print(f"Associated data: {associated_data.decode()}")
    
    encrypted2 = cipher.encrypt(message2, associated_data)
    print(f"Ciphertext: {encrypted2.ciphertext.hex()}")
    
    decrypted2 = cipher.decrypt(encrypted2, associated_data)
    print(f"Decrypted: {decrypted2.decode()}")
    print(f"Match: {'✓ YES' if decrypted2 == message2 else '✗ NO'}")
    
    # Test 3: Tampering detection
    print("\n[TEST 3] Tampering Detection")
    message3 = b"Original message"
    encrypted3 = cipher.encrypt(message3)
    
    # Tamper with ciphertext
    tampered = EncryptedMessage(
        ciphertext=encrypted3.ciphertext[:-1] + b'\x00',  # Flip last byte
        nonce=encrypted3.nonce,
        tag=encrypted3.tag
    )
    
    try:
        cipher.decrypt(tampered)
        print("✗ FAILED: Tampering not detected!")
    except ValueError as e:
        print(f"✓ SUCCESS: Tampering detected - {e}")
    
    # Test 4: Wrong associated data
    print("\n[TEST 4] Wrong Associated Data")
    message4 = b"Message with metadata"
    correct_ad = b"metadata:correct"
    wrong_ad = b"metadata:wrong"
    
    encrypted4 = cipher.encrypt(message4, correct_ad)
    
    try:
        cipher.decrypt(encrypted4, wrong_ad)
        print("✗ FAILED: Wrong associated data not detected!")
    except ValueError as e:
        print(f"✓ SUCCESS: Wrong associated data detected - {e}")
    
    print("\n" + "=" * 70)
    print("Why AES-256-GCM for Quantum-Safe Chat:")
    print("  • AES-256 provides 128-bit quantum security (Grover's algorithm)")
    print("  • GCM mode provides authentication (prevents tampering)")
    print("  • Session keys derived from BB84+Kyber (hybrid security)")
    print("  • Forward secrecy through ephemeral session keys")
    print("  • Hardware acceleration for performance")
    print("=" * 70)


if __name__ == "__main__":
    demonstrate_aes_encryption()
