# backend/app/db/models.py
import enum
import uuid

from sqlalchemy import (JSON, Column, DateTime, Enum, Float, ForeignKey,
                        Integer, String, Text)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Device(Base):
    __tablename__ = "device"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BookStatusEnum(str, enum.Enum):
    to_read = "to_read"
    reading = "reading"
    finished = "finished"


class Book(Base):
    __tablename__ = "book"
    id = Column(Integer, primary_key=True, autoincrement=True)
    isbn = Column(String, nullable=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=True)
    cover_url = Column(Text, nullable=True)
    fingerprint = Column(String, unique=True, nullable=False)
    status = Column(
        Enum(BookStatusEnum, name="book_status_enum"),
        nullable=False,
        default=BookStatusEnum.to_read,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Scan(Base):
    __tablename__ = "scan"
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey("device.id"), nullable=False)
    image_hash = Column(String, nullable=False)
    result_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device")


class Preference(Base):
    __tablename__ = "preference"
    device_id = Column(UUID(as_uuid=True), ForeignKey("device.id"), primary_key=True)
    key = Column(String, primary_key=True)
    value_json = Column(JSON, nullable=False)

    device = relationship("Device")


class ActionEnum(str, enum.Enum):
    scanned = "scanned"
    saved = "saved"
    hide = "hide"
    recommended = "recommended"


class History(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey("device.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("book.id"), nullable=False)
    action = Column(Enum(ActionEnum, name="action_enum"), nullable=False)
    at = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device")
    book = relationship("Book")


class Recommendation(Base):
    __tablename__ = "recommendation"
    id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey("book.id"), nullable=False)
    device_id = Column(UUID(as_uuid=True), ForeignKey("device.id"), nullable=False)
    score = Column(Float, nullable=False)
    recommendation_text = Column(Text, nullable=False)
    match_quality = Column(String, nullable=False)  # 'perfect', 'good', 'fair', 'poor'
    is_perfect_match = Column(
        String, nullable=False
    )  # Store as string for JSON compatibility
    reasoning = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    book = relationship("Book")
    device = relationship("Device")


class ProviderEnum(str, enum.Enum):
    groq = "groq"
    gcv = "gcv"


class SpendLedger(Base):
    __tablename__ = "spend_ledger"
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(Enum(ProviderEnum, name="provider_enum"), nullable=False)
    cost_usd = Column(Float, nullable=False)
    at = Column(DateTime(timezone=True), server_default=func.now())
