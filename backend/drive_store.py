"""
drive_store.py — Patient scan images in Google Drive, one sub-folder per patient.

  <PATIENT_IMAGES_FOLDER_ID>/
    PT-7F3K9Q - Priya Sharma/
      VS-261016-AB12CD_brain_20261016-091530.jpg
      VS-261103-XY98ZT_brain_20261103-142201.jpg
    PT-K2M8QW - Arjun Mehta/
      ...

Uploads use the Drive REST API with an OAuth refresh token for the account
that owns the folder (service accounts have no storage quota on personal
Drives). Run `python drive_auth.py` once to obtain the token.

Environment
  PATIENT_IMAGES_FOLDER_ID    parent folder ID (or full folder link)
  GDRIVE_OAUTH_CLIENT_ID      OAuth client (Google Cloud > Credentials > Desktop app)
  GDRIVE_OAUTH_CLIENT_SECRET
  GDRIVE_OAUTH_REFRESH_TOKEN  from drive_auth.py

⚠ Keep the parent folder's sharing set to "Restricted" — names and scans are
  stored here in plaintext so they can be browsed in Drive.
"""

import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Dict, Optional

TOKEN_URL = "https://oauth2.googleapis.com/token"
API = "https://www.googleapis.com/drive/v3/files"
UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink"
FOLDER_MIME = "application/vnd.google-apps.folder"


class DriveError(RuntimeError):
    pass


def _folder_id_from_env() -> str:
    value = os.environ.get("PATIENT_IMAGES_FOLDER_ID", "").strip()
    m = re.search(r"/folders/([\w-]+)", value)
    return m.group(1) if m else value


def drive_status() -> str:
    needed = ("GDRIVE_OAUTH_CLIENT_ID", "GDRIVE_OAUTH_CLIENT_SECRET", "GDRIVE_OAUTH_REFRESH_TOKEN")
    if not _folder_id_from_env() or not all(os.environ.get(k) for k in needed):
        return "not_configured"
    return "configured"


_token: Dict[str, float] = {}
_token_lock = threading.Lock()


def _access_token() -> str:
    with _token_lock:
        if _token.get("value") and _token.get("expires", 0) > time.time() + 60:
            return _token["value"]
        body = urllib.parse.urlencode({
            "client_id": os.environ.get("GDRIVE_OAUTH_CLIENT_ID", ""),
            "client_secret": os.environ.get("GDRIVE_OAUTH_CLIENT_SECRET", ""),
            "refresh_token": os.environ.get("GDRIVE_OAUTH_REFRESH_TOKEN", ""),
            "grant_type": "refresh_token",
        }).encode()
        try:
            with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=body), timeout=20) as r:
                data = json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise DriveError(f"Google token refresh failed ({e.code}) — re-run drive_auth.py: {e.read()[:200]!r}")
        _token.update(value=data["access_token"], expires=time.time() + data.get("expires_in", 3600))
        return _token["value"]


def _call(url: str, method: str = "GET", body: Optional[bytes] = None, content_type: str = "application/json") -> dict:
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": f"Bearer {_access_token()}",
        "Content-Type": content_type,
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raise DriveError(f"Drive API {e.code}: {e.read()[:300]!r}")


def _safe_name(name: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[\\/:*?\"<>|]+", " ", name)).strip()[:120]


def ensure_patient_folder(patient_code: str, patient_name: str, known_folder_id: Optional[str] = None) -> str:
    """Return the patient's Drive folder ID, creating "<PT-code> - <name>" under the parent if needed."""
    parent = _folder_id_from_env()
    if not parent:
        raise DriveError("PATIENT_IMAGES_FOLDER_ID not configured")
    if known_folder_id:
        try:
            meta = _call(f"{API}/{known_folder_id}?fields=id,trashed")
            if not meta.get("trashed"):
                return known_folder_id
        except DriveError:
            pass  # deleted or inaccessible — fall through and find/recreate

    # Match on the patient code prefix so a name change never creates a duplicate folder
    q = (f"'{parent}' in parents and mimeType='{FOLDER_MIME}' and trashed=false "
         f"and name contains '{patient_code}'")
    found = _call(f"{API}?{urllib.parse.urlencode({'q': q, 'fields': 'files(id,name)', 'pageSize': 10})}")
    for f in found.get("files", []):
        if f["name"].startswith(patient_code):
            return f["id"]

    meta = {"name": _safe_name(f"{patient_code} - {patient_name}"), "mimeType": FOLDER_MIME, "parents": [parent]}
    return _call(f"{API}?fields=id", "POST", json.dumps(meta).encode())["id"]


def upload_image(folder_id: str, file_name: str, data: bytes, mime_type: str) -> Dict[str, str]:
    boundary = uuid.uuid4().hex
    meta = json.dumps({"name": _safe_name(file_name), "parents": [folder_id]})
    body = (
        f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{meta}\r\n"
        f"--{boundary}\r\nContent-Type: {mime_type}\r\n\r\n"
    ).encode() + data + f"\r\n--{boundary}--".encode()
    res = _call(UPLOAD, "POST", body, f"multipart/related; boundary={boundary}")
    return {"file_id": res["id"], "web_link": res.get("webViewLink", "")}
