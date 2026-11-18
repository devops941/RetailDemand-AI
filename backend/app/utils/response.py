from app.schemas.common import APIResponse


def success_response(data=None, message: str = "Success") -> APIResponse:
    return APIResponse(success=True, message=message, data=data)


def error_response(message: str = "Error") -> APIResponse:
    return APIResponse(success=False, message=message)
