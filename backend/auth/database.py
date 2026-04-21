from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

SQLALCHEMY_DATABASE_URL = "sqlite:///./queryvault.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email      = Column(String, unique=True, index=True, nullable=False)
    hashed_password   = Column(String, nullable=False)
    is_verified       = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id          = Column(String, ForeignKey("users.id"), primary_key=True)
    display_name     = Column(String, default="")
    username         = Column(String, default="")
    linkedin         = Column(String, default="")
    github           = Column(String, default="")
    parental_enabled = Column(Boolean, default=False)
    parental_pin     = Column(String, default="")
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id    = Column(String, ForeignKey("users.id"), primary_key=True)
    theme      = Column(String, default="dark")
    language   = Column(String, default="en")
    contrast   = Column(String, default="default")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id       = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id  = Column(String, ForeignKey("users.id"), index=True)
    title    = Column(String, default="")
    messages = Column(Text, default="[]")   # JSON string
    doc_id   = Column(String, default="")
    doc_name = Column(String, default="")
    ts       = Column(DateTime, default=datetime.utcnow)


class Team(Base):
    __tablename__ = "teams"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = Column(String, nullable=False)
    owner_id   = Column(String, ForeignKey("users.id"), index=True)
    invite_code = Column(String, unique=True, index=True)   # 8-char code to join
    created_at = Column(DateTime, default=datetime.utcnow)


class TeamMember(Base):
    __tablename__ = "team_members"

    id        = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id   = Column(String, ForeignKey("teams.id"), index=True)
    user_id   = Column(String, ForeignKey("users.id"), index=True)
    role      = Column(String, default="member")   # "owner" | "member"
    joined_at = Column(DateTime, default=datetime.utcnow)


class TeamDocument(Base):
    __tablename__ = "team_documents"

    id        = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id   = Column(String, ForeignKey("teams.id"), index=True)
    doc_id    = Column(String, index=True)   # ChromaDB doc_id
    doc_name  = Column(String)
    added_by  = Column(String, ForeignKey("users.id"))
    added_at  = Column(DateTime, default=datetime.utcnow)


class APIKey(Base):
    __tablename__ = "api_keys"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), index=True)
    name       = Column(String, default="My Key")
    key_hash   = Column(String, unique=True, index=True)   # SHA-256 of the actual key
    key_prefix = Column(String)                             # first 8 chars shown to user
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used  = Column(DateTime, nullable=True)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
