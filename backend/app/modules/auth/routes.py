# app/modules/auth/routes.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import create_access_token
from pydantic import BaseModel
 
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.rm_models import LoginUser
from app.core.security import verify_password
 
router = APIRouter()
 
class LoginRequest(BaseModel):
    username: str
    password: str
 
@router.post('/login')
async def login(data: LoginRequest):
    if data.username == "admin" and data.password == "admin":
        access_token = create_access_token(data={"sub": data.username, "role": "admin"})
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Incorrect username or password")
 
@router.post('/token')
async def login_oauth(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username == "admin" and form_data.password == "admin":
        access_token = create_access_token(data={"sub": form_data.username, "role": "admin"})
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Incorrect username or password")
