from datetime import datetime, timedelta
from app.models.user import User, RefreshToken
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.config import settings
from fastapi import HTTPException, status
import secrets


class AuthService:
    @staticmethod
    async def register(payload: RegisterRequest) -> User:
        existing = await User.find_one(User.email == payload.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=get_password_hash(payload.password),
            role=payload.role,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await user.insert()

        # Audit log
        from app.models.audit_log import AuditLog
        audit = AuditLog(
            user_id=str(user.id),
            user_email=user.email,
            action="register",
            resource_type="auth",
            details={"role": payload.role},
            success=True,
        )
        await audit.insert()

        return user

    @staticmethod
    async def login(payload: LoginRequest, ip_address: str = None) -> TokenResponse:
        user = await User.find_one(User.email == payload.email)
        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

        user.last_login = datetime.utcnow()
        await user.save()

        # Audit log
        from app.models.audit_log import AuditLog
        audit = AuditLog(
            user_id=str(user.id),
            user_email=user.email,
            action="login",
            resource_type="auth",
            details={"ip_address": ip_address},
            ip_address=ip_address,
            success=True,
        )
        await audit.insert()

        access_token = create_access_token({"sub": user.email, "role": user.role})
        refresh_token_str = create_refresh_token({"sub": user.email})

        refresh_token = RefreshToken(
            user_id=str(user.id),
            token=refresh_token_str,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        await refresh_token.insert()

        return TokenResponse(access_token=access_token, refresh_token=refresh_token_str)

    @staticmethod
    async def refresh_tokens(refresh_token_str: str) -> TokenResponse:
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        stored = await RefreshToken.find_one(RefreshToken.token == refresh_token_str)
        if not stored or stored.revoked or stored.expires_at < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

        stored.revoked = True
        await stored.save()

        user = await User.find_one(User.email == payload.get("sub"))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        new_access = create_access_token({"sub": user.email, "role": user.role})
        new_refresh = create_refresh_token({"sub": user.email})

        new_rt = RefreshToken(
            user_id=str(user.id),
            token=new_refresh,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        await new_rt.insert()
        return TokenResponse(access_token=new_access, refresh_token=new_refresh)

    @staticmethod
    async def logout(refresh_token_str: str):
        stored = await RefreshToken.find_one(RefreshToken.token == refresh_token_str)
        if stored:
            stored.revoked = True
            await stored.save()

    @staticmethod
    async def forgot_password(email: str):
        # In production: send email with reset link
        # For now: log the token
        import logging
        logger = logging.getLogger(__name__)
        user = await User.find_one(User.email == email)
        if user:
            token = secrets.token_urlsafe(32)
            logger.info(f"Password reset token for {email}: {token}")

    @staticmethod
    async def reset_password(token: str, new_password: str):
        raise HTTPException(status_code=501, detail="Email-based reset not configured. Use change-password instead.")

    @staticmethod
    async def change_password(user: User, current_password: str, new_password: str):
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password incorrect")
        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        await user.save()
