from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..config.database import Base

FORMAT_LABEL = {
    "GSL": "Grupos GSL (MD3) + Mata-Mata",
    "SWISS": "Sistema Suíço (3 Vitórias) + Mata-Mata",
    "ROUND_ROBIN": "Grupos Pontos Corridos + Mata-Mata",
}


class Tournament(Base):
    __tablename__ = "tournaments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    template_id: Mapped[str] = mapped_column(String(40))
    room_number: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(80))
    format: Mapped[str] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(12), default="REGISTRATION")
    max_teams: Mapped[int] = mapped_column(Integer)
    bo_group: Mapped[int] = mapped_column(Integer, default=3)
    bo_playoffs: Mapped[int] = mapped_column(Integer, default=3)
    bo_final: Mapped[int] = mapped_column(Integer, default=5)
    banner_url: Mapped[str | None] = mapped_column(String(255))
    rules: Mapped[str | None] = mapped_column(Text)
    trophy_name: Mapped[str] = mapped_column(String(80))
    trophy_icon: Mapped[str] = mapped_column(String(20), default="trophy")
    trophy_color: Mapped[str] = mapped_column(String(7), default="#de9b35")
    champion_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))
    mvp_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    registrations = relationship("TournamentRegistration", back_populates="tournament",
                                 cascade="all, delete-orphan", order_by="TournamentRegistration.id")
    matches = relationship("Match", back_populates="tournament", cascade="all, delete-orphan")


class TournamentRegistration(Base):
    __tablename__ = "tournament_registrations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    seed: Mapped[int | None] = mapped_column(Integer)
    group_name: Mapped[str | None] = mapped_column(String(10))
    lineup: Mapped[list] = mapped_column(JSON)  # [{userId, nickname, role, avatar}]
    registered_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tournament = relationship("Tournament", back_populates="registrations")
    team = relationship("Team")
