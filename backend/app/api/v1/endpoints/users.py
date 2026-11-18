from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.api.dependencies import require_admin, get_current_user
from app.models.user import User
from app.schemas.common import APIResponse

VALID_ROLES = {"admin", "analyst", "manager"}

router = APIRouter()


def _serialize(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat(),
        "last_login": u.last_login.isoformat() if u.last_login else None,
    }


class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "analyst"
    password: str


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=APIResponse)
async def list_users(current_user: User = Depends(require_admin)):
    users = await User.find_many().sort([("created_at", -1)]).to_list()
    return APIResponse(success=True, data=[_serialize(u) for u in users])


@router.get("/me", response_model=APIResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return APIResponse(success=True, data=_serialize(current_user))


@router.post("/", response_model=APIResponse)
async def create_user(body: CreateUserRequest, current_user: User = Depends(require_admin)):
    from app.core.security import get_password_hash
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
    if await User.find_one(User.email == body.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = User(
        email=body.email,
        full_name=body.full_name,
        role=body.role,
        hashed_password=get_password_hash(body.password),
        is_active=True,
    )
    await user.insert()
    return APIResponse(success=True, message="User created", data=_serialize(user))


@router.get("/{user_id}", response_model=APIResponse)
async def get_user(user_id: str, current_user: User = Depends(require_admin)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return APIResponse(success=True, data=_serialize(user))


@router.put("/{user_id}", response_model=APIResponse)
async def update_user(user_id: str, body: UpdateUserRequest, current_user: User = Depends(require_admin)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.role is not None and body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
    if str(user.id) == str(current_user.id) and body.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    user.updated_at = datetime.utcnow()
    await user.save()
    return APIResponse(success=True, message="User updated", data=_serialize(user))


@router.delete("/{user_id}", response_model=APIResponse)
async def delete_user(user_id: str, current_user: User = Depends(require_admin)):
    if user_id == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await user.delete()
    return APIResponse(success=True, message="User deleted")
