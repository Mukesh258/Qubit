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
