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


MODEL_FILES = [
    {
        "description": "Parent Router — router_model_final.keras (primary)",
        "file_id": "1GYWKIndDawSWGZyc_chPtnmybgyFIQAh",
        "dest": MODELS_DIR / "Parent_Model" / "router_model_final.keras",
    },
    {
        "description": "Parent Router — best_finetuned.keras (fallback 1)",
        "file_id": "1BFeCZDIdDLML0ulW-aL_OdTZ64Cv367G",
        "dest": MODELS_DIR / "Parent_Model" / "best_finetuned.keras",
    },
    {
        "description": "Parent Router — best_head.keras (fallback 2)",
        "file_id": "138rLs1BaayyUD4-qyYkuUwbAo_RXnZ2m",
        "dest": MODELS_DIR / "Parent_Model" / "best_head.keras",
    },
    {
        "description": "Child — Brain Pathology Classifier",
        "file_id": "1NsS8IZrdB8BguUDyjXxC3AqbpYriD00w",
        "dest": MODELS_DIR / "Child_Brain_Cancer_Processed" / "best_child_model.pt",
    },
    {
        "description": "Child — Lung Pathology Classifier",
        "file_id": "1Ch5gr1JaUfByNQTf3DxpDZ1JFh3aR9sB",
        "dest": MODELS_DIR / "Child_Lung_Cancer_Processed" / "best_child_model.pt",
    },
    {
        "description": "Child — Breast Pathology Classifier",
        "file_id": "1evvS_RvzZZWiVnfAyInwsOQLILKcFZlF",
        "dest": MODELS_DIR / "Child_Breast_Cancer_Processed" / "best_child_model.pt",
    },
    {
        "description": "Child — Bone Pathology Classifier",
        "file_id": "1bgXwHAQgSQlzUJtwe_6OlpbYkzxqnbk0",
        "dest": MODELS_DIR / "Child_Bone_Cancer_Processed" / "best_child_model.pt",
    },
]

# ── Child model specifications by domain ──────────────────────────────────────
CHILD_MODEL_SPECS = {
    "brain": {
        "description": "Child — Brain Pathology Classifier",
        "file_id": "1NsS8IZrdB8BguUDyjXxC3AqbpYriD00w",
        "dest": MODELS_DIR / "Child_Brain_Cancer_Processed" / "best_child_model.pt",
    },
    "lung": {
        "description": "Child — Lung Pathology Classifier",
        "file_id": "1Ch5gr1JaUfByNQTf3DxpDZ1JFh3aR9sB",
        "dest": MODELS_DIR / "Child_Lung_Cancer_Processed" / "best_child_model.pt",
    },
    "breast": {
        "description": "Child — Breast Pathology Classifier",
        "file_id": "1evvS_RvzZZWiVnfAyInwsOQLILKcFZlF",
        "dest": MODELS_DIR / "Child_Breast_Cancer_Processed" / "best_child_model.pt",
    },
    "bone": {
        "description": "Child — Bone Pathology Classifier",
        "file_id": "1bgXwHAQgSQlzUJtwe_6OlpbYkzxqnbk0",
        "dest": MODELS_DIR / "Child_Bone_Cancer_Processed" / "best_child_model.pt",
    },
}

# ── Embedded class names ─────────────────────────────────────────────────────
CLASS_NAMES = {
    MODELS_DIR / "Parent_Model" / "class_names.json":
        ["brain", "lung", "breast", "bone", "skin"],
    MODELS_DIR / "Child_Brain_Cancer_Processed" / "class_names.json":
        ["glioma", "meningioma", "notumor", "pituitary"],
    MODELS_DIR / "Child_Lung_Cancer_Processed" / "class_names.json":
        ["lung_aca", "lung_n", "lung_scc"],
    MODELS_DIR / "Child_Breast_Cancer_Processed" / "class_names.json":
        ["benign", "malignant"],
    MODELS_DIR / "Child_Bone_Cancer_Processed" / "class_names.json":
        ["cancer", "normal"],
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

    # 1. Download Parent Router
    router_dest = MODELS_DIR / "Parent_Model" / "router_model_final.keras"
    router_dest.parent.mkdir(parents=True, exist_ok=True)

    if not router_dest.exists() or router_dest.stat().st_size < 1000:
        print("  [DL] Downloading Parent Router (router_model_final.keras) ...")
        success = False
        try:
            success = _download_from_gdrive("1GYWKIndDawSWGZyc_chPtnmybgyFIQAh", router_dest, timeout=120)
        except Exception as e:
            print(f"  [WARN] Direct router download failed: {e}")

        if not success and GDOWN_AVAILABLE:
            try:
                gdown.download(id="1GYWKIndDawSWGZyc_chPtnmybgyFIQAh", output=str(router_dest), quiet=True)
            except Exception as e:
                print(f"  [WARN] gdown router download failed: {e}")

    if router_dest.exists() and router_dest.stat().st_size > 1000:
        size_mb = router_dest.stat().st_size / (1024 * 1024)
        print(f"  [OK] Parent Router cached ({size_mb:.1f} MB)")
    else:
        print("  [FAIL] Parent Router failed to download!")

    # 2. Check if background pre-caching of all child models is requested
    if os.environ.get("DOWNLOAD_ALL_MODELS", "").lower() == "true":
        print("[download_models] DOWNLOAD_ALL_MODELS=true - pre-caching child networks...")
        for domain in CHILD_MODEL_SPECS:
            download_child_model(domain)

    print("\n PARENT ROUTER READY. Child models loaded on-demand per request.\n")


if __name__ == "__main__":
    download_models()

