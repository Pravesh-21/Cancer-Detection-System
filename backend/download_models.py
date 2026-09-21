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
            print(f"[download_models] Wrote class_names.json → {path.parent.name}")


def download_models():
    """Download all missing model weight files from Google Drive."""

    if os.environ.get("SKIP_MODEL_DOWNLOAD", "").lower() == "true":
        print("[download_models] SKIP_MODEL_DOWNLOAD=true — using local models.")
        ensure_class_names()
        return

    if not GDOWN_AVAILABLE:
        print("[download_models] gdown not available — skipping download.")
        ensure_class_names()
        return

    print("\n" + "=" * 60)
    print(" MODEL WEIGHT DOWNLOAD PHASE (Google Drive)")
    print("=" * 60)

    all_ok = True
    router_final_path = MODELS_DIR / "Parent_Model" / "router_model_final.keras"

    for spec in MODEL_FILES:
        dest: Path = spec["dest"]
        file_id: str = spec["file_id"]
        description: str = spec["description"]

        # Skip redundant router fallback downloads if the primary router is already present
        if dest.name in ["best_finetuned.keras", "best_head.keras"] and router_final_path.exists():
            print(f"  ⚡ Skipping redundant fallback ({dest.name}) — primary router is present.")
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)

        if dest.exists():
            size_mb = dest.stat().st_size / (1024 * 1024)
            print(f"  ✓ {description} — already cached ({size_mb:.1f} MB)")
            continue

        url = f"https://drive.google.com/uc?id={file_id}"
        print(f"  ↓ Downloading: {description} ...")
        try:
            gdown.download(url, str(dest), quiet=False, fuzzy=True)
            if dest.exists():
                size_mb = dest.stat().st_size / (1024 * 1024)
                print(f"  ✓ {description} — done ({size_mb:.1f} MB)")
            else:
                print(f"  ✗ {description} — file not found after download!")
                all_ok = False
        except Exception as e:
            print(f"  ✗ {description} — FAILED: {e}")
            all_ok = False

    ensure_class_names()

    if all_ok:
        print("\n ALL MODELS READY FOR INFERENCE\n")
    else:
        print("\n WARNING: Some models failed to download. Check Drive permissions.\n")


if __name__ == "__main__":
    download_models()
