"""
patient_store.py — Confidential patient registry backed by MongoDB.

One folder per patient
  Collection `patients` holds exactly one document per person — that document
  is the patient's folder. It is created on first registration and reused on
  every return visit (matched by MRN). All of the patient's visits, AI
  results, doctor sign-offs and report e-mails live inside it, newest first,
  so opening one document in Atlas / Compass shows the patient's full history.

  {
    patient_code: "PT-7F3K9Q",            # non-identifying folder ID
    identity: { full_name, mrn, ... },    # encrypted
    sex, blood_group, visit_count, first_visit_at, last_visit_at,
    visits: [
      { visit_code, visit_number, status, vitals, scan, ai_result, review, report_emails, ... },
      ...
    ]
  }

Confidentiality
  - Direct identifiers (name, MRN, date of birth, phone, email, scan file
    name, doctor notes, reviewer) are encrypted field-by-field with Fernet
    (AES-128-CBC + HMAC-SHA256) before they leave this process.
  - Returning patients are found through a keyed HMAC "blind index" of the
    MRN, so the MRN is never stored in plaintext and cannot be brute-forced
    without the key.
  - Non-identifying fields (sex, blood group, AI findings, timestamps) stay
    readable so folders are easy to browse and filter in Atlas / Compass.

Environment
  MONGODB_URI        connection string (MONGO_URI / MONGO_DB_URI / MONGO_DB also accepted)
  MONGODB_DB         database name (default: cancerlens)
  PATIENT_DATA_KEY   Fernet key — generate with: python manage_patients.py genkey
                     ⚠ Losing this key makes stored identities unrecoverable.
"""

import base64
import hashlib
import hmac
import os
import secrets
import string
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet, InvalidToken
from pymongo import DESCENDING, MongoClient, ReturnDocument
from pymongo.errors import OperationFailure, PyMongoError

URI_ENV_KEYS = ("MONGODB_URI", "MONGO_URI", "MONGO_DB_URI", "MONGODB_URL", "MONGO_DB")
SCHEMA_VERSION = 2
ENCRYPTED_IDENTITY_FIELDS = ("full_name", "mrn", "date_of_birth", "phone", "email")
VISIT_STATUSES = ["registered", "analyzed", "signed_off"]

_CODE_ALPHABET = string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789"

PATIENTS_VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["patient_code", "mrn_hash", "identity", "visit_count", "visits", "created_at"],
        "properties": {
            "patient_code": {"bsonType": "string", "description": "Non-identifying folder ID (PT-XXXXXX)"},
            "mrn_hash": {"bsonType": "string", "description": "HMAC-SHA256 blind index of the MRN"},
            "identity": {
                "bsonType": "object",
                "description": "Encrypted direct identifiers (Fernet tokens)",
                "properties": {f: {"bsonType": ["string", "null"]} for f in ENCRYPTED_IDENTITY_FIELDS},
            },
            "sex": {"enum": ["male", "female", "other", None]},
            "blood_group": {"bsonType": ["string", "null"]},
            "visit_count": {"bsonType": "int", "minimum": 0},
            "visits": {
                "bsonType": "array",
                "description": "All encounters for this patient, newest first",
                "items": {
                    "bsonType": "object",
                    "required": ["visit_code", "visit_number", "status", "created_at"],
                    "properties": {
                        "visit_code": {"bsonType": "string"},
                        "visit_number": {"bsonType": "int", "minimum": 1},
                        "status": {"enum": VISIT_STATUSES},
                    },
                },
            },
        },
    }
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _code(prefix: str, n: int = 6) -> str:
    return f"{prefix}-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(n))


def _normalize_mrn(mrn: str) -> str:
    return "".join(mrn.split()).upper()


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat().replace("+00:00", "Z") if dt else None


# Maps stored identity fields -> frontend form keys
_FORM_KEYS = {
    "full_name": "fullName",
    "mrn": "mrn",
    "date_of_birth": "dateOfBirth",
    "phone": "phone",
    "email": "email",
}


class PatientStoreUnavailable(RuntimeError):
    pass


class PatientStore:
    def __init__(self, uri: str, db_name: str, data_key: str):
        raw_key = data_key.encode() if isinstance(data_key, str) else data_key
        self._fernet = Fernet(raw_key)
        # Separate subkey for the blind index so it can't be used to decrypt anything
        self._index_key = hmac.new(base64.urlsafe_b64decode(raw_key), b"cancerlens-mrn-blind-index", hashlib.sha256).digest()

        self.client = MongoClient(uri, serverSelectionTimeoutMS=8000, appname="cancerlens-backend", tz_aware=True)
        self.db = self.client[db_name]
        self.patients = self.db["patients"]

    # ── Setup ────────────────────────────────────────────────────────────────
    def ensure_schema(self) -> None:
        exists = "patients" in self.db.list_collection_names()
        try:
            if exists:
                self.db.command("collMod", "patients", validator=PATIENTS_VALIDATOR, validationLevel="moderate")
            else:
                self.db.create_collection("patients", validator=PATIENTS_VALIDATOR, validationLevel="moderate")
        except OperationFailure as e:
            # Atlas readWrite users may lack collMod; validation is a safety net, not a requirement
            if not exists:
                self.db.create_collection("patients")
            print(f"[patient_store] Schema validator not applied: {e.details.get('errmsg', e)}")

        self.patients.create_index("mrn_hash", unique=True, name="uniq_mrn_hash")
        self.patients.create_index("patient_code", unique=True, name="uniq_patient_code")
        self.patients.create_index([("last_visit_at", DESCENDING)], name="recent_patients")
        self.patients.create_index("visits.visit_code", unique=True, sparse=True, name="uniq_visit_code")
        self.patients.create_index("visits.ai_result.risk_level", name="by_risk")
        self.patients.create_index("visits.ai_result.session_id", sparse=True, name="by_session")

    # ── Crypto helpers ───────────────────────────────────────────────────────
    def encrypt(self, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return self._fernet.encrypt(str(value).encode()).decode()

    def decrypt(self, token: Optional[str]) -> Optional[str]:
        if not token:
            return None
        try:
            return self._fernet.decrypt(token.encode()).decode()
        except InvalidToken:
            return "<undecryptable: wrong PATIENT_DATA_KEY>"

    def mrn_hash(self, mrn: str) -> str:
        return hmac.new(self._index_key, _normalize_mrn(mrn).encode(), hashlib.sha256).hexdigest()

    # ── Patient folders ──────────────────────────────────────────────────────
    def register_visit(self, form: Dict[str, Any]) -> Dict[str, Any]:
        """Open (or create, for a new patient) the patient's folder and add a new visit to it."""
        now = _now()
        form = {k: v.strip() if isinstance(v, str) else v for k, v in form.items()}
        identity = {f: self.encrypt(form.get(_FORM_KEYS[f])) for f in ENCRYPTED_IDENTITY_FIELDS}

        # 1. Create the folder if this MRN has never been seen; otherwise refresh contact details
        folder = self.patients.find_one_and_update(
            {"mrn_hash": self.mrn_hash(form["mrn"])},
            {
                "$set": {
                    "identity": identity,
                    "sex": form.get("sex"),
                    "blood_group": form.get("bloodGroup"),
                    "last_visit_at": now,
                    "updated_at": now,
                },
                "$inc": {"visit_count": 1},
                "$setOnInsert": {
                    "patient_code": _code("PT"),
                    "created_at": now,
                    "first_visit_at": now,
                    "visits": [],
                    "schema_version": SCHEMA_VERSION,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
            projection={"visits": {"$slice": 10}, "patient_code": 1, "visit_count": 1},
        )
        previous = [self._visit_summary(v) for v in folder.get("visits", [])]

        # 2. File the new visit at the top of the folder
        visit_code = f"VS-{now.strftime('%y%m%d')}-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
        self.patients.update_one(
            {"_id": folder["_id"]},
            {"$push": {"visits": {"$each": [{
                "visit_code": visit_code,
                "visit_number": folder["visit_count"],
                "status": "registered",
                "vitals": {"age_at_visit": form.get("age"), "weight_kg": form.get("weight")},
                "created_at": now,
                "updated_at": now,
            }], "$position": 0}}},
        )

        return {
            "patientCode": folder["patient_code"],
            "visitCode": visit_code,
            "visitNumber": folder["visit_count"],
            "isReturning": folder["visit_count"] > 1,
            "previousVisits": previous,
        }

    def lookup_by_mrn(self, mrn: str) -> Optional[Dict[str, Any]]:
        folder = self.patients.find_one({"mrn_hash": self.mrn_hash(mrn)}, {"visits": {"$slice": 10}, "mrn_hash": 0})
        if not folder:
            return None
        visits = folder.get("visits", [])
        ident = {f: self.decrypt(folder["identity"].get(f)) for f in ENCRYPTED_IDENTITY_FIELDS}
        return {
            "patientCode": folder["patient_code"],
            "visitCount": folder.get("visit_count", 0),
            "lastVisitAt": _iso(folder.get("last_visit_at")),
            "profile": {
                "fullName": ident["full_name"],
                "mrn": ident["mrn"],
                "dateOfBirth": ident["date_of_birth"],
                "phone": ident["phone"],
                "email": ident["email"],
                "sex": folder.get("sex"),
                "bloodGroup": folder.get("blood_group"),
                "weight": (visits[0] if visits else {}).get("vitals", {}).get("weight_kg"),
            },
            "previousVisits": [self._visit_summary(v) for v in visits],
        }

    @staticmethod
    def _visit_summary(v: Dict[str, Any]) -> Dict[str, Any]:
        ai = v.get("ai_result") or {}
        return {
            "visitCode": v["visit_code"],
            "date": _iso(v.get("created_at")),
            "status": v.get("status"),
            "domain": ai.get("domain"),
            "finding": ai.get("display_name"),
            "riskLevel": ai.get("risk_level"),
            "confidence": ai.get("confidence"),
        }

    # ── Visits inside a folder ───────────────────────────────────────────────
    def _update_visit(self, visit_code: str, fields: Dict[str, Any]) -> bool:
        now = _now()
        update = {"$set": {**{f"visits.$.{k}": v for k, v in fields.items()},
                           "visits.$.updated_at": now, "updated_at": now}}
        return self.patients.update_one({"visits.visit_code": visit_code}, update).matched_count == 1

    def record_diagnosis(self, visit_code: str, finding: Dict[str, Any], scan: Dict[str, Any]) -> bool:
        return self._update_visit(visit_code, {
            "status": "analyzed",
            "scan": {
                "file_name": self.encrypt(scan.get("file_name")),
                "sha256": scan.get("sha256"),
                "size_bytes": scan.get("size_bytes"),
                "content_type": scan.get("content_type"),
            },
            "ai_result": {**finding, "analyzed_at": _now()},
        })

    def sign_off(self, visit_code: str, notes: str, signed_by: Optional[str] = None) -> bool:
        return self._update_visit(visit_code, {
            "status": "signed_off",
            "review": {
                "doctor_notes": self.encrypt(notes),
                "signed_by": self.encrypt(signed_by),
                "signed_off_at": _now(),
            },
        })

    def report_context(self, visit_code: str) -> Optional[Dict[str, Any]]:
        """Decrypted recipient + review data needed to e-mail a visit report (server-side only)."""
        folder = self.patients.find_one(
            {"visits.visit_code": visit_code},
            {"identity": 1, "patient_code": 1, "visits": {"$elemMatch": {"visit_code": visit_code}}},
        )
        if not folder:
            return None
        visit = {**folder["visits"][0], "patient_code": folder["patient_code"]}
        ident = folder.get("identity", {})
        review = visit.get("review") or {}
        return {
            "visit": visit,
            "patient_name": self.decrypt(ident.get("full_name")),
            "email": self.decrypt(ident.get("email")),
            "phone": self.decrypt(ident.get("phone")),
            "doctor_notes": self.decrypt(review.get("doctor_notes")),
            "signed_by": self.decrypt(review.get("signed_by")),
        }

    def _append_to_visit(self, visit_code: str, field: str, entry: Dict[str, Any]) -> None:
        # Read-modify-write instead of a positional $push so behaviour matches across MongoDB / test doubles
        folder = self.patients.find_one(
            {"visits.visit_code": visit_code}, {"visits": {"$elemMatch": {"visit_code": visit_code}}}
        )
        if not folder:
            return
        items = folder["visits"][0].get(field, [])
        items.append(entry)
        self._update_visit(visit_code, {field: items})

    def log_report_email(self, visit_code: str, message_id: str) -> None:
        # The recipient address is not copied here — it already lives encrypted in the folder
        self._append_to_visit(visit_code, "report_emails",
                              {"sent_at": _now(), "provider": "brevo", "message_id": message_id})

    def log_whatsapp_link(self, visit_code: str) -> None:
        # Click-to-chat: we can only record that staff opened the pre-filled chat, not delivery
        self._append_to_visit(visit_code, "whatsapp_notifications",
                              {"opened_at": _now(), "channel": "wa.me click-to-chat"})

    # ── Google Drive image archive ───────────────────────────────────────────
    def drive_context(self, visit_code: str) -> Optional[Dict[str, Any]]:
        folder = self.patients.find_one(
            {"visits.visit_code": visit_code},
            {"identity.full_name": 1, "patient_code": 1, "drive_folder_id": 1,
             "visits": {"$elemMatch": {"visit_code": visit_code}}},
        )
        if not folder:
            return None
        return {
            "patient_code": folder["patient_code"],
            "patient_name": self.decrypt(folder.get("identity", {}).get("full_name")) or "",
            "drive_folder_id": folder.get("drive_folder_id"),
            "scan_drive": folder["visits"][0].get("scan_drive"),
        }

    def set_patient_drive_folder(self, patient_code: str, folder_id: str) -> None:
        self.patients.update_one({"patient_code": patient_code}, {"$set": {"drive_folder_id": folder_id}})

    def set_visit_scan_drive(self, visit_code: str, info: Dict[str, Any]) -> None:
        self._update_visit(visit_code, {"scan_drive": info})

    # ── Admin ────────────────────────────────────────────────────────────────
    def erase_patient(self, patient_code: str) -> int:
        """Hard-delete a patient's whole folder (right-to-erasure). Returns folders deleted."""
        return self.patients.delete_one({"patient_code": patient_code}).deleted_count


# ── Singleton access ─────────────────────────────────────────────────────────
_store: Optional[PatientStore] = None
_store_error: Optional[str] = None


def resolve_uri() -> Optional[str]:
    for key in URI_ENV_KEYS:
        val = os.environ.get(key, "").strip().strip('"').strip("'")
        if val.startswith("mongodb"):
            return val
    return None


def init_store() -> Optional[PatientStore]:
    """Connect once at startup. Never raises — the AI pipeline must work without the DB."""
    global _store, _store_error
    uri = resolve_uri()
    key = os.environ.get("PATIENT_DATA_KEY", "").strip()
    if not uri:
        _store_error = "MONGODB_URI not configured"
    elif not key:
        _store_error = "PATIENT_DATA_KEY not configured (run: python manage_patients.py genkey)"
    else:
        try:
            store = PatientStore(uri, os.environ.get("MONGODB_DB", "cancerlens"), key)
            store.client.admin.command("ping")
            store.ensure_schema()
            _store, _store_error = store, None
            print(f"[patient_store] Connected to MongoDB database '{store.db.name}'")
        except (PyMongoError, ValueError) as e:
            _store_error = f"{type(e).__name__}: {e}"
    if _store_error:
        print(f"[patient_store] Patient registry disabled — {_store_error}")
    return _store


def get_store() -> PatientStore:
    if _store is None:
        raise PatientStoreUnavailable(_store_error or "Patient registry not initialized")
    return _store


def store_status() -> str:
    """Coarse status for public /health — details stay in server logs (they can include hostnames)."""
    if _store:
        return "connected"
    return "not_configured" if _store_error and "not configured" in _store_error else "unavailable"
