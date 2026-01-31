"""
QKD Routes - BB84 Quantum Key Distribution Simulation

This module provides endpoints for BB84 protocol execution and visualization.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import secrets

from app.core.qkd_bb84 import BB84Protocol, BB84Result
from app.core.qkd_qiskit import QiskitBB84Simulation

router = APIRouter()

# Store active QKD sessions
qkd_sessions = {}


class QKDInitiateRequest(BaseModel):
    """Request to initiate QKD session"""
    num_bits: int = 2048
    eavesdropper: bool = False
    session_name: Optional[str] = None
    engine: str = "qiskit"  # "bb84" (fast) or "qiskit" (formal)


class QKDInitiateResponse(BaseModel):
    """Response from QKD initiation"""
    session_id: str
    status: str
    message: str


class QKDResultResponse(BaseModel):
    """QKD execution results"""
    session_id: str
    shared_key_length: int
    qber: float
    total_bits_sent: int
    bits_after_sifting: int
    eavesdropper_detected: bool
    session_aborted: bool
    eavesdropper_active: bool


class QKDVisualizationResponse(BaseModel):
    """Visualization data for frontend"""
    session_id: str
    total_transmissions: int
    eavesdropper_active: bool
    transmissions: List[Dict]


@router.post("/initiate", response_model=QKDInitiateResponse)
async def initiate_qkd(request: QKDInitiateRequest):
    """
    Initiate QKD session using specified engine (BB84 or Qiskit)
    """
    session_id = f"qkd_{secrets.token_hex(8)}"
    
    if request.engine == "qiskit":
        # Use formal Qiskit simulation
        sim = QiskitBB84Simulation(num_bits=request.num_bits // 32 if request.num_bits > 100 else request.num_bits) # Qiskit is slower, limit bits
        qiskit_res = sim.run_simulation(eve_present=request.eavesdropper)
        
        # Map Qiskit result to a format compatible with existing frontend
        qkd_sessions[session_id] = {
            "engine": "qiskit",
            "result": qiskit_res,
            "config": request.dict()
        }
        
        if qiskit_res.is_eavesdropped:
            status = "aborted"
            message = f"Qiskit Circuit: Eavesdropper detected via state collapse! QBER: {qiskit_res.qber:.2%}"
        else:
            status = "success"
            message = f"Qiskit Circuit: Safe transmission. Reconciled {len(qiskit_res.reconciled_key)} bits."
            
    else:
        # Use fast bit-level BB84 simulation
        bb84 = BB84Protocol(
            num_bits=request.num_bits,
            eavesdropper=request.eavesdropper
        )
        result = bb84.execute()
        
        qkd_sessions[session_id] = {
            "engine": "bb84",
            "protocol": bb84,
            "result": result,
            "config": request.dict()
        }
        
        if result.session_aborted:
            status = "aborted"
            message = f"Fast BB84: Session aborted. QBER: {result.qber:.2%}"
        else:
            status = "success"
            message = f"Fast BB84: Success. {result.key_length} bits generated."
    
    return QKDInitiateResponse(
        session_id=session_id,
        status=status,
        message=message
    )


@router.get("/result/{session_id}", response_model=QKDResultResponse)
async def get_qkd_result(session_id: str):
    if session_id not in qkd_sessions:
        raise HTTPException(status_code=404, detail="QKD session not found")
    
    session = qkd_sessions[session_id]
    engine = session.get("engine", "bb84")
    config = session["config"]
    
    if engine == "qiskit":
        res = session["result"]
        return QKDResultResponse(
            session_id=session_id,
            shared_key_length=len(res.reconciled_key),
            qber=res.qber,
            total_bits_sent=len(res.alice_bits),
            bits_after_sifting=len(res.reconciled_key), # Sifting is part of reconciliation in this simplified model
            eavesdropper_detected=res.is_eavesdropped,
            session_aborted=res.is_eavesdropped,
            eavesdropper_active=config["eavesdropper"]
        )
    else:
        result: BB84Result = session["result"]
        return QKDResultResponse(
            session_id=session_id,
            shared_key_length=result.key_length,
            qber=result.qber,
            total_bits_sent=result.total_bits_sent,
            bits_after_sifting=result.bits_after_sifting,
            eavesdropper_detected=result.eavesdropper_detected,
            session_aborted=result.session_aborted,
            eavesdropper_active=config["eavesdropper"]
        )


@router.get("/visualization/{session_id}", response_model=QKDVisualizationResponse)
async def get_qkd_visualization(session_id: str):
    if session_id not in qkd_sessions:
        raise HTTPException(status_code=404, detail="QKD session not found")
    
    session = qkd_sessions[session_id]
    engine = session.get("engine", "bb84")
    
    if engine == "qiskit":
        res = session["result"]
        transmissions = []
        for i in range(len(res.alice_bits)):
            transmissions.append({
                "index": i,
                "alice_bit": res.alice_bits[i],
                "alice_basis": res.alice_bases[i],
                "bob_basis": res.bob_bases[i],
                "bob_measurement": res.bob_measured_bits[i],
                "intercepted": i in res.intercepted_indices,
                "bases_match": res.alice_bases[i] == res.bob_bases[i]
            })
        
        return QKDVisualizationResponse(
            session_id=session_id,
            total_transmissions=len(res.alice_bits),
            eavesdropper_active=session["config"]["eavesdropper"],
            transmissions=transmissions
        )
    else:
        protocol: BB84Protocol = session["protocol"]
        viz_data = protocol.get_visualization_data()
        return QKDVisualizationResponse(
            session_id=session_id,
            total_transmissions=viz_data["total_transmissions"],
            eavesdropper_active=viz_data["eavesdropper_active"],
            transmissions=viz_data["transmissions"]
        )


@router.get("/metrics/{session_id}")
async def get_qkd_metrics(session_id: str):
    """
    Get detailed QKD metrics for analysis
    
    Returns comprehensive metrics including:
    - QBER breakdown
    - Sifting efficiency
    - Key generation rate
    - Security parameters
    """
    if session_id not in qkd_sessions:
        raise HTTPException(status_code=404, detail="QKD session not found")
    
    session = qkd_sessions[session_id]
    result: BB84Result = session["result"]
    config = session["config"]
    
    # Calculate additional metrics
    sifting_efficiency = (
        result.bits_after_sifting / result.total_bits_sent
        if result.total_bits_sent > 0 else 0
    )
    
    key_generation_rate = (
        result.key_length / result.total_bits_sent
        if result.total_bits_sent > 0 else 0
    )
    
    return {
        "session_id": session_id,
        "qber": {
            "value": result.qber,
            "percentage": f"{result.qber * 100:.2f}%",
            "threshold": 0.11,
            "status": "safe" if result.qber <= 0.11 else "unsafe"
        },
        "efficiency": {
            "sifting_efficiency": sifting_efficiency,
            "key_generation_rate": key_generation_rate,
            "bits_sent": result.total_bits_sent,
            "bits_after_sifting": result.bits_after_sifting,
            "final_key_bits": result.key_length
        },
        "security": {
            "eavesdropper_detected": result.eavesdropper_detected,
            "session_aborted": result.session_aborted,
            "eavesdropper_active": config["eavesdropper"]
        },
        "config": config
    }


@router.delete("/session/{session_id}")
async def delete_qkd_session(session_id: str):
    """Delete QKD session and clear sensitive data"""
    if session_id in qkd_sessions:
        del qkd_sessions[session_id]
        return {"message": "QKD session deleted"}
    else:
        raise HTTPException(status_code=404, detail="QKD session not found")
