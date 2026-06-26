import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

def now_utc():
    return datetime.utcnow()

class LoginUsers(Base):
    """
    Core Users table for internal staff.
    """
    __tablename__ = 'login_users'
    user_id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_code = Column(String(30), unique=True)
    name          = Column(String(255), nullable=False)
    mobile        = Column(String(20))
    email         = Column(String(255))
    password_hash = Column(String(255), nullable=False)
    role_code     = Column(String(50))
    is_active     = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(DateTime(timezone=True))
    created_at    = Column(DateTime(timezone=True), default=now_utc)
    updated_at    = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
