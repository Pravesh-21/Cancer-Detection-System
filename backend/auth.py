"""
auth.py — Hospital accounts, staff users and login sessions (MongoDB).

Collections (same database as the patient registry)
  hospitals : one document per registered hospital (HSP-XXXXXX)
  users     : staff accounts; each belongs to exactly one hospital
  sessions  : login sessions; only a SHA-256 of the token is stored, and a TTL
              index deletes them automatically when they expire

Every patient folder carries the owning hospital's id, and all registry
queries filter on it — a hospital can never see another hospital's patients.

Passwords are hashed with scrypt (memory-hard, per-user random salt).

Environment
  SESSION_TTL_HOURS          login lifetime (default 12 — one clinical shift)
  HOSPITAL_REGISTRATION_CODE optional; when set, registering a hospital requires it
"""

import base64
import hashlib
import hmac
import os
import re
import secrets
import string
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from pymongo.errors import DuplicateKeyError

_CODE_ALPHABET = string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789"
_SCRYPT = {"n": 2 ** 14, "r": 8, "p": 1}
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 15 * 60


class AuthError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _code(prefix: str) -> str:
    return f"{prefix}-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))


# ── Passwords ────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, dklen=32, **_SCRYPT)
    return "scrypt${n}${r}${p}${salt}${dk}".format(
        **_SCRYPT, salt=base64.b64encode(salt).decode(), dk=base64.b64encode(dk).decode()
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        _, n, r, p, salt, dk = stored.split("$")
        calc = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt), dklen=32,
                              n=int(n), r=int(r), p=int(p))
        return hmac.compare_digest(calc, base64.b64decode(dk))
    except (ValueError, TypeError):
        return False


# Used when the e-mail doesn't exist so response time doesn't reveal registered accounts
_DUMMY_HASH = hash_password(secrets.token_urlsafe(12))


def validate_password(password: str) -> None:
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise AuthError(422, "Password must be at least 8 characters and include a letter and a number")


# ── Brute-force protection (per e-mail, per process) ─────────────────────────
_failures: Dict[str, Tuple[int, float]] = {}
_failures_lock = threading.Lock()


def _check_lockout(email: str) -> None:
    with _failures_lock:
        count, first = _failures.get(email, (0, 0.0))
        if count >= MAX_FAILED_LOGINS and time.time() - first < LOCKOUT_SECONDS:
            mins = int((LOCKOUT_SECONDS - (time.time() - first)) // 60) + 1
            raise AuthError(429, f"Too many failed attempts. Try again in {mins} minute(s).")


def _record_failure(email: str) -> None:
    with _failures_lock:
        count, first = _failures.get(email, (0, 0.0))
        if time.time() - first >= LOCKOUT_SECONDS:
            count, first = 0, time.time()
        _failures[email] = (count + 1, first)


def _clear_failures(email: str) -> None:
    with _failures_lock:
        _failures.pop(email, None)


# ── Store ────────────────────────────────────────────────────────────────────
class AuthStore:
    def __init__(self, db):
        self.db = db
        self.hospitals = db["hospitals"]
        self.users = db["users"]
        self.sessions = db["sessions"]

    def ensure_schema(self) -> None:
        self.hospitals.create_index("hospital_code", unique=True, name="uniq_hospital_code")
        self.users.create_index("email", unique=True, name="uniq_email")
        self.users.create_index("hospital_id", name="by_hospital")
        self.sessions.create_index("token_hash", unique=True, name="uniq_token")
        self.sessions.create_index("expires_at", expireAfterSeconds=0, name="ttl_expiry")

    # Sessions
    def _create_session(self, user: Dict[str, Any]) -> Dict[str, Any]:
        token = secrets.token_urlsafe(32)
        ttl = timedelta(hours=float(os.environ.get("SESSION_TTL_HOURS", "12")))
        expires = _now() + ttl
        self.sessions.insert_one({
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "user_id": user["_id"],
            "hospital_id": user["hospital_id"],
            "created_at": _now(),
            "expires_at": expires,
        })
        return {"token": token, "expiresAt": expires.isoformat().replace("+00:00", "Z"),
                "maxAgeSeconds": int(ttl.total_seconds())}

    def resolve_session(self, token: str) -> Optional[Dict[str, Any]]:
        if not token:
            return None
        sess = self.sessions.find_one({"token_hash": hashlib.sha256(token.encode()).hexdigest()})
        if not sess:
            return None
        expires = sess["expires_at"]
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= _now():  # TTL deletion can lag up to a minute
            return None
        user = self.users.find_one({"_id": sess["user_id"], "active": True})
        hospital = self.hospitals.find_one({"_id": sess["hospital_id"]})
        if not user or not hospital:
            return None
        return {
            "user_id": user["_id"],
            "user_name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "hospital_id": hospital["_id"],
            "hospital_code": hospital["hospital_code"],
            "hospital_name": hospital["name"],
            "hospital_city": hospital.get("city"),
            "drive_folder_id": hospital.get("drive_folder_id"),
        }

    def revoke_session(self, token: str) -> None:
        if token:
            self.sessions.delete_one({"token_hash": hashlib.sha256(token.encode()).hexdigest()})

    # Accounts
    def register_hospital(self, req: Dict[str, Any]) -> Dict[str, Any]:
        required_code = os.environ.get("HOSPITAL_REGISTRATION_CODE", "").strip()
        if required_code and not hmac.compare_digest((req.get("registrationCode") or "").strip(), required_code):
            raise AuthError(403, "Invalid registration code. Contact the CancerLens administrator.")

        email = req["email"].strip().lower()
        if not _EMAIL_RE.match(email):
            raise AuthError(422, "Enter a valid e-mail address")
        validate_password(req["password"])
        if self.users.find_one({"email": email}):
            raise AuthError(409, "An account with this e-mail already exists")

        now = _now()
        hospital = {
            "hospital_code": _code("HSP"),
            "name": req["hospitalName"].strip(),
            "city": req.get("city", "").strip(),
            "phone": req.get("phone", "").strip(),
            "license_number": (req.get("licenseNumber") or "").strip() or None,
            "created_at": now,
        }
        hospital["_id"] = self.hospitals.insert_one(hospital).inserted_id
        user = {
            "email": email,
            "name": req["adminName"].strip(),
            "password_hash": hash_password(req["password"]),
            "hospital_id": hospital["_id"],
            "role": "admin",
            "active": True,
            "created_at": now,
            "last_login_at": now,
        }
        try:
            user["_id"] = self.users.insert_one(user).inserted_id
        except DuplicateKeyError:
            self.hospitals.delete_one({"_id": hospital["_id"]})
            raise AuthError(409, "An account with this e-mail already exists")
        return self._create_session(user)

    def login(self, email: str, password: str) -> Dict[str, Any]:
        email = email.strip().lower()
        _check_lockout(email)
        user = self.users.find_one({"email": email})
        if not user or not user.get("active", False):
            verify_password(password, _DUMMY_HASH)
            _record_failure(email)
            raise AuthError(401, "Incorrect e-mail or password")
        if not verify_password(password, user["password_hash"]):
            _record_failure(email)
            raise AuthError(401, "Incorrect e-mail or password")
        _clear_failures(email)
        self.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": _now()}})
        return self._create_session(user)

    def set_hospital_drive_folder(self, hospital_id, folder_id: str) -> None:
        self.hospitals.update_one({"_id": hospital_id}, {"$set": {"drive_folder_id": folder_id}})


_auth: Optional[AuthStore] = None


def init_auth(db) -> AuthStore:
    global _auth
    _auth = AuthStore(db)
    _auth.ensure_schema()
    return _auth


def get_auth() -> Optional[AuthStore]:
    return _auth
