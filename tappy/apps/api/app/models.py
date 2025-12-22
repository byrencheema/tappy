"""SQLAlchemy ORM models for Tappy database."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class JournalEntry(Base):
    """A journal entry written by the user."""

    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)  # Plain text for searching
    content_json: Mapped[str] = mapped_column(Text, nullable=False)  # Full Editor.js JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship to inbox items
    inbox_items: Mapped[list["InboxItem"]] = relationship(
        "InboxItem", back_populates="journal_entry", cascade="all, delete-orphan"
    )


class InboxItem(Base):
    """An action item in the user's inbox, typically created from journal analysis."""

    __tablename__ = "inbox_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    journal_entry_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # CTA text
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )  # pending, completed, needs_confirmation
    journal_excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_read: Mapped[bool] = mapped_column(default=False)

    # Relationship to journal entry
    journal_entry: Mapped[Optional["JournalEntry"]] = relationship(
        "JournalEntry", back_populates="inbox_items"
    )
