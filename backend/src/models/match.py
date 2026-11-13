from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..config.database import Base


class Match(Base):
    __tablename__ = "matches"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"))
    stage: Mapped[str] = mapped_column(String(10))                 # GROUP | SWISS | PLAYOFF
    round_label: Mapped[str] = mapped_column(String(40))
    round_number: Mapped[int] = mapped_column(Integer, default=1)
    position: Mapped[int] = mapped_column(Integer, default=1)
    group_name: Mapped[str | None] = mapped_column(String(10))
    bo: Mapped[int] = mapped_column(Integer, default=3)
    team1_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))
    team2_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))
    team1_score: Mapped[int] = mapped_column(Integer, default=0)
    team2_score: Mapped[int] = mapped_column(Integer, default=0)
    winner_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(24), default="WAITING_TEAMS")
    next_match_id: Mapped[int | None] = mapped_column(Integer)
    next_slot: Mapped[int | None] = mapped_column(Integer)
    loser_next_match_id: Mapped[int | None] = mapped_column(Integer)
    loser_next_slot: Mapped[int | None] = mapped_column(Integer)
    map_results: Mapped[list | None] = mapped_column(JSON, default=list)
    pending_result: Mapped[dict | None] = mapped_column(JSON)
    submitted_by_team_id: Mapped[int | None] = mapped_column(Integer)
    screenshot_url: Mapped[str | None] = mapped_column(String(255))
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)

    tournament = relationship("Tournament", back_populates="matches")
    team1 = relationship("Team", foreign_keys=[team1_id])
    team2 = relationship("Team", foreign_keys=[team2_id])
    vetoes = relationship("MatchVeto", cascade="all, delete-orphan", order_by="MatchVeto.step_order")

    def team_by_slot(self, slot: str):
        return self.team1 if slot == "A" else self.team2

    def slot_of(self, team_id: int) -> str | None:
        return "A" if team_id == self.team1_id else "B" if team_id == self.team2_id else None


class MatchVeto(Base):
    __tablename__ = "match_vetoes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"))
    step_order: Mapped[int] = mapped_column(Integer)
    team_id: Mapped[int | None] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(8))
    map_name: Mapped[str] = mapped_column(String(20))
    side: Mapped[str | None] = mapped_column(String(2))


class MatchPlayerStat(Base):
    __tablename__ = "match_player_stats"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"))
    map_number: Mapped[int] = mapped_column(Integer, default=1)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    kills: Mapped[int] = mapped_column(Integer, default=0)
    deaths: Mapped[int] = mapped_column(Integer, default=0)
    assists: Mapped[int] = mapped_column(Integer, default=0)
    adr: Mapped[float] = mapped_column(Numeric(5, 1), default=0)
    hs_percentage: Mapped[float] = mapped_column(Numeric(4, 1), default=0)

    user = relationship("User")
