"""Create an administrator account without exposing a default credential.
Run from backend: python create_admin.py
"""
import getpass
from database import Base, engine, SessionLocal
import models
import bcrypt

Base.metadata.create_all(bind=engine)
email = input("Admin email: ").strip().lower()
name = input("Admin full name: ").strip()
password = getpass.getpass("Admin password (8-72 characters): ")
if len(name) < 2 or "@" not in email or not 8 <= len(password.encode("utf-8")) <= 72:
    raise SystemExit("Enter a valid name/email and a password of 8-72 bytes.")
db = SessionLocal()
try:
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise SystemExit("That email already exists. Use a different email or ask the database owner to promote the account.")
    user = models.User(full_name=name, email=email, role="admin", password_hash=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode())
    db.add(user)
    db.commit()
    print(f"Administrator created for {email}. Keep the credentials private.")
finally:
    db.close()
