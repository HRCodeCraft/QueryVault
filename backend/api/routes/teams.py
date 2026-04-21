import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from auth.database import get_db, Team, TeamMember, TeamDocument, User
from auth.utils import get_current_user

router = APIRouter(prefix="/teams", tags=["teams"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str

class TeamJoin(BaseModel):
    invite_code: str

class AddDocRequest(BaseModel):
    doc_id:   str
    doc_name: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_member(db, team_id, user_id):
    return db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

def _team_or_404(db, team_id):
    t = db.query(Team).filter(Team.id == team_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Team not found")
    return t


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
def list_my_teams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(TeamMember).filter(TeamMember.user_id == current_user.id).all()
    result = []
    for m in memberships:
        team = db.query(Team).filter(Team.id == m.team_id).first()
        if team:
            member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
            result.append({
                "id":           team.id,
                "name":         team.name,
                "role":         m.role,
                "invite_code":  team.invite_code if m.role == "owner" else None,
                "member_count": member_count,
            })
    return result


@router.post("/")
def create_team(data: TeamCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = Team(
        name=data.name.strip(),
        owner_id=current_user.id,
        invite_code=secrets.token_urlsafe(6),
    )
    db.add(team)
    db.flush()

    owner_member = TeamMember(team_id=team.id, user_id=current_user.id, role="owner")
    db.add(owner_member)
    db.commit()

    return {"id": team.id, "name": team.name, "invite_code": team.invite_code, "role": "owner"}


@router.post("/join")
def join_team(data: TeamJoin, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.invite_code == data.invite_code.strip()).first()
    if not team:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    existing = _get_member(db, team.id, current_user.id)
    if existing:
        raise HTTPException(status_code=409, detail="You are already a member of this team")

    db.add(TeamMember(team_id=team.id, user_id=current_user.id, role="member"))
    db.commit()
    return {"id": team.id, "name": team.name, "role": "member"}


@router.delete("/{team_id}")
def delete_or_leave_team(team_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = _team_or_404(db, team_id)
    member = _get_member(db, team_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    if member.role == "owner":
        # Owner deletes the whole team
        db.query(TeamDocument).filter(TeamDocument.team_id == team_id).delete()
        db.query(TeamMember).filter(TeamMember.team_id == team_id).delete()
        db.delete(team)
    else:
        db.delete(member)
    db.commit()
    return {"ok": True}


@router.get("/{team_id}/members")
def list_members(team_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _team_or_404(db, team_id)
    if not _get_member(db, team_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")

    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append({"email": user.email if user else "?", "role": m.role, "joined_at": m.joined_at.isoformat()})
    return result


@router.get("/{team_id}/documents")
def list_team_docs(team_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _team_or_404(db, team_id)
    if not _get_member(db, team_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")

    docs = db.query(TeamDocument).filter(TeamDocument.team_id == team_id).all()
    return [{"id": d.doc_id, "name": d.doc_name, "added_at": d.added_at.isoformat()} for d in docs]


@router.post("/{team_id}/documents")
def add_team_doc(team_id: str, data: AddDocRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _team_or_404(db, team_id)
    if not _get_member(db, team_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")

    db.add(TeamDocument(team_id=team_id, doc_id=data.doc_id, doc_name=data.doc_name, added_by=current_user.id))
    db.commit()
    return {"ok": True}


@router.delete("/{team_id}/documents/{doc_id}")
def remove_team_doc(team_id: str, doc_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _team_or_404(db, team_id)
    member = _get_member(db, team_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    db.query(TeamDocument).filter(
        TeamDocument.team_id == team_id,
        TeamDocument.doc_id == doc_id
    ).delete()
    db.commit()
    return {"ok": True}
