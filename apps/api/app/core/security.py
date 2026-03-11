from fastapi import HTTPException, status
from itsdangerous import BadSignature, URLSafeSerializer

from app.core.config import get_settings


def _serializer() -> URLSafeSerializer:
    settings = get_settings()
    return URLSafeSerializer(settings.secret_key, salt="demo-auth")


def create_access_token(user_id: str) -> str:
    return _serializer().dumps({"user_id": user_id})


def decode_access_token(token: str) -> str:
    try:
        payload = _serializer().loads(token)
    except BadSignature as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token."
        ) from exc

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token."
        )
    return str(user_id)

