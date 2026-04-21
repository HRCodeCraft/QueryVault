import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from auth.database import get_db, UserProfile, UserSettings, ChatSession
from auth.utils import get_current_user, User

router = APIRouter(prefix="/user", tags=["user"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ProfileIn(BaseModel):
    display_name:     Optional[str] = None
    username:         Optional[str] = None
    linkedin:         Optional[str] = None
    github:           Optional[str] = None
    parental_enabled: Optional[bool] = None
    parental_pin:     Optional[str] = None

class SettingsIn(BaseModel):
    theme:    Optional[str] = None
    language: Optional[str] = None
    contrast: Optional[str] = None

class SessionIn(BaseModel):
    id:       str
    title:    str
    messages: list
    doc_id:   str = ""
    doc_name: str = ""
    ts:       float  # JS timestamp (ms)


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not row:
        return {"display_name": "", "username": "", "linkedin": "", "github": "",
                "parental_enabled": False, "parental_pin": ""}
    return {
        "display_name":     row.display_name,
        "username":         row.username,
        "linkedin":         row.linkedin,
        "github":           row.github,
        "parental_enabled": row.parental_enabled,
        "parental_pin":     row.parental_pin,
    }

@router.put("/profile")
def update_profile(data: ProfileIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not row:
        row = UserProfile(user_id=current_user.id)
        db.add(row)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    row.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


# ── Settings ──────────────────────────────────────────────────────────────────

@router.get("/settings")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not row:
        return {"theme": "dark", "language": "en", "contrast": "default"}
    return {"theme": row.theme, "language": row.language, "contrast": row.contrast}

@router.put("/settings")
def update_settings(data: SettingsIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not row:
        row = UserSettings(user_id=current_user.id)
        db.add(row)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    row.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


# ── Chat sessions ─────────────────────────────────────────────────────────────

@router.get("/sessions")
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (db.query(ChatSession)
              .filter(ChatSession.user_id == current_user.id)
              .order_by(ChatSession.ts)
              .all())
    return [
        {
            "id":       r.id,
            "title":    r.title,
            "messages": json.loads(r.messages),
            "doc_id":   r.doc_id,
            "doc_name": r.doc_name,
            "ts":       r.ts.timestamp() * 1000,  # ms for JS
        }
        for r in rows
    ]

@router.post("/sessions")
def upsert_session(data: SessionIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(ChatSession).filter(
        ChatSession.id == data.id,
        ChatSession.user_id == current_user.id
    ).first()

    if row:
        row.title    = data.title
        row.messages = json.dumps(data.messages)
        row.doc_id   = data.doc_id
        row.doc_name = data.doc_name
        row.ts       = datetime.utcfromtimestamp(data.ts / 1000)
    else:
        # Keep max 50 sessions per user
        count = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).count()
        if count >= 50:
            oldest = (db.query(ChatSession)
                        .filter(ChatSession.user_id == current_user.id)
                        .order_by(ChatSession.ts)
                        .first())
            if oldest:
                db.delete(oldest)

        row = ChatSession(
            id=data.id, user_id=current_user.id,
            title=data.title, messages=json.dumps(data.messages),
            doc_id=data.doc_id, doc_name=data.doc_name,
            ts=datetime.utcfromtimestamp(data.ts / 1000),
        )
        db.add(row)

    db.commit()
    return {"ok": True}

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).delete()
    db.commit()
    return {"ok": True}

@router.delete("/sessions")
def clear_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(ChatSession).filter(ChatSession.user_id == current_user.id).delete()
    db.commit()
    return {"ok": True}
