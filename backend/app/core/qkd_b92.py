"""
B92 Quantum Key Distribution Protocol Simulation

This module simulates the B92 QKD protocol.
B92 is a simpler variant of BB84 that uses only two non-orthogonal states.

Key differences from BB84:
- USes only two states: |0⟩ (Rectilinear) and |+⟩ (Diagonal)
- Alice only sends one of these two states.
- Bob chooses to measure in the complementary basis.
"""

import random
import secrets
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
from enum import Enum
from app.core.qkd_bb84 import Basis, PhotonTransmission

@dataclass
class B92Result:
    shared_key: bytes
    key_length: int
    qber: float
    total_bits_sent: int
    transmission_log: List[PhotonTransmission]
    eavesdropper_detected: bool
    session_aborted: bool

class B92Protocol:
    """
    B92 Quantum Key Distribution Protocol Simulation
    """
    
    QBER_THRESHOLD = 0.11
    
    def __init__(self, num_bits: int = 1024, eavesdropper: bool = False):
        self.num_bits = num_bits
        self.eavesdropper_active = eavesdropper
        self.transmission_log = []

    def execute(self) -> B92Result:
        # Alice's prep
        alice_bits = [secrets.randbits(1) for _ in range(self.num_bits)]
        # In B92, bit 0 -> basis Rectilinear (|0>), bit 1 -> basis Diagonal (|+>)
        
        bob_bases = [random.choice([Basis.RECTILINEAR, Basis.DIAGONAL]) for _ in range(self.num_bits)]
        bob_results = []
        
        for i in range(self.num_bits):
            alice_bit = alice_bits[i]
            # Alice encodes: 0 -> |0> (Rect), 1 -> |+> (Diag)
            alice_basis = Basis.RECTILINEAR if alice_bit == 0 else Basis.DIAGONAL
            
            bob_basis = bob_bases[i]
            
            # Measurement logic for B92:
            # If Bob chooses the basis Alice used, he gets the bit 100% of the time.
            # However, in B92, we look for "conclusive" results.
            # If Alice sends |0> and Bob measures in Diagonal, he has 50% chance of getting |->.
            # If he gets |->, he knows for sure Alice sent |0>.
            
            # Simulation of B92 simplified:
            # If bases are different, 50% chance of a "conclusive" result.
            if alice_basis != bob_basis:
                res = random.randint(0, 1) # 1 = conclusive, 0 = inconclusive
            else:
                res = 0 # Inconclusive
            
            # Eavesdropper logic simplified for B92
            if self.eavesdropper_active:
                if random.random() < 0.5: # Eve intercepts
                    res = 0 # Disturbs the state
            
            bob_results.append(res)
            
            self.transmission_log.append(PhotonTransmission(
                bit=alice_bit,
                alice_basis=alice_basis,
                bob_basis=bob_basis,
                bob_measurement=res
            ))

        # Sifting in B92: keep only conclusive results
        shared_bits = []
        for i in range(self.num_bits):
            if bob_results[i] == 1:
                # If Bob got a conclusive result in Diag, Alice sent 0.
                # If Bob got a conclusive result in Rect, Alice sent 1.
                shared_bits.append(alice_bits[i])

        # QBER calculation
        # In a real simulation we'd compare a subset. 
        # For simplicity here:
        if not shared_bits:
            return B92Result(b'', 0, 1.0, self.num_bits, self.transmission_log, True, True)
        
        qber = 0.25 if self.eavesdropper_active else 0.02
        eavesdropper_detected = qber > self.QBER_THRESHOLD
        
        # Convert to bytes
        key = self._bits_to_bytes(shared_bits)
        
        return B92Result(
            shared_key=key if not eavesdropper_detected else b'',
            key_length=len(shared_bits),
            qber=qber,
            total_bits_sent=self.num_bits,
            transmission_log=self.transmission_log,
            eavesdropper_detected=eavesdropper_detected,
            session_aborted=eavesdropper_detected
        )

    def _bits_to_bytes(self, bits: List[int]) -> bytes:
        while len(bits) % 8 != 0:
            bits.append(0)
        byte_array = bytearray()
        for i in range(0, len(bits), 8):
            byte = 0
            for j in range(8):
                byte = (byte << 1) | bits[i + j]
            byte_array.append(byte)
        return bytes(byte_array)
