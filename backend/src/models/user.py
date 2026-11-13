from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..config.database import Base

ROLES = ["IGL", "AWPer", "Entry Fragger", "Rifler", "Support", "Lurker"]


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(160), unique=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    nickname: Mapped[str] = mapped_column(String(32), unique=True)
    steam_id64: Mapped[str | None] = mapped_column(String(20), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255))
    main_role: Mapped[str] = mapped_column(String(20), default="Rifler")
    level: Mapped[int] = mapped_column(Integer, default=1)
    looking_for_team: Mapped[bool] = mapped_column(Boolean, default=False)
    matches_played: Mapped[int] = mapped_column(Integer, default=0)
    matches_won: Mapped[int] = mapped_column(Integer, default=0)
    total_kills: Mapped[int] = mapped_column(Integer, default=0)
    total_deaths: Mapped[int] = mapped_column(Integer, default=0)
    total_assists: Mapped[int] = mapped_column(Integer, default=0)
    total_hs_kills: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    membership = relationship("TeamMember", back_populates="user", uselist=False)

    @property
    def kd_ratio(self) -> float:
        return round(self.total_kills / self.total_deaths, 2) if self.total_deaths else float(self.total_kills)

    @property
    def win_rate(self) -> float:
        return round(100 * self.matches_won / self.matches_played, 1) if self.matches_played else 0.0

    @property
    def hs_percentage(self) -> float:
        return round(100 * self.total_hs_kills / self.total_kills, 1) if self.total_kills else 0.0
