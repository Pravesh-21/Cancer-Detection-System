"""
download_models.py — Render startup model fetcher.

Reads Google Drive File IDs from environment variables and downloads
model weights to the local models/ directory if they are not already present.

Required environment variables (set in Render dashboard):
    GDRIVE_PARENT_MODEL_ID      — File ID of router_model_final.keras
    GDRIVE_BRAIN_MODEL_ID       — File ID of Child_Brain best_child_model.pt
    GDRIVE_LUNG_MODEL_ID        — File ID of Child_Lung best_child_model.pt
    GDRIVE_BREAST_MODEL_ID      — File ID of Child_Breast best_child_model.pt
    GDRIVE_BONE_MODEL_ID        — File ID of Child_Bone best_child_model.pt

Optional:
    SKIP_MODEL_DOWNLOAD=true    — Set this to skip download (e.g. when running locally)
"""

import os
import json
from pathlib import Path

# ── Try to import gdown, gracefully skip if not installed ──
try:
    import gdown
    GDOWN_AVAILABLE = True
except ImportError:
    GDOWN_AVAILABLE = False
    print("[download_models] WARNING: gdown not installed. Skipping model download.")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"


def gdrive_url(file_id: str) -> str:
    return f"https://drive.google.com/uc?id={file_id}"


# Mapping: (destination path relative to MODELS_DIR, env var name, is_folder)
MODEL_FILES = [
    # Parent Router
    {
        "dest": MODELS_DIR / "Parent_Model" / "router_model_final.keras",
        "env_var": "GDRIVE_PARENT_MODEL_ID",
        "description": "Domain Router (Parent Model)",
    },
    # Child Brain
    {
        "dest": MODELS_DIR / "Child_Brain_Cancer_Processed" / "best_child_model.pt",
        "env_var": "GDRIVE_BRAIN_MODEL_ID",
        "description": "Brain Pathology Classifier",
    },
    # Child Lung
    {
        "dest": MODELS_DIR / "Child_Lung_Cancer_Processed" / "best_child_model.pt",
        "env_var": "GDRIVE_LUNG_MODEL_ID",
        "description": "Lung Pathology Classifier",
    },
    # Child Breast
    {
        "dest": MODELS_DIR / "Child_Breast_Cancer_Processed" / "best_child_model.pt",
        "env_var": "GDRIVE_BREAST_MODEL_ID",
        "description": "Breast Pathology Classifier",
    },
    # Child Bone
    {
        "dest": MODELS_DIR / "Child_Bone_Cancer_Processed" / "best_child_model.pt",
        "env_var": "GDRIVE_BONE_MODEL_ID",
        "description": "Bone Pathology Classifier",
    },
]

# class_names.json files — embed them directly so they don't need to be downloaded
CLASS_NAMES = {
    MODELS_DIR / "Parent_Model" / "class_names.json": ["brain", "lung", "breast", "bone", "skin"],
    MODELS_DIR / "Child_Brain_Cancer_Processed" / "class_names.json": ["glioma", "meningioma", "notumor", "pituitary"],
    MODELS_DIR / "Child_Lung_Cancer_Processed" / "class_names.json": ["lung_aca", "lung_n", "lung_scc"],
    MODELS_DIR / "Child_Breast_Cancer_Processed" / "class_names.json": ["benign", "malignant"],
    MODELS_DIR / "Child_Bone_Cancer_Processed" / "class_names.json": ["cancer", "normal"],
}


def ensure_class_names():
    """Write class_names.json files if they don't already exist."""
    for path, classes in CLASS_NAMES.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            with open(path, "w") as f:
                json.dump(classes, f)
            print(f"[download_models] Wrote class_names.json → {path.parent.name}")


def download_models():
    """Download all model weights from Google Drive if not already present."""

    if os.environ.get("SKIP_MODEL_DOWNLOAD", "").lower() == "true":
        print("[download_models] SKIP_MODEL_DOWNLOAD=true — skipping download.")
        ensure_class_names()
        return

    if not GDOWN_AVAILABLE:
        ensure_class_names()
        return

    print("\n" + "=" * 60)
    print(" MODEL WEIGHT DOWNLOAD PHASE (Google Drive)")
    print("=" * 60)

    all_present = True
    for spec in MODEL_FILES:
        dest: Path = spec["dest"]
        env_var: str = spec["env_var"]
        description: str = spec["description"]

        dest.parent.mkdir(parents=True, exist_ok=True)

        if dest.exists():
            size_mb = dest.stat().st_size / (1024 * 1024)
            print(f"  ✓ {description} already cached ({size_mb:.1f} MB)")
            continue

        file_id = os.environ.get(env_var)
        if not file_id:
            print(f"  ✗ {description}: env var {env_var} not set — skipping.")
            all_present = False
            continue

        print(f"  ↓ Downloading {description} ...")
        try:
            gdown.download(gdrive_url(file_id), str(dest), quiet=False, fuzzy=True)
            size_mb = dest.stat().st_size / (1024 * 1024)
            print(f"  ✓ {description} downloaded ({size_mb:.1f} MB)")
        except Exception as e:
            print(f"  ✗ {description} download FAILED: {e}")
            all_present = False

    ensure_class_names()

    if all_present:
        print("\n ALL MODELS READY FOR INFERENCE\n")
    else:
        print("\n WARNING: Some models could not be downloaded. Check env vars.\n")


if __name__ == "__main__":
    download_models()
