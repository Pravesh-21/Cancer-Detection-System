"""
download_models.py — Render startup model fetcher.

Downloads model weights from Google Drive folders using gdown.
Folder IDs are hardcoded from the project's shared Drive folder.
Each model subfolder is downloaded in full to models/<FolderName>/.

Set SKIP_MODEL_DOWNLOAD=true (env var) to skip this step when running locally
with models already present on disk.
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

# ── Google Drive folder IDs ─────────────────────────────────────────────────
# Each entry maps a local destination folder to its Google Drive folder ID.
# Source: https://drive.google.com/drive/folders/1vTPy30K5evfC3MsJe6DrEdWri3uBBKCB
GDRIVE_FOLDERS = {
    "Parent_Model":                 "1o0n-lPvp-2G_FRzZcUJPB16R00I_j4VR",
    "Child_Brain_Cancer_Processed": "1rDXC6hE_bUqlujQQxi-XXiPNxvJg8prK",
    "Child_Lung_Cancer_Processed":  "1Di4DjG6nbZBOHYtIHG-4b4s714GB-Mni",
    "Child_Breast_Cancer_Processed":"1jAvj769D3I2kiN1IToQDau23zASoIWNf",
    "Child_Bone_Cancer_Processed":  "1KFLeukD_2WkA7cDJvV75qi_MnSk7ZWe8",
}

# ── Embedded class names (no download needed) ───────────────────────────────
CLASS_NAMES = {
    "Parent_Model":                  ["brain", "lung", "breast", "bone", "skin"],
    "Child_Brain_Cancer_Processed":  ["glioma", "meningioma", "notumor", "pituitary"],
    "Child_Lung_Cancer_Processed":   ["lung_aca", "lung_n", "lung_scc"],
    "Child_Breast_Cancer_Processed": ["benign", "malignant"],
    "Child_Bone_Cancer_Processed":   ["cancer", "normal"],
}


def ensure_class_names():
    """Write class_names.json into every model folder if not already present."""
    for folder_name, classes in CLASS_NAMES.items():
        dest = MODELS_DIR / folder_name / "class_names.json"
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            with open(dest, "w") as f:
                json.dump(classes, f)
            print(f"[download_models] Wrote class_names.json → {folder_name}")


def folder_needs_download(folder_name: str) -> bool:
    """Return True if the key model weight file is missing."""
    folder = MODELS_DIR / folder_name
    if folder_name == "Parent_Model":
        candidates = [
            folder / "router_model_final.keras",
            folder / "best_finetuned.keras",
            folder / "best_head.keras",
        ]
        return not any(f.exists() for f in candidates)
    else:
        return not (folder / "best_child_model.pt").exists()


def download_models():
    """Download all missing model folders from Google Drive."""

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

    for folder_name, folder_id in GDRIVE_FOLDERS.items():
        dest = MODELS_DIR / folder_name
        dest.mkdir(parents=True, exist_ok=True)

        if not folder_needs_download(folder_name):
            print(f"  ✓ {folder_name} — already cached, skipping.")
            continue

        print(f"  ↓ Downloading {folder_name} from Drive ...")
        url = f"https://drive.google.com/drive/folders/{folder_id}"
        try:
            gdown.download_folder(
                url=url,
                output=str(dest),
                quiet=False,
                use_cookies=False,
                remaining_ok=True,
            )
            print(f"  ✓ {folder_name} — download complete.")
        except Exception as e:
            print(f"  ✗ {folder_name} — download FAILED: {e}")

    ensure_class_names()
    print("\n ALL MODELS READY FOR INFERENCE\n")


if __name__ == "__main__":
    download_models()
