"""
HKDF (HMAC-based Key Derivation Function)

This module implements hybrid key derivation combining:
- BB84 quantum entropy
- Kyber post-quantum shared secret

The combination provides defense-in-depth:
- If quantum channel is compromised → Kyber still protects
- If Kyber is broken (future attack) → BB84 entropy still contributes
- Both must be broken simultaneously to compromise the key

This is the "hybrid" in our hybrid quantum-safe architecture.
"""

import hashlib
import hmac
from typing import Optional


class HKDF:
    """
    HMAC-based Key Derivation Function (RFC 5869)
    
    HKDF is used to:
    1. Extract: Combine multiple entropy sources into a pseudorandom key
    2. Expand: Derive multiple keys from the extracted key
    
    In our system:
    - Input: BB84 entropy || Kyber shared secret
    - Output: AES-256 session key (32 bytes)
    
    Security Properties:
    - Combines quantum and post-quantum entropy
    - Cryptographically strong even if one input is weak
    - Provides forward secrecy when inputs are ephemeral
    """
    
    def __init__(self, hash_algorithm: str = 'sha256'):
        """
        Initialize HKDF
        
        Args:
            hash_algorithm: Hash function to use (default: SHA-256)
        """
        self.hash_algorithm = hash_algorithm
        self.hash_len = hashlib.new(hash_algorithm).digest_size
    
    def extract(self, salt: Optional[bytes], input_key_material: bytes) -> bytes:
        """
        HKDF-Extract: Extract a pseudorandom key from input material
        
        Args:
            salt: Optional salt (if None, uses zero-filled bytes)
            input_key_material: Input entropy (BB84 + Kyber)
        
        Returns:
            Pseudorandom key (PRK)
        """
        if salt is None:
            salt = bytes([0] * self.hash_len)
        
        return hmac.new(salt, input_key_material, self.hash_algorithm).digest()
    
    def expand(self, prk: bytes, info: Optional[bytes], length: int) -> bytes:
        """
        HKDF-Expand: Expand PRK into output keying material
        
        Args:
            prk: Pseudorandom key from extract phase
            info: Optional context/application info
            length: Desired output length in bytes
        
        Returns:
            Output keying material (OKM)
        """
        if info is None:
            info = b''
        
        if length > 255 * self.hash_len:
            raise ValueError("Length too large for HKDF expansion")
        
        okm = b''
        previous = b''
        counter = 1
        
        while len(okm) < length:
            previous = hmac.new(
                prk,
                previous + info + bytes([counter]),
                self.hash_algorithm
            ).digest()
            okm += previous
            counter += 1
        
        return okm[:length]
    
    def derive_key(
        self,
        input_key_material: bytes,
        length: int = 32,
        salt: Optional[bytes] = None,
        info: Optional[bytes] = None
    ) -> bytes:
        """
        Full HKDF: Extract + Expand in one step
        
        Args:
            input_key_material: Combined entropy sources
            length: Output key length (default: 32 bytes for AES-256)
            salt: Optional salt
            info: Optional context info
        
        Returns:
            Derived key
        """
        prk = self.extract(salt, input_key_material)
        return self.expand(prk, info, length)


def derive_hybrid_session_key(
    bb84_entropy: bytes,
    kyber_shared_secret: bytes,
    session_id: str,
    key_length: int = 32
) -> bytes:
    """
    Derive hybrid quantum-safe session key
    
    This is the core of our hybrid security model:
    - Combines BB84 quantum entropy with Kyber PQC secret
    - Uses session ID as context to ensure unique keys per session
    - Produces AES-256 key for message encryption
    
    Args:
        bb84_entropy: Entropy from BB84 QKD protocol
        kyber_shared_secret: Shared secret from Kyber KEM
        session_id: Unique session identifier
        key_length: Output key length (default: 32 bytes)
    
    Returns:
        AES-256 session key
    """
    hkdf = HKDF(hash_algorithm='sha256')
    
    # Combine both entropy sources
    combined_input = bb84_entropy + kyber_shared_secret
    
    # Use session ID as context info
    context_info = f"quantum-safe-chat-session-{session_id}".encode('utf-8')
    
    # Derive session key
    session_key = hkdf.derive_key(
        input_key_material=combined_input,
        length=key_length,
        salt=None,  # Could use timestamp or random salt
        info=context_info
    )
    
    return session_key


def demonstrate_hybrid_kdf():
    """
    Demonstrate hybrid key derivation
    """
    print("=" * 70)
    print("Hybrid Quantum-Safe Key Derivation")
    print("=" * 70)
    
    # Simulate BB84 entropy (would come from qkd_bb84.py)
    bb84_entropy = bytes.fromhex(
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
        "d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
    )
    
    # Simulate Kyber shared secret (would come from pqc_kyber.py)
    kyber_secret = bytes.fromhex(
        "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
        "7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
    )
    
    session_id = "session-12345-alice-bob"
    
    print("\n[INPUT SOURCES]")
    print(f"BB84 Entropy ({len(bb84_entropy)} bytes):")
    print(f"  {bb84_entropy.hex()}")
    print(f"\nKyber Shared Secret ({len(kyber_secret)} bytes):")
    print(f"  {kyber_secret.hex()}")
    print(f"\nSession ID: {session_id}")
    
    print("\n[KEY DERIVATION]")
    session_key = derive_hybrid_session_key(
        bb84_entropy=bb84_entropy,
        kyber_shared_secret=kyber_secret,
        session_id=session_id,
        key_length=32
    )
    
    print(f"Derived AES-256 Session Key ({len(session_key)} bytes):")
    print(f"  {session_key.hex()}")
    
    print("\n[SECURITY PROPERTIES]")
    print("✓ Combines quantum (BB84) and post-quantum (Kyber) entropy")
    print("✓ Cryptographically strong even if one source is compromised")
    print("✓ Session-specific keys (different session_id → different key)")
    print("✓ Forward secrecy (ephemeral BB84 + Kyber keys)")
    
    print("\n[DEFENSE IN DEPTH]")
    print("Scenario 1: Quantum channel compromised (Eve intercepts BB84)")
    print("  → Kyber secret still protects the session key")
    print("\nScenario 2: Future attack breaks Kyber")
    print("  → BB84 entropy still contributes randomness")
    print("\nScenario 3: Both compromised")
    print("  → Required for attacker to derive session key")
    print("  → Extremely unlikely with proper implementation")
    
    print("\n" + "=" * 70)
    print("This hybrid approach is why our system is quantum-safe:")
    print("  • Not relying on single cryptographic primitive")
    print("  • Combining information-theoretic (BB84) + computational (Kyber)")
    print("  • Future-proof against advances in quantum computing")
    print("=" * 70)


if __name__ == "__main__":
    demonstrate_hybrid_kdf()
