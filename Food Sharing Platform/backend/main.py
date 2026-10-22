
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import base64, hashlib, hmac, json, os, time
from math import radians, sin, cos, asin, sqrt
from typing import Literal
from fastapi import Header
import bcrypt

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
import models


# Create database tables when the application starts
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_schema_compatibility()
    yield


app = FastAPI(
    title="Food Sharing Platform API",
    description="Backend API for the Food Sharing Platform",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS: allow the local frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Lightweight signed bearer tokens for this local prototype. Set APP_SECRET_KEY in backend/.env
# to a long random value before using beyond local development.
_TOKEN_SECRET = os.getenv("APP_SECRET_KEY") or os.getenv("JWT_SECRET_KEY")
if not _TOKEN_SECRET:
    # Stable local fallback so tokens survive restarts; configure APP_SECRET_KEY for real deployments.
    _TOKEN_SECRET = hashlib.sha256((os.getenv("DATABASE_URL", "local-development") + "|food-sharing-local-token").encode()).hexdigest()

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

def create_access_token(user_id: int, role: str) -> str:
    payload = _b64url(json.dumps({"sub": int(user_id), "role": role, "exp": int(time.time()) + 43200}, separators=(",", ":")).encode())
    signature = _b64url(hmac.new(_TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).digest())
    return payload + "." + signature

def require_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload_part, signature = token.split(".", 1)
        expected = _b64url(hmac.new(_TOKEN_SECRET.encode(), payload_part.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid signature")
        payload = json.loads(base64.urlsafe_b64decode(payload_part + "=" * (-len(payload_part) % 4)))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        return {"user_id": int(payload["sub"]), "role": str(payload["role"])}
    except Exception:
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Please log in again.")

def require_role(user: dict, *roles: str):
    if user["role"] not in roles:
        raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")

def _ensure_schema_compatibility():
    # Safe additive migration: retain all rows and only add the missing NGO verification column.
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "ngos" in tables and "is_verified" not in {c["name"] for c in inspector.get_columns("ngos")}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE ngos ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 1"))
    if "donations" in tables:
        existing = {c["name"] for c in inspect(engine).get_columns("donations")}
        additions = {
            "description": "TEXT NULL",
            "food_source": "VARCHAR(80) NULL",
            "prepared_at": "DATETIME NULL",
            "storage_notes": "TEXT NULL",
            "food_safety_confirmed": "BOOLEAN NOT NULL DEFAULT 0",
        }
        with engine.begin() as connection:
            for column, definition in additions.items():
                if column not in existing:
                    connection.execute(text(f"ALTER TABLE donations ADD COLUMN {column} {definition}"))

# Request models
class DonorCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=150)


class AuthRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=8, max_length=72)
    role: Literal["donor", "ngo"]
    city: str = Field(default="Nagpur", min_length=2, max_length=80)
    organization_name: str | None = Field(default=None, min_length=2, max_length=150)
    latitude: float | None = None
    longitude: float | None = None
    capacity_kg: float = Field(default=50, gt=0, le=100000)
    food_categories: str = Field(default="cooked meals,bakery,fresh produce,packaged food,dairy,other", min_length=2, max_length=500)
    organization_name: str | None = Field(default=None, min_length=2, max_length=150)
    latitude: float | None = None
    longitude: float | None = None
    capacity_kg: float = Field(default=50, gt=0, le=100000)
    food_categories: str = Field(default="cooked meals,bakery,fresh produce,packaged food,dairy,other", min_length=2, max_length=500)


class AuthLogin(BaseModel):
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=1, max_length=128)
    role: Literal["donor", "ngo", "admin"]


class DonationCreate(BaseModel):
    donor_id: int = Field(gt=0)
    food_name: str = Field(min_length=2, max_length=150)
    food_category: str = Field(min_length=2, max_length=80)
    quantity_kg: float = Field(gt=0)
    pickup_deadline: datetime
    pickup_location: str = Field(min_length=3, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    description: str | None = Field(default=None, max_length=2000)
    food_source: str | None = Field(default=None, max_length=80)
    prepared_at: datetime | None = None
    storage_notes: str | None = Field(default=None, max_length=2000)
    food_safety_confirmed: bool = False


class NGOCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=150)
    organization_name: str = Field(min_length=2, max_length=150)
    latitude: float | None = None
    longitude: float | None = None
    capacity_kg: float = Field(gt=0)
    food_categories: str = Field(min_length=2, max_length=500)


class DonationStatusUpdate(BaseModel):
    status: Literal["picked_up", "completed", "cancelled"]


class DonationAcceptRequest(BaseModel):
    ngo_id: int = Field(gt=0)


def normalize_utc_naive(value: datetime) -> datetime:
    """Store/compare pickup deadlines consistently as naive UTC datetimes."""
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


# Basic health endpoints
@app.get("/")
def root():
    return {"message": "Food Sharing Platform API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-health")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed. Check backend configuration.",
        )


# Account registration and password verification for the local prototype.
# API role authorization is a separate hardening task before public deployment.
@app.post("/auth/register", status_code=201)
def auth_register(payload: AuthRegister, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@") or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    if (payload.latitude is None) != (payload.longitude is None):
        raise HTTPException(status_code=422, detail="Provide both NGO latitude and longitude, or leave both blank.")
    if payload.latitude is not None and not -90 <= payload.latitude <= 90:
        raise HTTPException(status_code=422, detail="Latitude must be between -90 and 90.")
    if payload.longitude is not None and not -180 <= payload.longitude <= 180:
        raise HTTPException(status_code=422, detail="Longitude must be between -180 and 180.")
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="This email is already registered.")

    password_bytes = payload.password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(status_code=422, detail="Password must be no more than 72 UTF-8 bytes.")
    password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")
    user = models.User(
        full_name=payload.full_name.strip(),
        email=email,
        password_hash=password_hash,
        role=payload.role,
    )
    try:
        db.add(user)
        db.flush()
        ngo_id = None
        if payload.role == "ngo":
            city_coords = {
                "nagpur": (21.1458, 79.0882),
                "indore": (22.7196, 75.8577),
            }
            latitude, longitude = city_coords.get(payload.city.casefold(), (None, None))
            ngo = models.NGO(
                user_id=user.id,
                organization_name=(payload.organization_name or payload.full_name).strip(),
                latitude=payload.latitude if payload.latitude is not None else latitude,
                longitude=payload.longitude if payload.longitude is not None else longitude,
                capacity_kg=payload.capacity_kg,
                food_categories=payload.food_categories,
                is_available=True,
                is_verified=False,
            )
            db.add(ngo)
            db.flush()
            ngo_id = ngo.id
        db.commit()
        db.refresh(user)
        return {
            "message": "Account created successfully",
            "user_id": user.id,
            "donor_id": user.id if user.role == "donor" else None,
            "ngo_id": ngo_id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "city": payload.city,
            "access_token": create_access_token(user.id, user.role),
            "token_type": "bearer",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not create the account.")


@app.post("/auth/login")
def auth_login(payload: AuthLogin, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@") or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    user = db.query(models.User).filter(
        models.User.email == email,
        models.User.role == payload.role,
    ).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email, password, or role.")
    try:
        valid = bcrypt.checkpw(
            payload.password.encode("utf-8"),
            user.password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        valid = False
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid email, password, or role.")

    ngo = db.query(models.NGO).filter(models.NGO.user_id == user.id).first() if user.role == "ngo" else None
    return {
        "message": "Login successful",
        "user_id": user.id,
        "donor_id": user.id if user.role == "donor" else None,
        "ngo_id": ngo.id if ngo else None,
        "name": user.full_name,
        "email": user.email,
        "role": user.role,
        "access_token": create_access_token(user.id, user.role),
        "token_type": "bearer",
    }


# Register a donor
@app.post("/donors", status_code=410, deprecated=True)
def create_donor_legacy():
    raise HTTPException(status_code=410, detail="Use POST /auth/register to create an account with a password.")


# Create a food donation
@app.post("/donations", status_code=201)
def create_donation(
    donation: DonationCreate,
    db: Session = Depends(get_db),
    current: dict = Depends(require_user),
):
    require_role(current, "donor")
    if current["user_id"] != donation.donor_id:
        raise HTTPException(status_code=403, detail="You can only create donations for your own account.")
    donor = (
        db.query(models.User)
        .filter(
            models.User.id == donation.donor_id,
            models.User.role == "donor",
        )
        .first()
    )

    if not donor:
        raise HTTPException(
            status_code=404,
            detail="Donor not found. Register a donor first.",
        )

    if not donation.food_safety_confirmed:
        raise HTTPException(status_code=422, detail="Confirm that the food is suitable and safe for redistribution.")
    if (donation.latitude is None) != (donation.longitude is None):
        raise HTTPException(status_code=422, detail="Provide both latitude and longitude, or leave both blank.")
    if donation.latitude is not None and not -90 <= donation.latitude <= 90:
        raise HTTPException(status_code=422, detail="Latitude must be between -90 and 90.")
    if donation.longitude is not None and not -180 <= donation.longitude <= 180:
        raise HTTPException(status_code=422, detail="Longitude must be between -180 and 180.")
    pickup_deadline = normalize_utc_naive(donation.pickup_deadline)
    if donation.prepared_at and normalize_utc_naive(donation.prepared_at) > datetime.utcnow():
        raise HTTPException(status_code=422, detail="Preparation time cannot be in the future.")
    if pickup_deadline <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Pickup deadline must be in the future.",
        )

    donation_values = donation.model_dump(exclude={"pickup_deadline"})
    if donation_values.get("prepared_at") is not None:
        donation_values["prepared_at"] = normalize_utc_naive(donation_values["prepared_at"])
    new_donation = models.Donation(
        **donation_values,
        pickup_deadline=pickup_deadline,
    )

    db.add(new_donation)
    db.commit()
    db.refresh(new_donation)

    return {
        "message": "Donation created successfully",
        "donation_id": new_donation.id,
        "food_name": new_donation.food_name,
        "quantity_kg": new_donation.quantity_kg,
        "status": new_donation.status,
        "food_safety_confirmed": new_donation.food_safety_confirmed,
    }


# List all donations
@app.get("/donations")
def get_donations(db: Session = Depends(get_db)):
    donations = (
        db.query(models.Donation)
        .filter(models.Donation.status == "available", models.Donation.food_safety_confirmed.is_(True))
        .order_by(models.Donation.id.desc())
        .all()
    )
    results = []
    for item in donations:
        parts = [part.strip() for part in (item.pickup_location or "").split(",") if part.strip()]
        approximate_location = ", ".join(parts[-2:]) if len(parts) > 2 else (parts[-1] if parts else "Location provided after acceptance")
        results.append({
            "id": item.id,
            "food_name": item.food_name,
            "food_category": item.food_category,
            "quantity_kg": item.quantity_kg,
            "pickup_deadline": item.pickup_deadline,
            "pickup_location": approximate_location,
            "latitude": round(item.latitude, 2) if item.latitude is not None else None,
            "longitude": round(item.longitude, 2) if item.longitude is not None else None,
            "status": item.status,
        })
    return results


@app.post("/ngos", status_code=410, deprecated=True)
def create_ngo_legacy():
    raise HTTPException(status_code=410, detail="Use POST /auth/register with role 'ngo' to create an account securely.")


# List all NGOs
@app.get("/ngos")
def get_ngos(db: Session = Depends(get_db)):
    ngos = (
        db.query(models.NGO)
        .filter(models.NGO.is_verified.is_(True))
        .order_by(models.NGO.id.asc())
        .all()
    )

    return [
        {
            "id": ngo.id,
            "user_id": ngo.user_id,
            "organization_name": ngo.organization_name,
            "latitude": ngo.latitude,
            "longitude": ngo.longitude,
            "capacity_kg": ngo.capacity_kg,
            "food_categories": ngo.food_categories,
            "is_available": ngo.is_available,
        }
        for ngo in ngos
    ]


@app.get("/ngos/{ngo_id}/donations")
def get_ngo_donations(ngo_id: int, db: Session = Depends(get_db), current: dict = Depends(require_user)):
    require_role(current, "ngo", "admin")
    if current["role"] == "ngo":
        own_ngo = db.query(models.NGO).filter(models.NGO.user_id == current["user_id"]).first()
        if not own_ngo or own_ngo.id != ngo_id:
            raise HTTPException(status_code=403, detail="You can only view your own accepted donations.")
    ngo = db.query(models.NGO).filter(models.NGO.id == ngo_id).first()
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found.")
    acceptances = (
        db.query(models.DonationAcceptance)
        .filter(models.DonationAcceptance.ngo_id == ngo_id)
        .order_by(models.DonationAcceptance.id.desc())
        .all()
    )
    results = []
    for acceptance in acceptances:
        donation = db.query(models.Donation).filter(
            models.Donation.id == acceptance.donation_id
        ).first()
        if donation:
            results.append({
                "id": donation.id,
                "donor_id": donation.donor_id,
                "food_name": donation.food_name,
                "food_category": donation.food_category,
                "quantity_kg": donation.quantity_kg,
                "pickup_deadline": donation.pickup_deadline,
                "pickup_location": donation.pickup_location,
                "latitude": donation.latitude,
                "longitude": donation.longitude,
                "description": donation.description,
                "food_source": donation.food_source,
                "prepared_at": donation.prepared_at,
                "storage_notes": donation.storage_notes,
                "food_safety_confirmed": donation.food_safety_confirmed,
                "status": donation.status,
                "accepted_at": acceptance.accepted_at,
            })
    return {"ngo_id": ngo_id, "donations": results}


@app.get("/stats")
def get_platform_stats(db: Session = Depends(get_db)):
    donations = db.query(models.Donation).all()
    users = db.query(models.User).all()
    ngos = db.query(models.NGO).all()
    completed = [d for d in donations if d.status == "completed"]
    return {
        "total_donations": len(donations),
        "completed_donations": len(completed),
        "food_redistributed_kg": round(sum(float(d.quantity_kg or 0) for d in completed), 2),
        "registered_donors": sum(1 for u in users if u.role == "donor"),
        "registered_ngos": len(ngos),
        "available_donations": sum(1 for d in donations if d.status == "available"),
    }


def food_category_matches(donation_category: str, ngo_categories: str) -> bool:
    aliases = {
        "cooked meals": {"cooked meals", "cooked food", "prepared meals"},
        "cooked food": {"cooked meals", "cooked food", "prepared meals"},
        "prepared meals": {"cooked meals", "cooked food", "prepared meals"},
        "fresh produce": {"fresh produce", "vegetables", "fruits"},
        "bakery": {"bakery", "baked goods"},
    }
    wanted = donation_category.strip().casefold()
    accepted = {part.strip().casefold() for part in (ngo_categories or "").split(",")}
    equivalent = aliases.get(wanted, {wanted})
    return bool(equivalent & accepted)


@app.get("/admin/overview")
def admin_overview(db: Session = Depends(get_db), current: dict = Depends(require_user)):
    require_role(current, "admin")
    users = db.query(models.User).all()
    ngos = db.query(models.NGO).all()
    donations = db.query(models.Donation).all()
    return {
        "registered_donors": sum(1 for u in users if u.role == "donor"),
        "registered_ngos": len(ngos),
        "pending_ngos": sum(1 for n in ngos if not getattr(n, "is_verified", True)),
        "total_donations": len(donations),
        "available_donations": sum(1 for d in donations if d.status == "available"),
        "completed_donations": sum(1 for d in donations if d.status == "completed"),
        "donations": [{"id": d.id, "food_name": d.food_name, "donor_id": d.donor_id, "pickup_location": d.pickup_location, "quantity_kg": d.quantity_kg, "status": d.status} for d in sorted(donations, key=lambda x: x.id, reverse=True)[:100]],
        "ngos": [{"id": n.id, "organization_name": n.organization_name, "user_id": n.user_id, "capacity_kg": n.capacity_kg, "is_available": n.is_available, "is_verified": getattr(n, "is_verified", True)} for n in ngos],
    }

@app.patch("/admin/ngos/{ngo_id}/verification")
def admin_verify_ngo(ngo_id: int, payload: dict, db: Session = Depends(get_db), current: dict = Depends(require_user)):
    require_role(current, "admin")
    verified = payload.get("is_verified")
    if not isinstance(verified, bool):
        raise HTTPException(status_code=422, detail="is_verified must be true or false.")
    ngo = db.query(models.NGO).filter(models.NGO.id == ngo_id).first()
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found.")
    ngo.is_verified = verified
    db.commit()
    return {"message": "NGO verification updated.", "ngo_id": ngo.id, "is_verified": ngo.is_verified}

@app.patch("/admin/donations/{donation_id}/moderation")
def admin_moderate_donation(donation_id: int, payload: dict, db: Session = Depends(get_db), current: dict = Depends(require_user)):
    require_role(current, "admin")
    action = payload.get("action")
    if action not in {"cancel", "restore"}:
        raise HTTPException(status_code=422, detail="action must be 'cancel' or 'restore'.")
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found.")
    acceptance = db.query(models.DonationAcceptance).filter(models.DonationAcceptance.donation_id == donation_id).first()
    if action == "cancel":
        if donation.status != "available" or acceptance:
            raise HTTPException(status_code=400, detail="Only unaccepted, available donations can be cancelled by moderation.")
        donation.status = "cancelled"
    else:
        if donation.status != "cancelled" or acceptance:
            raise HTTPException(status_code=400, detail="Only cancelled, never-accepted donations can be restored.")
        if donation.pickup_deadline <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="An expired donation cannot be restored.")
        donation.status = "available"
    db.commit()
    return {"message": "Moderation action saved.", "donation_id": donation.id, "status": donation.status}

@app.get("/admin/overview")
def admin_overview(db: Session = Depends(get_db), current: dict = Depends(require_user)):
    require_role(current, "admin")
    users = db.query(models.User).all()
    ngos = db.query(models.NGO).all()
    donations = db.query(models.Donation).all()
    return {
        "registered_donors": sum(1 for u in users if u.role == "donor"),
        "registered_ngos": len(ngos),
        "pending_ngos": sum(1 for n in ngos if not getattr(n, "is_verified", True)),
        "total_donations": len(donations),
        "available_donations": sum(1 for d in donations if d.status == "available"),
        "completed_donations": sum(1 for d in donations if d.status == "completed"),
        "donations": [{"id": d.id, "food_name": d.food_name, "donor_id": d.donor_id, "pickup_location": d.pickup_location, "quantity_kg": d.quantity_kg, "status": d.status} for d in sorted(donations, key=lambda x: x.id, reverse=True)[:100]],
        "ngos": [{"id": n.id, "organization_name": n.organization_name, "user_id": n.user_id, "capacity_kg": n.capacity_kg, "is_available": n.is_available, "is_verified": getattr(n, "is_verified", True)} for n in ngos],
    }

@app.patch("/admin/ngos/{ngo_id}/verification")
def admin_verify_ngo(ngo_id: int, payload: dict, db: Session = Depends(get_db), current: dict = Depends(require_user)):
    require_role(current, "admin")
    verified = payload.get("is_verified")
    if not isinstance(verified, bool):
        raise HTTPException(status_code=422, detail="is_verified must be true or false.")
    ngo = db.query(models.NGO).filter(models.NGO.id == ngo_id).first()
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found.")
    ngo.is_verified = verified
    db.commit()
    return {"message": "NGO verification updated.", "ngo_id": ngo.id, "is_verified": ngo.is_verified}

@app.patch("/admin/donations/{donation_id}/moderation")
def admin_moderate_donation(donation_id: int, payload: dict, db: Session = Depends(get_db), current: dict = Depends(require_user)):
    require_role(current, "admin")
    action = payload.get("action")
    if action not in {"cancel", "restore"}:
        raise HTTPException(status_code=422, detail="action must be 'cancel' or 'restore'.")
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found.")
    acceptance = db.query(models.DonationAcceptance).filter(models.DonationAcceptance.donation_id == donation_id).first()
    if action == "cancel":
        if donation.status != "available" or acceptance:
            raise HTTPException(status_code=400, detail="Only unaccepted, available donations can be cancelled by moderation.")
        donation.status = "cancelled"
    else:
        if donation.status != "cancelled" or acceptance:
            raise HTTPException(status_code=400, detail="Only cancelled, never-accepted donations can be restored.")
        if donation.pickup_deadline <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="An expired donation cannot be restored.")
        donation.status = "available"
    db.commit()
    return {"message": "Moderation action saved.", "donation_id": donation.id, "status": donation.status}

# Calculate distance between two coordinates in kilometres
def calculate_distance_km(lat1, lon1, lat2, lon2):
    earth_radius_km = 6371.0

    lat1, lon1, lat2, lon2 = map(
        radians, [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    )

    a = max(0.0, min(1.0, a))

    return 2 * earth_radius_km * asin(sqrt(a))


# Find and rank suitable NGOs for a donation
@app.get("/donations/{donation_id}/matches")
def match_ngos(
    donation_id: int,
    db: Session = Depends(get_db),
):
    donation = (
        db.query(models.Donation)
        .filter(models.Donation.id == donation_id)
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    if donation.pickup_deadline <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="This donation has expired. Its pickup deadline has passed.",
        )

    if donation.status != "available":
        raise HTTPException(
            status_code=400,
            detail="This donation is not available for matching.",
        )
    if not donation.food_safety_confirmed:
        raise HTTPException(status_code=400, detail="Food-safety confirmation is required before matching.")

    if donation.latitude is None or donation.longitude is None:
        raise HTTPException(
            status_code=400,
            detail="Donation location coordinates are required for matching.",
        )

    ngos = (
        db.query(models.NGO)
        .filter(models.NGO.is_available.is_(True), models.NGO.is_verified.is_(True))
        .all()
    )

    matches = []

    for ngo in ngos:
        if ngo.latitude is None or ngo.longitude is None:
            continue

        if (
            ngo.capacity_kg is None
            or ngo.capacity_kg < donation.quantity_kg
        ):
            continue

        if not food_category_matches(donation.food_category, ngo.food_categories):
            continue

        distance = calculate_distance_km(
            donation.latitude,
            donation.longitude,
            ngo.latitude,
            ngo.longitude,
        )

        # Beginner-friendly rule-based matching score
        score = max(0.0, 100.0 - distance)

        matches.append({
            "ngo_id": ngo.id,
            "organization_name": ngo.organization_name,
            "distance_km": round(distance, 2),
            "capacity_kg": ngo.capacity_kg,
            "food_categories": ngo.food_categories,
            "match_score": round(score, 2),
        })

    matches.sort(
        key=lambda item: item["match_score"],
        reverse=True,
    )

    return {
        "donation_id": donation.id,
        "food_name": donation.food_name,
        "quantity_kg": donation.quantity_kg,
        "total_matches": len(matches),
        "matches": matches,
    }


# Update donation status
@app.patch("/donations/{donation_id}/status")
def update_donation_status(
    donation_id: int,
    update: DonationStatusUpdate,
    db: Session = Depends(get_db),
    current: dict = Depends(require_user),
):
    require_role(current, "donor", "ngo", "admin")
    donation = (
        db.query(models.Donation)
        .filter(models.Donation.id == donation_id)
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    if donation.status in {"completed", "cancelled"}:
        raise HTTPException(status_code=400, detail="A completed or cancelled donation cannot be updated.")
    acceptance = db.query(models.DonationAcceptance).filter(models.DonationAcceptance.donation_id == donation_id).first()
    if current["role"] == "donor":
        if donation.donor_id != current["user_id"] or donation.status != "available" or update.status != "cancelled":
            raise HTTPException(status_code=403, detail="Donors may only cancel their own available donations.")
    elif current["role"] == "ngo":
        own_ngo = db.query(models.NGO).filter(models.NGO.user_id == current["user_id"]).first()
        if not acceptance or not own_ngo or acceptance.ngo_id != own_ngo.id:
            raise HTTPException(status_code=403, detail="Only the accepting NGO may update this pickup.")
    allowed_transitions = {
        "available": {"cancelled"},
        "accepted": {"picked_up"},
        "picked_up": {"completed"},
    }
    if update.status not in allowed_transitions.get(donation.status, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from '{donation.status}' to '{update.status}'.",
        )

    donation.status = update.status

    db.commit()
    db.refresh(donation)

    return {
        "message": "Donation status updated successfully",
        "donation_id": donation.id,
        "food_name": donation.food_name,
        "status": donation.status,
    }


# Get donations belonging to a donor
@app.get("/donors/{donor_id}/donations")
def get_donor_donations(
    donor_id: int,
    db: Session = Depends(get_db),
    current: dict = Depends(require_user),
):
    require_role(current, "donor", "admin")
    if current["role"] != "admin" and current["user_id"] != donor_id:
        raise HTTPException(status_code=403, detail="You can only view your own donation history.")
    donor = (
        db.query(models.User)
        .filter(
            models.User.id == donor_id,
            models.User.role == "donor",
        )
        .first()
    )

    if not donor:
        raise HTTPException(
            status_code=404,
            detail="Donor not found.",
        )

    donations = (
        db.query(models.Donation)
        .filter(models.Donation.donor_id == donor_id)
        .order_by(models.Donation.id.desc())
        .all()
    )

    return {
        "donor_id": donor.id,
        "donor_name": donor.full_name,
        "total_donations": len(donations),
        "donations": [
            {
                "id": item.id,
                "food_name": item.food_name,
                "food_category": item.food_category,
                "quantity_kg": item.quantity_kg,
                "pickup_deadline": item.pickup_deadline,
                "pickup_location": item.pickup_location,
                "description": item.description,
                "food_source": item.food_source,
                "prepared_at": item.prepared_at,
                "storage_notes": item.storage_notes,
                "food_safety_confirmed": item.food_safety_confirmed,
                "status": item.status,
            }
            for item in donations
        ],
    }


# Accept a donation for an NGO
@app.post("/donations/{donation_id}/accept")
def accept_donation(
    donation_id: int,
    request: DonationAcceptRequest,
    db: Session = Depends(get_db),
    current: dict = Depends(require_user),
):
    require_role(current, "ngo")
    own_ngo = db.query(models.NGO).filter(models.NGO.user_id == current["user_id"]).first()
    if not own_ngo or own_ngo.id != request.ngo_id:
        raise HTTPException(status_code=403, detail="You can only accept donations for your own NGO.")
    donation = (
        db.query(models.Donation)
        .filter(models.Donation.id == donation_id)
        .with_for_update()
        .first()
    )

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found.",
        )

    if donation.status != "available":
        raise HTTPException(
            status_code=400,
            detail="This donation is not available for acceptance.",
        )
    if not donation.food_safety_confirmed:
        raise HTTPException(status_code=400, detail="Food-safety confirmation is required before acceptance.")

    if donation.pickup_deadline <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="The pickup deadline has passed.",
        )

    ngo = (
        db.query(models.NGO)
        .filter(models.NGO.id == request.ngo_id)
        .first()
    )

    if not ngo:
        raise HTTPException(
            status_code=404,
            detail="NGO not found.",
        )

    if not ngo.is_available:
        raise HTTPException(status_code=400, detail="NGO is not available.")
    if not getattr(ngo, "is_verified", True):
        raise HTTPException(status_code=403, detail="This NGO must be verified by an administrator before accepting donations.")

    if (ngo.capacity_kg or 0) < donation.quantity_kg:
        raise HTTPException(
            status_code=400,
            detail="NGO capacity is insufficient.",
        )

    if not food_category_matches(donation.food_category, ngo.food_categories):
        raise HTTPException(
            status_code=400,
            detail="NGO does not accept this food category.",
        )

    existing = (
        db.query(models.DonationAcceptance)
        .filter(
            models.DonationAcceptance.donation_id == donation_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="This donation has already been accepted.",
        )

    acceptance = models.DonationAcceptance(
        donation_id=donation_id,
        ngo_id=ngo.id,
    )

    try:
        db.add(acceptance)
        donation.status = "accepted"
        db.commit()
        db.refresh(acceptance)

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This donation was accepted by another NGO just now.")
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save donation acceptance.",
        )

    return {
        "message": "Donation accepted successfully",
        "donation_id": donation_id,
        "ngo_id": ngo.id,
        "organization_name": ngo.organization_name,
        "acceptance_id": acceptance.id,
        "accepted_at": acceptance.accepted_at,
        "status": donation.status,
    }
