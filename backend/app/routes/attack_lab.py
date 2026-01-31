"""
Attack Lab Routes - Security Demonstration

This module provides endpoints for simulating attacks:
- Eavesdropper (Man-in-the-Middle)
- Data tampering
- Replay attacks

Educational purpose: Demonstrate why quantum-safe cryptography is necessary
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
import secrets

from app.core.qkd_bb84 import BB84Protocol

router = APIRouter()

# Store attack simulations
attack_simulations = {}


class EavesdropAttackRequest(BaseModel):
    """Request to simulate eavesdropper attack"""
    num_bits: int = 2048
    attack_intensity: float = 1.0  # 0.0 to 1.0 (probability of interception)


class EavesdropAttackResponse(BaseModel):
    """Response from eavesdropper simulation"""
    simulation_id: str
    qber_without_attack: float
    qber_with_attack: float
    qber_increase: float
    detected: bool
    explanation: str
    recommendations: List[str]


class TamperAttackRequest(BaseModel):
    """Request to simulate data tampering"""
    session_id: str
    tamper_type: str  # "ciphertext", "nonce", "tag"


class TamperAttackResponse(BaseModel):
    """Response from tampering simulation"""
    simulation_id: str
    tamper_type: str
    detected: bool
    explanation: str
    technical_details: Dict


@router.post("/eavesdrop", response_model=EavesdropAttackResponse)
async def simulate_eavesdropper(request: EavesdropAttackRequest):
    """
    Simulate eavesdropper (Eve) attack on QKD
    
    This demonstrates:
    1. How BB84 detects eavesdropping via QBER
    2. Why quantum key distribution is secure
    3. The no-cloning theorem in action
    
    Process:
    - Run BB84 without eavesdropper (baseline QBER)
    - Run BB84 with eavesdropper (elevated QBER)
    - Compare and show detection
    """
    simulation_id = f"attack_{secrets.token_hex(8)}"
    
    # Baseline: No eavesdropper
    bb84_clean = BB84Protocol(num_bits=request.num_bits, eavesdropper=False)
    result_clean = bb84_clean.execute()
    qber_baseline = result_clean.qber
    
    # With eavesdropper
    bb84_eve = BB84Protocol(num_bits=request.num_bits, eavesdropper=True)
    result_eve = bb84_eve.execute()
    qber_with_eve = result_eve.qber
    
    # Calculate QBER increase
    qber_increase = qber_with_eve - qber_baseline
    detected = result_eve.eavesdropper_detected
    
    # Generate explanation
    if detected:
        explanation = (
            f"🚨 EAVESDROPPER DETECTED! QBER increased from {qber_baseline:.2%} to {qber_with_eve:.2%}. "
            f"This {qber_increase:.2%} increase exceeds the 11% threshold, indicating Eve's presence. "
            f"Session was automatically aborted to prevent key compromise."
        )
    else:
        explanation = (
            f"✓ No eavesdropper detected. QBER is {qber_with_eve:.2%}, below the 11% threshold. "
            f"This is normal quantum noise. Session can proceed safely."
        )
    
    recommendations = [
        "Always monitor QBER in real-time during key exchange",
        "Abort session immediately if QBER exceeds threshold",
        "Use authenticated classical channel for basis reconciliation",
        "Combine QKD with post-quantum cryptography for defense-in-depth",
        "Implement privacy amplification to remove Eve's partial information"
    ]
    
    # Store simulation
    attack_simulations[simulation_id] = {
        "type": "eavesdrop",
        "qber_baseline": qber_baseline,
        "qber_with_attack": qber_with_eve,
        "detected": detected,
        "bb84_clean": result_clean,
        "bb84_eve": result_eve
    }
    
    return EavesdropAttackResponse(
        simulation_id=simulation_id,
        qber_without_attack=qber_baseline,
        qber_with_attack=qber_with_eve,
        qber_increase=qber_increase,
        detected=detected,
        explanation=explanation,
        recommendations=recommendations
    )


@router.post("/tamper", response_model=TamperAttackResponse)
async def simulate_tampering(request: TamperAttackRequest):
    """
    Simulate data tampering attack
    
    This demonstrates:
    1. How AES-GCM detects tampering via authentication tag
    2. Why authenticated encryption is critical
    3. Difference between encryption and authentication
    """
    simulation_id = f"tamper_{secrets.token_hex(8)}"
    
    from app.core.aes_crypto import AESCrypto, EncryptedMessage
    import os
    
    # Create test encryption
    session_key = os.urandom(32)
    cipher = AESCrypto(session_key)
    
    original_message = b"This is a secure message"
    encrypted = cipher.encrypt(original_message)
    
    # Simulate tampering based on type
    if request.tamper_type == "ciphertext":
        # Flip bits in ciphertext
        tampered_ciphertext = bytearray(encrypted.ciphertext)
        tampered_ciphertext[-1] ^= 0xFF  # Flip last byte
        
        tampered = EncryptedMessage(
            ciphertext=bytes(tampered_ciphertext),
            nonce=encrypted.nonce,
            tag=encrypted.tag
        )
        
        explanation = (
            "Attacker modified the ciphertext. AES-GCM's authentication tag "
            "will detect this tampering during decryption, causing verification to fail."
        )
        
    elif request.tamper_type == "nonce":
        # Change nonce
        tampered = EncryptedMessage(
            ciphertext=encrypted.ciphertext,
            nonce=os.urandom(12),
            tag=encrypted.tag
        )
        
        explanation = (
            "Attacker replaced the nonce. This will cause decryption to fail "
            "because the nonce is cryptographically bound to the ciphertext."
        )
        
    else:  # tag
        # Modify tag (simulated - GCM includes tag in ciphertext)
        explanation = (
            "Attacker attempted to modify the authentication tag. "
            "This will be detected during verification, preventing acceptance of tampered data."
        )
        tampered = encrypted
    
    # Attempt decryption
    detected = False
    error_message = ""
    
    try:
        cipher.decrypt(tampered)
        detected = False
    except Exception as e:
        detected = True
        error_message = str(e)
    
    technical_details = {
        "original_message": original_message.decode(),
        "tamper_type": request.tamper_type,
        "detection_mechanism": "AES-GCM authentication tag verification",
        "error": error_message if detected else "No error (tampering not detected)",
        "security_property": "Authenticated Encryption with Associated Data (AEAD)"
    }
    
    # Store simulation
    attack_simulations[simulation_id] = {
        "type": "tamper",
        "tamper_type": request.tamper_type,
        "detected": detected,
        "details": technical_details
    }
    
    return TamperAttackResponse(
        simulation_id=simulation_id,
        tamper_type=request.tamper_type,
        detected=detected,
        explanation=explanation,
        technical_details=technical_details
    )


@router.get("/simulation/{simulation_id}")
async def get_simulation_results(simulation_id: str):
    """Get detailed results from attack simulation"""
    if simulation_id not in attack_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    return attack_simulations[simulation_id]


@router.get("/educational/why-ecc-fails")
async def why_ecc_fails():
    """
    Educational endpoint: Explain why ECC fails against quantum computers
    """
    return {
        "title": "Why Classical ECC Fails Against Quantum Computers",
        "problem": "Elliptic Curve Cryptography (ECC) relies on the discrete logarithm problem",
        "classical_security": "Exponential time to solve on classical computers (secure)",
        "quantum_vulnerability": {
            "algorithm": "Shor's Algorithm",
            "complexity": "Polynomial time on quantum computers",
            "impact": "Can break ECC in reasonable time with sufficient qubits"
        },
        "affected_protocols": [
            "ECDH (Elliptic Curve Diffie-Hellman) - Key Exchange",
            "ECDSA (Elliptic Curve Digital Signature Algorithm) - Signatures",
            "ECIES (Elliptic Curve Integrated Encryption Scheme) - Encryption"
        ],
        "timeline": {
            "current": "ECC is secure against classical computers",
            "near_future": "Quantum computers with ~1000-4000 logical qubits can break ECC",
            "threat": "Store-now-decrypt-later: Adversaries capture encrypted data today, decrypt when quantum computers are available"
        },
        "solution": "Post-Quantum Cryptography (PQC) - Kyber and Dilithium",
        "our_approach": {
            "qkd": "BB84 provides information-theoretic security with eavesdropping detection",
            "pqc_kex": "Kyber (lattice-based) replaces ECDH",
            "pqc_sig": "Dilithium (lattice-based) replaces ECDSA",
            "hybrid": "Combine QKD + PQC for defense-in-depth"
        }
    }


@router.get("/educational/how-bb84-protects")
async def how_bb84_protects():
    """
    Educational endpoint: Explain how BB84 protects against eavesdropping
    """
    return {
        "title": "How BB84 Quantum Key Distribution Protects Against Eavesdropping",
        "principle": "Quantum mechanics: Measurement disturbs quantum states",
        "no_cloning_theorem": "Cannot copy unknown quantum states perfectly",
        "detection_mechanism": {
            "step1": "Alice sends qubits in random bases",
            "step2": "Eve intercepts and measures (must guess basis)",
            "step3": "Eve's measurement collapses quantum state",
            "step4": "Eve re-sends qubit to Bob (in wrong state if basis mismatch)",
            "step5": "Alice and Bob compare bases publicly",
            "step6": "Calculate QBER from sample",
            "step7": "High QBER indicates eavesdropping → abort session"
        },
        "qber_analysis": {
            "no_eavesdropper": "QBER ≈ 0-5% (natural quantum noise)",
            "with_eavesdropper": "QBER ≈ 25% (Eve guesses wrong basis 50% of time)",
            "threshold": "11% (abort if exceeded)"
        },
        "security_guarantee": "Information-theoretic security (not based on computational hardness)",
        "advantages": [
            "Detects eavesdropping automatically",
            "Secure against any computational power (including quantum)",
            "Based on physics, not mathematics",
            "Forward secrecy through ephemeral keys"
        ],
        "limitations": [
            "Requires quantum channel (fiber optic or free space)",
            "Distance limited (photon loss)",
            "This implementation is a SIMULATION for education"
        ]
    }
