from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..config.database import Base


class Trophy(Base):
    """Uma linha por destinatário: user_id None = troféu do time; preenchido = jogador."""
    __tablename__ = "trophies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(10), default="CHAMPION")   # CHAMPION | MVP
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    awarded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tournament = relationship("Tournament")
