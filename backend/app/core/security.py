# app/core/security.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
 
bearer_scheme = HTTPBearer()
 
def hash_password(password: str) -> str:
    """
    Hashes a plain text password using bcrypt before storing it in the database.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
 
def verify_password(plain: str, hashed: str) -> bool:
    """
    Verifies a plain text password against its bcrypt hashed version during login.
    """
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
 
def create_access_token(data: dict) -> str:
    """
    Generates a secure JSON Web Token (JWT) for an authenticated user.
    Includes an expiration time to limit the lifespan of the session.
    """
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, 'exp': expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
 
def decode_token(token: str) -> dict:
    """
    Validates and decodes a JWT. 
    Raises a 401 Unauthorized exception if the token is tampered with or expired.
    """
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
 
def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """
    FastAPI Dependency to secure endpoints.
    Purpose: Extracts the Bearer token from the request header, decodes it, 
    and returns the user payload. Endpoints using this dependency will automatically
    reject unauthenticated requests.
    """
    return decode_token(creds.credentials)
