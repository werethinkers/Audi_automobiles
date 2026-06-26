from typing import Optional, List
import uuid
from pydantic import BaseModel, Field

class VendorPortalAccessRequest(BaseModel):
    vendor_id: uuid.UUID
    portal_enabled: bool
    portal_username: Optional[str] = None
    portal_password: Optional[str] = Field(None, description="Provide only if resetting or creating new password")

class VendorPortalAccessResponse(BaseModel):
    vendor_id: uuid.UUID
    portal_enabled: bool
    portal_username: Optional[str]

class AdminRejectionReasonSchema(BaseModel):
    reason_code: str
    description: str
    is_active: bool
