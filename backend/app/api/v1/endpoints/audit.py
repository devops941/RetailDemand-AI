from fastapi import APIRouter, Depends
from app.api.dependencies import require_admin
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("/", response_model=APIResponse)
async def list_audit_logs(current_user: User = Depends(require_admin)):
    logs = await AuditLog.find_many().sort([("created_at", -1)]).limit(100).to_list()
    data = [{"id": str(l.id), "user_email": l.user_email, "action": l.action, "resource_type": l.resource_type, "created_at": l.created_at.isoformat()} for l in logs]
    return APIResponse(success=True, data=data)
