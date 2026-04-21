import secrets
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.database import get_db, APIKey
from auth.utils import get_current_user, User

router = APIRouter(prefix="/keys", tags=["api-keys"])


def _hash(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


class KeyCreate(BaseModel):
    name: str = "My Key"


@router.get("/")
def list_keys(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(APIKey).filter(APIKey.user_id == current_user.id).order_by(APIKey.created_at.desc()).all()
    return [
        {
            "id":         r.id,
            "name":       r.name,
            "key_prefix": r.key_prefix,
            "created_at": r.created_at.isoformat(),
            "last_used":  r.last_used.isoformat() if r.last_used else None,
        }
        for r in rows
    ]


@router.post("/")
def create_key(data: KeyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Max 5 keys per user
    count = db.query(APIKey).filter(APIKey.user_id == current_user.id).count()
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 API keys allowed per account.")

    raw_key = "qv_" + secrets.token_urlsafe(32)
    row = APIKey(
        user_id    = current_user.id,
        name       = data.name,
        key_hash   = _hash(raw_key),
        key_prefix = raw_key[:10],
    )
    db.add(row)
    db.commit()

    # Return full key ONCE — never stored in plain text
    return {"id": row.id, "name": row.name, "key": raw_key, "key_prefix": row.key_prefix}


@router.delete("/{key_id}")
def delete_key(key_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(APIKey).filter(APIKey.id == key_id, APIKey.user_id == current_user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
