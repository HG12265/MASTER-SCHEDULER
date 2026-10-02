from fastapi import status


class AppException(Exception):
    """Base application exception."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundException(AppException):
    """Resource not found (404)."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class BadRequestException(AppException):
    """Bad request / validation failure (400)."""

    def __init__(self, message: str = "Bad request"):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST)


class ConflictException(AppException):
    """Duplicate entity or uniqueness conflict (409)."""

    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message=message, status_code=status.HTTP_409_CONFLICT)


class DependencyException(AppException):
    """Referential integrity or dependent records block deletion (409)."""

    def __init__(self, message: str = "Resource cannot be deleted due to dependent records"):
        super().__init__(message=message, status_code=status.HTTP_409_CONFLICT)


class UnauthorizedException(AppException):
    """Authentication failed or missing token (401)."""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    """Permission denied (403)."""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)

