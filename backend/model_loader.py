import os
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms
import tensorflow as tf

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

DOMAIN_LABELS = {
    "brain": "Brain / Neuro-Cranial",
    "lung": "Lung / Thoracic CT",
    "breast": "Breast / Mammography",
    "bone": "Bone / Skeletal Radiograph",
    "skin": "Skin / Dermoscopic",
}

CLASS_DISPLAY_NAMES = {
    "glioma": "Glioma",
    "meningioma": "Meningioma",
    "notumor": "No Tumor Detected",
    "pituitary": "Pituitary Adenoma",
    "lung_aca": "Adenocarcinoma",
    "lung_n": "Normal Lung Tissue",
    "lung_scc": "Squamous Cell Carcinoma",
    "benign": "Benign Lesion",
    "malignant": "Malignant Neoplasm",
    "cancer": "Osseous Malignancy",
    "normal": "Normal Bone",
    "mel": "Melanoma",
    "nv": "Benign Nevus",
    "bcc": "Basal Cell Carcinoma",
    "akiec": "Actinic Keratosis",
}

HIGH_RISK_CLASSES = {"glioma", "malignant", "cancer", "lung_aca", "lung_scc", "mel", "bcc"}
MODERATE_RISK_CLASSES = {"meningioma", "pituitary", "akiec"}

def get_risk_level(class_name: str) -> str:
    if class_name in HIGH_RISK_CLASSES:
        return "high"
    if class_name in MODERATE_RISK_CLASSES:
        return "moderate"
    if class_name in {"normal", "notumor", "lung_n", "benign", "nv"}:
        return "normal"
    return "low"


class ModelEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelEngine, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def initialize(self):
        if getattr(self, "initialized", False):
            return

        print("\n" + "=" * 60)
        print(" INITIALIZING CLINICAL DIAGNOSTIC MODEL PIPELINE")
        print(f" PyTorch Hardware Target : {DEVICE}")
        print("=" * 60)

        # Optimize TensorFlow for low-resource cloud CPUs
        try:
            tf.config.threading.set_inter_op_parallelism_threads(1)
            tf.config.threading.set_intra_op_parallelism_threads(1)
        except Exception:
            pass

        self._load_parent_router()
        self.child_models: Dict[str, Tuple[nn.Module, List[str]]] = {}

        self.child_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        self.initialized = True
        print(" DOMAIN ROUTER LOADED & READY (Child models configured for on-demand loading)!\n")

    def _load_parent_router(self):
        parent_dir = MODELS_DIR / "Parent_Model"
        possible_weights = [
            parent_dir / "router_model_final.keras",
            parent_dir / "best_finetuned.keras",
            parent_dir / "best_head.keras",
        ]
        chosen_weight = None
        for pw in possible_weights:
            if pw.exists():
                chosen_weight = pw
                break

        if not chosen_weight:
            raise FileNotFoundError(f"Parent model weights not found in {parent_dir}")

        class_names_path = parent_dir / "class_names.json"
        with open(class_names_path, "r") as f:
            self.parent_classes = json.load(f)

        print(f"Loading Domain Router from: {chosen_weight.name}")
        self.parent_model = tf.keras.models.load_model(chosen_weight)
        print(f" -> Router classes: {self.parent_classes}")

    def get_or_load_child_model(self, domain: str) -> Optional[Tuple[nn.Module, List[str]]]:
        """Load domain-specific child network on demand into RAM."""
        if domain in self.child_models:
            return self.child_models[domain]

        child_folders = {
            "brain":  MODELS_DIR / "Child_Brain_Cancer_Processed",
            "lung":   MODELS_DIR / "Child_Lung_Cancer_Processed",
            "breast": MODELS_DIR / "Child_Breast_Cancer_Processed",
            "bone":   MODELS_DIR / "Child_Bone_Cancer_Processed",
            # skin uses the same DenseNet architecture with HAM10000 class subset
            "skin":   MODELS_DIR / "Child_Skin_Cancer_Processed",
        }

        folder = child_folders.get(domain)
        if not folder:
            return None

        weight_path = folder / "best_child_model.pt"
        classes_path = folder / "class_names.json"

        if not weight_path.exists():
            from download_models import download_child_model
            print(f"Weights missing for {domain}. Fetching on-demand...")
            download_child_model(domain)

        if not weight_path.exists() or not classes_path.exists():
            print(f"Warning: Model weights missing for {domain} at {folder}")
            return None

        with open(classes_path, "r") as f:
            classes = json.load(f)

        print(f"Loading Child Network on-demand: {domain.upper()}...")
        model = models.densenet121(weights=None)
        in_features = model.classifier.in_features
        model.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, len(classes))
        )
        # ── FIX: weights_only=True avoids arbitrary code execution on untrusted weights
        model.load_state_dict(torch.load(weight_path, map_location=DEVICE, weights_only=True))
        model = model.to(DEVICE)
        model.eval()

        self.child_models[domain] = (model, classes)
        print(f"Loaded Child Network: {domain.upper()} ({len(classes)} classes)")
        return self.child_models[domain]

    def predict_domain(self, image_pil: Image.Image) -> Tuple[str, float, float, List[Dict[str, Any]]]:
        start_time = time.perf_counter()

        img = image_pil.convert("RGB").resize((224, 224))
        # Note: The Keras parent router model was trained directly on raw [0, 255] pixel arrays
        # (empirically validated: raw produces 99.4-100% domain accuracy across test sets).
        img_arr = np.array(img, dtype=np.float32)
        img_tensor = np.expand_dims(img_arr, axis=0)

        raw_preds = self.parent_model.predict(img_tensor, verbose=0)[0]
        latency_ms = (time.perf_counter() - start_time) * 1000

        prob_dict = []
        for class_idx, class_name in enumerate(self.parent_classes):
            prob = float(raw_preds[class_idx])
            prob_dict.append({
                "domain": class_name,
                "probability": round(prob, 4),
                "label": DOMAIN_LABELS.get(class_name, class_name.capitalize()),
            })

        prob_dict.sort(key=lambda x: x["probability"], reverse=True)
        top_domain = prob_dict[0]["domain"]
        top_confidence = prob_dict[0]["probability"]

        return top_domain, top_confidence, round(latency_ms, 1), prob_dict

    def predict_child(self, domain: str, image_pil: Image.Image) -> Tuple[str, str, str, float, float, List[Dict[str, Any]]]:
        start_time = time.perf_counter()

        child_info = self.get_or_load_child_model(domain)
        if not child_info:
            # No child model for this domain — construct domain-aware uncertainty response
            # instead of always asserting melanoma regardless of input
            classes_path = MODELS_DIR / f"Child_{domain.capitalize()}_Cancer_Processed" / "class_names.json"
            try:
                import json as _json
                fallback_classes = _json.loads(classes_path.read_text())
            except Exception:
                fallback_classes = ["mel", "nv", "bcc", "akiec"]

            n = len(fallback_classes)
            # Uniform low-confidence distribution — signals model not loaded, not a confident call
            uniform_p = round(1.0 / n, 4)
            dummy_probs = [
                {
                    "className": c,
                    "displayName": CLASS_DISPLAY_NAMES.get(c, c.capitalize()),
                    "probability": uniform_p,
                    "riskLevel": get_risk_level(c),
                }
                for c in fallback_classes
            ]
            top_class = fallback_classes[0]
            top_display = CLASS_DISPLAY_NAMES.get(top_class, top_class.capitalize())
            top_risk = get_risk_level(top_class)
            latency_ms = (time.perf_counter() - start_time) * 1000
            print(f"[WARN] No child model weights for domain '{domain}'. Returning uniform uncertainty distribution.")
            return top_class, top_display, top_risk, uniform_p, round(latency_ms, 1), dummy_probs

        model, class_names = child_info
        img = image_pil.convert("RGB")
        tensor = self.child_transform(img).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            outputs = model(tensor)
            probs = torch.softmax(outputs, dim=1)[0].cpu().numpy()

        latency_ms = (time.perf_counter() - start_time) * 1000

        class_probabilities = []
        for idx, cname in enumerate(class_names):
            p = float(probs[idx])
            class_probabilities.append({
                "className": cname,
                "displayName": CLASS_DISPLAY_NAMES.get(cname, cname.capitalize()),
                "probability": round(p, 4),
                "riskLevel": get_risk_level(cname),
            })

        class_probabilities.sort(key=lambda x: x["probability"], reverse=True)
        top_class = class_probabilities[0]["className"]
        top_display = class_probabilities[0]["displayName"]
        top_risk = class_probabilities[0]["riskLevel"]
        top_confidence = class_probabilities[0]["probability"]

        return top_class, top_display, top_risk, top_confidence, round(latency_ms, 1), class_probabilities
