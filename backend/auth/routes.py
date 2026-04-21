from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from auth.database import get_db, User
from auth.utils import (
    hash_password, verify_password,
    create_access_token, generate_verification_token,
)
from auth.email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str
    message: str


@router.post("/register", status_code=201)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    token = generate_verification_token()
    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        verification_token=token,
        is_verified=False,
    )
    db.add(user)
    db.commit()

    try:
        send_verification_email(req.email, token)
    except Exception as e:
        db.delete(user)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {str(e)}")

    return {"message": "Registered! Check your email to verify your account."}


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    token = create_access_token(user.email)
    return AuthResponse(token=token, email=user.email, message="Login successful")


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user.is_verified = True
    user.verification_token = None
    db.commit()

    return {"message": "Email verified successfully! You can now log in."}


@router.get("/me")
async def get_me(db: Session = Depends(get_db), token: str = ""):
    return {"message": "authenticated"}
