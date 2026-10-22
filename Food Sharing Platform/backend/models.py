
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class NGO(Base):
    __tablename__ = "ngos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    capacity_kg = Column(Float, default=0)
    food_categories = Column(Text, nullable=True)
    is_available = Column(Boolean, default=True)
    is_verified = Column(Boolean, nullable=False, default=False, server_default="0")
    is_verified = Column(Boolean, nullable=False, default=False, server_default="0")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    food_name = Column(String(150), nullable=False)
    food_category = Column(String(80), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    pickup_deadline = Column(DateTime, nullable=False)
    pickup_location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    food_source = Column(String(80), nullable=True)
    prepared_at = Column(DateTime, nullable=True)
    storage_notes = Column(Text, nullable=True)
    food_safety_confirmed = Column(Boolean, nullable=False, default=False, server_default="0")
    status = Column(String(30), default="available")
    created_at = Column(DateTime, server_default=func.now())

class DonationAcceptance(Base):
    __tablename__ = "donation_acceptances"

    id = Column(Integer, primary_key=True, index=True)

    donation_id = Column(
        Integer,
        ForeignKey("donations.id"),
        unique=True,
        nullable=False,
    )

    ngo_id = Column(
        Integer,
        ForeignKey("ngos.id"),
        nullable=False,
    )

    accepted_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
