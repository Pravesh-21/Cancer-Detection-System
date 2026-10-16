"""
download_models.py — Render startup model fetcher.

Downloads individual model weight files from Google Drive using gdown.
File IDs are hardcoded from the project's shared Drive folder.

Set SKIP_MODEL_DOWNLOAD=true to skip (e.g. running locally with models on disk).
"""

import os
import json
from pathlib import Path

try:
    import gdown
    GDOWN_AVAILABLE = True
except ImportError:
    GDOWN_AVAILABLE = False
    print("[download_models] WARNING: gdown not installed. Run: pip install gdown")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"


def _gdrive_id(env_key: str, default: str) -> str:
    """Read a Drive file ID from env; accepts a bare ID or a full share link."""
    import re
    value = os.environ.get(env_key, "").strip() or default
    m = re.search(r"/d/([\w-]+)", value) or re.search(r"[?&]id=([\w-]+)", value)
    return m.group(1) if m else value


MODEL_FILES = [
    {
        "description": "Parent Router — router_model_final.onnx (High-speed, low-memory ONNX)",
        "file_id": _gdrive_id("GDRIVE_PARENT_MODEL_ROUTER_ONNX", "1Q50tPSYmtkN5ytYb4VExPSIPyqAmZ4O-"),
        "dest": MODELS_DIR / "Parent_Model" / "router_model_final.onnx",
    },
    {
        "description": "Parent Router — router_model_final.keras (legacy fallback)",
        "file_id": _gdrive_id("GDRIVE_PARENT_MODEL_ROUTER_MODEL_FINAL", "1GYWKIndDawSWGZyc_chPtnmybgyFIQAh"),
        "dest": MODELS_DIR / "Parent_Model" / "router_model_final.keras",
    },
    {
        "description": "Child — Brain Pathology ONNX",
        "file_id": _gdrive_id("GDRIVE_BRAIN_MODEL_ONNX", "12YIQGVnvEWHrzligj4RwwI7o2pkP8QmP"),
        "dest": MODELS_DIR / "Child_Brain_Cancer_Processed" / "best_child_model.onnx",
    },
    {
        "description": "Child — Lung Pathology ONNX",
        "file_id": _gdrive_id("GDRIVE_LUNG_MODEL_ONNX", "108hSZ0YvuuN3j3gulhUHCMjHmPos6hAk"),
        "dest": MODELS_DIR / "Child_Lung_Cancer_Processed" / "best_child_model.onnx",
    },
    {
        "description": "Child — Breast Pathology ONNX",
        "file_id": _gdrive_id("GDRIVE_BREAST_MODEL_ONNX", "165M-Q2a3EdxAjzh8heqXDgLVtaAYNI8m"),
        "dest": MODELS_DIR / "Child_Breast_Cancer_Processed" / "best_child_model.onnx",
    },
    {
        "description": "Child — Bone Pathology ONNX",
        "file_id": _gdrive_id("GDRIVE_BONE_MODEL_ONNX", "1DjOSChB0AK2gPcxVjjV25w1ur2sgUczN"),
        "dest": MODELS_DIR / "Child_Bone_Cancer_Processed" / "best_child_model.onnx",
    },
]

# ── Child model specifications by domain ──────────────────────────────────────
CHILD_MODEL_SPECS = {
    "brain": {
        "description": "Child — Brain Pathology ONNX",
        "file_id": _gdrive_id("GDRIVE_BRAIN_MODEL_ONNX", "12YIQGVnvEWHrzligj4RwwI7o2pkP8QmP"),
        "dest": MODELS_DIR / "Child_Brain_Cancer_Processed" / "best_child_model.onnx",
    },
    "lung": {
        "description": "Child — Lung Pathology ONNX",
        "file_id": _gdrive_id("GDRIVE_LUNG_MODEL_ONNX", "108hSZ0YvuuN3j3gulhUHCMjHmPos6hAk"),
        "dest": MODELS_DIR / "Child_Lung_Cancer_Processed" / "best_child_model.onnx",
    },
    "breast": {
        "description": "Child — Breast Pathology ONNX",
        "file_id": _gdrive_id("GDRIVE_BREAST_MODEL_ONNX", "165M-Q2a3EdxAjzh8heqXDgLVtaAYNI8m"),
        "dest": MODELS_DIR / "Child_Breast_Cancer_Processed" / "best_child_model.onnx",
    },
    "bone": {
        "description": "Child — Bone Pathology ONNX",
        "file_id": _gdrive_id("GDRIVE_BONE_MODEL_ONNX", "1DjOSChB0AK2gPcxVjjV25w1ur2sgUczN"),
        "dest": MODELS_DIR / "Child_Bone_Cancer_Processed" / "best_child_model.onnx",
    },
}

# ── Embedded class names ─────────────────────────────────────────────────────
CLASS_NAMES = {
    # Must match training order (Keras image_dataset_from_directory sorts alphabetically)
    MODELS_DIR / "Parent_Model" / "class_names.json":
        ["bone", "brain", "breast", "lung", "skin"],
    MODELS_DIR / "Child_Brain_Cancer_Processed" / "class_names.json":
        ["glioma", "meningioma", "notumor", "pituitary"],
    MODELS_DIR / "Child_Lung_Cancer_Processed" / "class_names.json":
        ["lung_aca", "lung_n", "lung_scc"],
    MODELS_DIR / "Child_Breast_Cancer_Processed" / "class_names.json":
        ["benign", "malignant"],
    MODELS_DIR / "Child_Bone_Cancer_Processed" / "class_names.json":
        ["cancer", "normal"],
    # Skin — HAM10000 subset (4 most common dermoscopic classes)
    MODELS_DIR / "Child_Skin_Cancer_Processed" / "class_names.json":
        ["mel", "nv", "bcc", "akiec"],
}


def ensure_class_names():
    """Write class_names.json into every model folder if not already present."""
    for path, classes in CLASS_NAMES.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            with open(path, "w") as f:
                json.dump(classes, f)
            print(f"[download_models] Wrote class_names.json -> {path.parent.name}")


def _download_from_gdrive(file_id: str, dest: Path, timeout: int = 120) -> bool:
    """Robust, direct Google Drive downloader with cookie/UUID confirmation bypass.
    Bypasses virus-scan confirmation pages without hanging on headless cloud servers."""
    import http.cookiejar
    import urllib.request
    import re
    import shutil

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    url = f"https://drive.google.com/uc?id={file_id}"
    req1 = urllib.request.Request(url, headers=headers)
    res1 = opener.open(req1, timeout=timeout)

    content_type = res1.headers.get("Content-Type", "")
    content_disp = res1.headers.get("Content-Disposition", "")

    # If direct file stream
    if "octet-stream" in content_type or "attachment" in content_disp:
        tmp_dest = dest.with_suffix(dest.suffix + ".tmp")
        with open(tmp_dest, "wb") as f:
            shutil.copyfileobj(res1, f)
        tmp_dest.replace(dest)
        return True

    # Parse virus scan warning page and get UUID confirmation link
    html = res1.read().decode("utf-8", errors="ignore")
    m = re.search(r'name="uuid"\s+value="([^"]+)"', html)
    if not m:
        m_confirm = re.search(r'confirm=([0-9A-Za-z_]+)', html)
        confirm_token = m_confirm.group(1) if m_confirm else "t"
        dl_url = f"https://drive.google.com/uc?export=download&confirm={confirm_token}&id={file_id}"
    else:
        uuid = m.group(1)
        dl_url = f"https://drive.usercontent.google.com/download?id={file_id}&confirm=t&uuid={uuid}"

    req2 = urllib.request.Request(dl_url, headers=headers)
    res2 = opener.open(req2, timeout=timeout)

    tmp_dest = dest.with_suffix(dest.suffix + ".tmp")
    with open(tmp_dest, "wb") as f:
        shutil.copyfileobj(res2, f)
    # Drive returns an HTML page (quota / permission error) instead of the file on failure
    with open(tmp_dest, "rb") as f:
        head = f.read(64).lstrip().lower()
    if head.startswith(b"<!doctype html") or head.startswith(b"<html"):
        tmp_dest.unlink()
        raise RuntimeError(f"Drive returned an HTML page instead of file {file_id} (check sharing / quota)")
    tmp_dest.replace(dest)
    return True


def download_child_model(domain: str) -> bool:
    """Download an individual domain child model on demand from Google Drive."""
    spec = CHILD_MODEL_SPECS.get(domain)
    if not spec:
        return False

    dest: Path = spec["dest"]
    file_id: str = spec["file_id"]
    description: str = spec["description"]

    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        return True

    print(f"[download_models] On-demand download: {description} ...")
    success = False
    try:
        success = _download_from_gdrive(file_id, dest, timeout=120)
    except Exception as e:
        print(f"[download_models] Direct download failed ({e}), trying gdown...")

    if not success and GDOWN_AVAILABLE:
        try:
            gdown.download(id=file_id, output=str(dest), quiet=True)
            success = dest.exists()
        except Exception as e:
            print(f"[download_models] gdown failed ({e})")

    if dest.exists() and dest.stat().st_size > 1000:
        size_mb = dest.stat().st_size / (1024 * 1024)
        print(f"[download_models] OK: {description} cached ({size_mb:.1f} MB)")
        return True
    return False


def download_models():
    """Startup download: ensures class names exist and downloads the Parent Router.
    Child models are fetched on-demand during inference to ensure sub-10s boot."""

    ensure_class_names()

    if os.environ.get("SKIP_MODEL_DOWNLOAD", "").lower() == "true":
        print("[download_models] SKIP_MODEL_DOWNLOAD=true - using local models.")
        return

    print("\n" + "=" * 60)
    print(" MODEL INITIALIZATION: Parent Router Weight Check")
    print("=" * 60)

    # 1. Download Parent Router (Prefer lightweight ONNX model for Render)
    router_onnx = MODELS_DIR / "Parent_Model" / "router_model_final.onnx"
    router_onnx.parent.mkdir(parents=True, exist_ok=True)
    router_onnx_id = _gdrive_id("GDRIVE_PARENT_MODEL_ROUTER_ONNX", "1Q50tPSYmtkN5ytYb4VExPSIPyqAmZ4O-")

    if not router_onnx.exists() or router_onnx.stat().st_size < 1000:
        print("  [DL] Downloading Parent Router ONNX (router_model_final.onnx) ...")
        success = False
        try:
            success = _download_from_gdrive(router_onnx_id, router_onnx, timeout=120)
        except Exception as e:
            print(f"  [WARN] Direct router ONNX download failed: {e}")

        if not success and GDOWN_AVAILABLE:
            try:
                gdown.download(id=router_onnx_id, output=str(router_onnx), quiet=True)
            except Exception as e:
                print(f"  [WARN] gdown router ONNX download failed: {e}")

    if router_onnx.exists() and router_onnx.stat().st_size > 1000:
        size_mb = router_onnx.stat().st_size / (1024 * 1024)
        print(f"  [OK] Parent Router ONNX cached ({size_mb:.1f} MB)")
    else:
        # Fallback to keras if ONNX download failed
        router_keras = MODELS_DIR / "Parent_Model" / "router_model_final.keras"
        if not router_keras.exists() or router_keras.stat().st_size < 1000:
            print("  [DL] Falling back to download Parent Router (router_model_final.keras) ...")
            try:
                _download_from_gdrive("1GYWKIndDawSWGZyc_chPtnmybgyFIQAh", router_keras, timeout=120)
            except Exception as e:
                print(f"  [WARN] Keras fallback download failed: {e}")

    # 2. Check if background pre-caching of all child models is requested
    if os.environ.get("DOWNLOAD_ALL_MODELS", "").lower() == "true":
        print("[download_models] DOWNLOAD_ALL_MODELS=true - pre-caching child networks...")
        for domain in CHILD_MODEL_SPECS:
            download_child_model(domain)

    print("\n PARENT ROUTER READY. Child models loaded on-demand per request.\n")


if __name__ == "__main__":
    download_models()

