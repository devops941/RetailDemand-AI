from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, RefreshRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)
from app.schemas.common import APIResponse
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/register", response_model=APIResponse)
async def register(payload: RegisterRequest):
    user = await AuthService.register(payload)
    return APIResponse(success=True, message="Registration successful", data={"id": str(user.id), "email": user.email})


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    tokens = await AuthService.login(payload, ip_address=ip)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest):
    tokens = await AuthService.refresh_tokens(payload.refresh_token)
    return tokens


@router.post("/logout", response_model=APIResponse)
async def logout(payload: RefreshRequest, current_user: User = Depends(get_current_user)):
    await AuthService.logout(payload.refresh_token)
    return APIResponse(success=True, message="Logged out successfully")


@router.post("/forgot-password", response_model=APIResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    await AuthService.forgot_password(payload.email)
    return APIResponse(success=True, message="If that email exists, a reset link was sent")


@router.post("/reset-password", response_model=APIResponse)
async def reset_password(payload: ResetPasswordRequest):
    await AuthService.reset_password(payload.token, payload.new_password)
    return APIResponse(success=True, message="Password reset successfully")


@router.post("/change-password", response_model=APIResponse)
async def change_password(payload: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    await AuthService.change_password(current_user, payload.current_password, payload.new_password)
    return APIResponse(success=True, message="Password changed successfully")


@router.get("/me", response_model=APIResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return APIResponse(success=True, data={
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
    })
