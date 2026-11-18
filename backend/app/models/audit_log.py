from beanie import Document
from pydantic import Field
from typing import Optional, Dict, Any
from datetime import datetime


class AuditLog(Document):
    user_id: str
    user_email: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    success: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audit_logs"
