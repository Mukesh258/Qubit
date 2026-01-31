"""
BB84 Quantum Key Distribution Protocol Simulation

This module simulates the BB84 QKD protocol with eavesdropping detection.
NOTE: This is a SIMULATION for educational purposes, not actual quantum hardware.

Key Features:
- Random bit and basis generation
- Photon transmission simulation
- Eavesdropper (Eve) simulation
- QBER (Quantum Bit Error Rate) calculation
- Automatic session abort on high QBER
"""

import random
import secrets
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
from enum import Enum


class Basis(Enum):
    """Quantum measurement bases"""
    RECTILINEAR = "+"  # |0⟩, |1⟩ (horizontal/vertical)
    DIAGONAL = "×"     # |+⟩, |−⟩ (diagonal)


@dataclass
class PhotonTransmission:
    """Represents a single photon transmission event"""
    bit: int
    alice_basis: Basis
    bob_basis: Basis
    bob_measurement: int
    intercepted: bool = False
    eve_basis: Optional[Basis] = None
    eve_measurement: Optional[int] = None


@dataclass
class BB84Result:
    """Results from BB84 protocol execution"""
    shared_key: bytes
    key_length: int
    qber: float
    total_bits_sent: int
    bits_after_sifting: int
    transmission_log: List[PhotonTransmission]
    eavesdropper_detected: bool
    session_aborted: bool


class BB84Protocol:
    """
    BB84 Quantum Key Distribution Protocol
    
    Protocol Steps:
    1. Alice generates random bits and bases
    2. Alice encodes bits in quantum states and sends to Bob
    3. Bob measures with random bases
    4. Alice and Bob compare bases (public channel)
    5. Keep only bits where bases matched (sifting)
    6. Calculate QBER from sample
    7. If QBER > threshold, abort (eavesdropper detected)
    8. Use remaining bits as shared secret key
    """
    
    QBER_THRESHOLD = 0.11  # 11% - typical threshold for eavesdropping detection
    SAMPLE_SIZE_RATIO = 0.5  # Use 50% of bits for QBER testing
    
    def __init__(self, num_bits: int = 1024, eavesdropper: bool = False):
        """
        Initialize BB84 protocol
        
        Args:
            num_bits: Number of qubits to transmit
            eavesdropper: Enable man-in-the-middle attack simulation
        """
        self.num_bits = num_bits
        self.eavesdropper_active = eavesdropper
        self.transmission_log: List[PhotonTransmission] = []
    
    def _random_basis(self) -> Basis:
        """Generate random measurement basis"""
        return random.choice([Basis.RECTILINEAR, Basis.DIAGONAL])
    
    def _random_bit(self) -> int:
        """Generate cryptographically secure random bit"""
        return secrets.randbits(1)
    
    def _encode_qubit(self, bit: int, basis: Basis) -> str:
        """
        Encode classical bit into quantum state
        
        Rectilinear (+): 0 → |0⟩, 1 → |1⟩
        Diagonal (×):    0 → |+⟩, 1 → |−⟩
        """
        if basis == Basis.RECTILINEAR:
            return "|0⟩" if bit == 0 else "|1⟩"
        else:  # DIAGONAL
            return "|+⟩" if bit == 0 else "|−⟩"
    
    def _measure_qubit(self, bit: int, encode_basis: Basis, measure_basis: Basis) -> int:
        """
        Measure quantum state
        
        If bases match: measurement returns original bit with 100% probability
        If bases differ: measurement returns random bit (50/50)
        """
        if encode_basis == measure_basis:
            # Same basis → deterministic measurement
            return bit
        else:
            # Different basis → random outcome
            return random.randint(0, 1)
    
    def _simulate_eavesdropper(self, bit: int, alice_basis: Basis) -> Tuple[int, Basis]:
        """
        Simulate Eve's intercept-resend attack
        
        Eve:
        1. Intercepts photon from Alice
        2. Measures with random basis (50% chance of wrong basis)
        3. Re-encodes and sends to Bob
        
        This introduces errors when Eve's basis differs from Alice's
        """
        eve_basis = self._random_basis()
        eve_measurement = self._measure_qubit(bit, alice_basis, eve_basis)
        return eve_measurement, eve_basis
    
    def execute(self) -> BB84Result:
        """
        Execute complete BB84 protocol
        
        Returns:
            BB84Result with shared key and security metrics
        """
        # Step 1: Alice prepares random bits and bases
        alice_bits = [self._random_bit() for _ in range(self.num_bits)]
        alice_bases = [self._random_basis() for _ in range(self.num_bits)]
        
        # Step 2 & 3: Quantum transmission and Bob's measurement
        bob_bases = [self._random_basis() for _ in range(self.num_bits)]
        bob_measurements = []
        
        for i in range(self.num_bits):
            bit = alice_bits[i]
            alice_basis = alice_bases[i]
            bob_basis = bob_bases[i]
            
            # Simulate eavesdropper if enabled
            intercepted = False
            eve_basis = None
            eve_measurement = None
            
            if self.eavesdropper_active:
                bit, eve_basis = self._simulate_eavesdropper(bit, alice_basis)
                eve_measurement = bit
                intercepted = True
            
            # Bob measures the qubit
            bob_result = self._measure_qubit(bit, alice_basis if not intercepted else eve_basis, bob_basis)
            bob_measurements.append(bob_result)
            
            # Log transmission
            self.transmission_log.append(PhotonTransmission(
                bit=alice_bits[i],
                alice_basis=alice_basis,
                bob_basis=bob_basis,
                bob_measurement=bob_result,
                intercepted=intercepted,
                eve_basis=eve_basis,
                eve_measurement=eve_measurement
            ))
        
        # Step 4 & 5: Basis reconciliation (sifting)
        sifted_alice_bits = []
        sifted_bob_bits = []
        
        for i in range(self.num_bits):
            if alice_bases[i] == bob_bases[i]:
                sifted_alice_bits.append(alice_bits[i])
                sifted_bob_bits.append(bob_measurements[i])
        
        bits_after_sifting = len(sifted_alice_bits)
        
        if bits_after_sifting == 0:
            # Edge case: no matching bases
            return BB84Result(
                shared_key=b'',
                key_length=0,
                qber=1.0,
                total_bits_sent=self.num_bits,
                bits_after_sifting=0,
                transmission_log=self.transmission_log,
                eavesdropper_detected=True,
                session_aborted=True
            )
        
        # Step 6: QBER calculation using sample
        sample_size = max(1, int(bits_after_sifting * self.SAMPLE_SIZE_RATIO))
        sample_indices = random.sample(range(bits_after_sifting), sample_size)
        
        errors = sum(1 for i in sample_indices if sifted_alice_bits[i] != sifted_bob_bits[i])
        qber = errors / sample_size
        
        # Step 7: Eavesdropper detection
        eavesdropper_detected = qber > self.QBER_THRESHOLD
        session_aborted = eavesdropper_detected
        
        # Step 8: Generate shared key from remaining bits
        if session_aborted:
            shared_key = b''
            key_length = 0
        else:
            # Remove sampled bits, use rest as key
            remaining_bits = [sifted_alice_bits[i] for i in range(bits_after_sifting) if i not in sample_indices]
            
            # Convert bits to bytes
            shared_key = self._bits_to_bytes(remaining_bits)
            key_length = len(remaining_bits)
        
        return BB84Result(
            shared_key=shared_key,
            key_length=key_length,
            qber=qber,
            total_bits_sent=self.num_bits,
            bits_after_sifting=bits_after_sifting,
            transmission_log=self.transmission_log,
            eavesdropper_detected=eavesdropper_detected,
            session_aborted=session_aborted
        )
    
    def _bits_to_bytes(self, bits: List[int]) -> bytes:
        """Convert list of bits to bytes"""
        # Pad to multiple of 8
        while len(bits) % 8 != 0:
            bits.append(0)
        
        byte_array = bytearray()
        for i in range(0, len(bits), 8):
            byte = 0
            for j in range(8):
                byte = (byte << 1) | bits[i + j]
            byte_array.append(byte)
        
        return bytes(byte_array)
    
    def get_visualization_data(self) -> Dict:
        """
        Get data for frontend visualization
        
        Returns:
            Dictionary with transmission details for UI rendering
        """
        return {
            "total_transmissions": len(self.transmission_log),
            "eavesdropper_active": self.eavesdropper_active,
            "transmissions": [
                {
                    "index": i,
                    "alice_bit": t.bit,
                    "alice_basis": t.alice_basis.value,
                    "bob_basis": t.bob_basis.value,
                    "bob_measurement": t.bob_measurement,
                    "bases_match": t.alice_basis == t.bob_basis,
                    "bits_match": t.bit == t.bob_measurement,
                    "intercepted": t.intercepted,
                    "eve_basis": t.eve_basis.value if t.eve_basis else None
                }
                for i, t in enumerate(self.transmission_log[:100])  # Limit for performance
            ]
        }


# Example usage and testing
if __name__ == "__main__":
    print("=" * 60)
    print("BB84 Quantum Key Distribution Simulation")
    print("=" * 60)
    
    # Test 1: Normal operation (no eavesdropper)
    print("\n[TEST 1] Normal BB84 execution (no eavesdropper)")
    bb84_normal = BB84Protocol(num_bits=2048, eavesdropper=False)
    result_normal = bb84_normal.execute()
    
    print(f"Total bits sent: {result_normal.total_bits_sent}")
    print(f"Bits after sifting: {result_normal.bits_after_sifting}")
    print(f"QBER: {result_normal.qber:.4f} ({result_normal.qber * 100:.2f}%)")
    print(f"Eavesdropper detected: {result_normal.eavesdropper_detected}")
    print(f"Session aborted: {result_normal.session_aborted}")
    print(f"Shared key length: {result_normal.key_length} bits ({len(result_normal.shared_key)} bytes)")
    
    # Test 2: With eavesdropper
    print("\n[TEST 2] BB84 with eavesdropper (Eve)")
    bb84_eve = BB84Protocol(num_bits=2048, eavesdropper=True)
    result_eve = bb84_eve.execute()
    
    print(f"Total bits sent: {result_eve.total_bits_sent}")
    print(f"Bits after sifting: {result_eve.bits_after_sifting}")
    print(f"QBER: {result_eve.qber:.4f} ({result_eve.qber * 100:.2f}%)")
    print(f"Eavesdropper detected: {result_eve.eavesdropper_detected}")
    print(f"Session aborted: {result_eve.session_aborted}")
    print(f"Shared key length: {result_eve.key_length} bits")
    
    print("\n" + "=" * 60)
    print("Expected: QBER < 11% without Eve, QBER > 15% with Eve")
    print("=" * 60)
