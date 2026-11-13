from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..config.database import Base

MAX_ROSTER = 7  # 5 titulares + até 2 reservas


class Team(Base):
    __tablename__ = "teams"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)
    tag: Mapped[str] = mapped_column(String(5), unique=True)
    logo_url: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(500))
    captain_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    looking_for_players: Mapped[bool] = mapped_column(Boolean, default=False)
    recruiting_roles: Mapped[list | None] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    tactical_role: Mapped[str] = mapped_column(String(20), default="Rifler")
    is_captain: Mapped[bool] = mapped_column(Boolean, default=False)
    is_starter: Mapped[bool] = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="membership")


class TeamInviteRequest(Base):
    __tablename__ = "team_invites_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(10))            # INVITE | REQUEST
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    tactical_role: Mapped[str | None] = mapped_column(String(20))
    message: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(12), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)

    team = relationship("Team")
    user = relationship("User")
