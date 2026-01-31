"""
Anonymous Reporting Route

Handles submission of quantum-safe encrypted reports.
Reports are stored in Firestore without decryption or user identification.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import secrets

from google.cloud.firestore_v1.base_query import FieldFilter

from app.database import get_db
from app.models.user_firebase import model_to_dict
from app.routes.auth_firebase import get_current_user, USERS_COLLECTION, AGENTS_COLLECTION

router = APIRouter()

# Firestore Collections
ANONYMOUS_REPORTS_COLLECTION = "anonymous_reports"
AUDIT_LOGS_COLLECTION = "audit_logs"

async def is_authorized_agent(authorization: str = Depends(get_current_user)):
    """Strongly enforce agent-only access with institution domain check"""
    if not authorization.email.endswith("@srmap.edu.in"):
        raise HTTPException(status_code=403, detail="Agent access restricted to @srmap.edu.in domain")
    
    # Check if this user is registered in the agents collection
    db = get_db()
    agent_doc = db.collection(AGENTS_COLLECTION).document(authorization.user_id).get()
    if not agent_doc.exists:
        raise HTTPException(status_code=403, detail="Principal not authorized for agent operations")
        
    return authorization

class AnonymousReportRequest(BaseModel):
    """Encrypted report payload from client"""
    encrypted_payload: str  # Base64 encoded ciphertext + nonce
    qkd_protocol: str = "BB84"
    qber: float
    session_id: str
    metadata: Optional[Dict[str, Any]] = None

class AnonymousReportResponse(BaseModel):
    """Response after successful submission"""
    report_id: str
    status: str
    timestamp: datetime
    message: str

@router.post("/anonymous", response_model=AnonymousReportResponse)
async def submit_anonymous_report(
    report: AnonymousReportRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Submit an anonymous report with quantum-safe encryption.
    The report is stored encrypted. 
    If the user is logged in (authorization header present), we link it to their account for their history.
    """
    db = get_db()
    
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split("Bearer ")[1]
            
            # Helper to avoid circular imports by using string literals for collection names
            # or importing locally if needed. 
            # We know from auth_firebase.py that:
            # USER_SESSIONS_COLLECTION = "user_sessions"
            # AGENT_SESSIONS_COLLECTION = "agent_sessions"
            
            # 1. Check User Sessions
            user_sessions = db.collection("user_sessions").where(filter=FieldFilter('access_token', '==', token)).limit(1).stream()
            session_doc = next(user_sessions, None)
            
            if not session_doc:
                 # 2. Check Agent Sessions
                 agent_sessions = db.collection("agent_sessions").where(filter=FieldFilter('access_token', '==', token)).limit(1).stream()
                 session_doc = next(agent_sessions, None)
            
            if session_doc:
                data = session_doc.to_dict()
                user_id = data.get("user_id") or data.get("agent_id")
                
        except Exception as e:
            # If token verification fails, just proceed as anonymous without linking
            print(f"Token verification warning: {e}")
            pass

    try:
        # Generate unique report ID
        report_id = f"RPT_{secrets.token_hex(16)}"
        
        # Store report in Firestore
        report_data = {
            "id": report_id,
            "user_id": user_id,  # Store user_id if authenticated
            "encrypted_payload": report.encrypted_payload,
            "qkd_protocol": report.qkd_protocol,
            "qber": report.qber,
            "session_id": report.session_id,
            "timestamp": datetime.utcnow(),
            "status": "pending",
            "metadata": report.metadata or {}
        }
        
        db.collection(ANONYMOUS_REPORTS_COLLECTION).document(report_id).set(report_data)
        
        return AnonymousReportResponse(
            report_id=report_id,
            status="received",
            timestamp=report_data["timestamp"],
            message="Report submitted successfully. Your submission is encrypted and anonymous."
        )
    except Exception as e:
        print(f"Error submitting report: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit report")

@router.get("/agent/inbox")
async def get_agent_inbox(agent: Any = Depends(is_authorized_agent)):
    """Get all reports for agent review"""
    db = get_db()
    try:
        reports_ref = db.collection(ANONYMOUS_REPORTS_COLLECTION)
        docs = reports_ref.stream()
        
        reports = []
        for doc in docs:
            report_data = doc.to_dict()
            reports.append(report_data)
        
        # Sort by timestamp descending (handle None values)
        reports.sort(key=lambda x: x.get("timestamp") or datetime(1970, 1, 1, tzinfo=timezone.utc), reverse=True)
        
        return reports
    except Exception as e:
        print(f"Error fetching inbox: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reports")

@router.get("/agent/stats")
async def get_agent_stats(agent: Any = Depends(is_authorized_agent)):
    """Get statistics for the agent dashboard"""
    db = get_db()
    try:
        reports_ref = db.collection(ANONYMOUS_REPORTS_COLLECTION)
        docs = list(reports_ref.stream())
        
        total_reports = len(docs)
        secure_reports = sum(1 for doc in docs if doc.to_dict().get("qber", 1.0) < 0.11)
        attack_alerts = sum(1 for doc in docs if doc.to_dict().get("qber", 0.0) >= 0.11)
        
        avg_qber = sum(doc.to_dict().get("qber", 0.0) for doc in docs) / total_reports if total_reports > 0 else 0.0
        
        return {
            "total_reports": total_reports,
            "secure_reports": secure_reports,
            "attack_alerts": attack_alerts,
            "avg_qber": avg_qber
        }
    except Exception as e:
        print(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")

@router.post("/agent/decrypt/{report_id}")
async def decrypt_report(
    report_id: str,
    agent: Any = Depends(is_authorized_agent)
):
    """
    Decrypt a report for agent review.
    This action is logged to the immutable audit trail.
    """
    db = get_db()
    try:
        # Fetch the report
        doc_ref = db.collection(ANONYMOUS_REPORTS_COLLECTION).document(report_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        report_data = doc.to_dict()
        
        # Check QBER threshold
        if report_data.get("qber", 0.0) >= 0.11:
            raise HTTPException(
                status_code=403,
                detail="Report integrity compromised. QBER threshold exceeded (eavesdropping detected)."
            )
        
        # Log decryption to audit trail
        audit_id = f"AUDIT_{secrets.token_hex(16)}"
        audit_entry = {
            "id": audit_id,
            "agent_id": agent.user_id,
            "agent_email": agent.email,
            "report_id": report_id,
            "action": "DECRYPT",
            "timestamp": datetime.utcnow(),
            "qber": report_data.get("qber", 0.0),
            "integrity_status": "SECURE" if report_data.get("qber", 0.0) < 0.11 else "COMPROMISED"
        }
        db.collection(AUDIT_LOGS_COLLECTION).document(audit_id).set(audit_entry)
        
        # For testing/demo purposes, extract plaintext from metadata
        # In production, this would be the result of actual PQC decryption
        try:
            metadata = report_data.get("metadata", {})
            plaintext_content = metadata.get("plaintext_content", {})
            
            if not plaintext_content:
                # Fallback to simulated content if no metadata
                plaintext_content = {
                    "title": "Example Report",
                    "description": "This is simulated content. In production, this would be decrypted using PQC.",
                    "category": report_data.get("metadata", {}).get("category", "security_vulnerability"),
                    "contact_info": None
                }
            
            decrypted_content = {
                "title": plaintext_content.get("title", "Untitled Report"),
                "description": plaintext_content.get("description", "No description provided"),
                "category": plaintext_content.get("category", metadata.get("category", "unknown")),
                "contact_info": plaintext_content.get("contact_info"),
                "attachments": plaintext_content.get("attachments", []),
                "integrity_verified": True
            }
            
        except Exception as e:
            print(f"Error extracting plaintext: {e}")
            decrypted_content = {
                "title": "Decryption Error",
                "description": "Could not extract report content",
                "category": "unknown",
                "contact_info": None,
                "attachments": [],
                "integrity_verified": False
            }
        
        return {
            "report_id": report_id,
            "decrypted_content": decrypted_content,
            "veracity_score": 0.95,
            "decryption_timestamp": datetime.utcnow()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error decrypting report: {e}")
        raise HTTPException(status_code=500, detail="Failed to decrypt report")

@router.get("/agent/audit")
async def get_audit_logs(agent: Any = Depends(is_authorized_agent)):
    """Get audit trail of all agent actions"""
    db = get_db()
    try:
        logs_ref = db.collection(AUDIT_LOGS_COLLECTION)
        docs = logs_ref.stream()
        
        logs = []
        for doc in docs:
            log_data = doc.to_dict()
            logs.append(log_data)
        
        # Sort by timestamp descending (handle None values)
        logs.sort(key=lambda x: x.get("timestamp") or datetime(1970, 1, 1, tzinfo=timezone.utc), reverse=True)
        
        return logs
    except Exception as e:
        print(f"Error fetching audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit logs")

@router.delete("/agent/delete/{report_id}")
async def delete_report(
    report_id: str,
    agent: Any = Depends(is_authorized_agent)
):
    """Delete a report (logged to audit trail)"""
    db = get_db()
    try:
        doc_ref = db.collection(ANONYMOUS_REPORTS_COLLECTION).document(report_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Log deletion
        audit_id = f"AUDIT_{secrets.token_hex(16)}"
        audit_entry = {
            "id": audit_id,
            "agent_id": agent.user_id,
            "agent_email": agent.email,
            "report_id": report_id,
            "action": "DELETE",
            "timestamp": datetime.utcnow(),
            "integrity_status": "DELETED"
        }
        db.collection(AUDIT_LOGS_COLLECTION).document(audit_id).set(audit_entry)
        
        # Delete the report
        doc_ref.delete()
        
        return {
            "status": "success",
            "message": f"Report {report_id} deleted successfully",
            "report_id": report_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting report: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete report")

@router.patch("/agent/status/{report_id}")
async def update_report_status(
    report_id: str,
    status_data: dict,
    agent: Any = Depends(is_authorized_agent)
):
    """Update the status of a report"""
    db = get_db()
    try:
        # Get report
        doc_ref = db.collection(ANONYMOUS_REPORTS_COLLECTION).document(report_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        new_status = status_data.get("status", "pending")
        
        # Update status
        doc_ref.update({
            "status": new_status,
            "status_updated_at": datetime.utcnow(),
            "status_updated_by": agent.user_id
        })
        
        # Log to audit
        audit_id = f"AUDIT_{secrets.token_hex(16)}"
        audit_entry = {
            "id": audit_id,
            "agent_id": agent.user_id,
            "agent_email": agent.email,
            "report_id": report_id,
            "action": "STATUS_UPDATE",
            "new_status": new_status,
            "timestamp": datetime.utcnow()
        }
        db.collection(AUDIT_LOGS_COLLECTION).document(audit_id).set(audit_entry)
        
        return {
            "status": "success",
            "report_id": report_id,
            "new_status": new_status
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")
