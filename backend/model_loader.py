import os
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"

# Optional ONNX Runtime for ultra-low-memory inference (preferred on Render)
try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

# Optional PyTorch for fallback
try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms
    TORCH_AVAILABLE = True
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
except ImportError:
    TORCH_AVAILABLE = False
    DEVICE = "cpu"

# Optional TensorFlow for fallback
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False


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


def preprocess_child_numpy(image_pil: Image.Image) -> np.ndarray:
    """Pure NumPy ImageNet normalization (identical to torchvision transforms, zero torch overhead)."""
    img = image_pil.convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    norm = (arr - mean) / std
    chw = np.transpose(norm, (2, 0, 1))
    return np.expand_dims(chw, axis=0).astype(np.float32)


class ModelEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelEngine, cls).__new__(cls)
            cls._instance.initialized = False
            cls._instance.child_models = {}
            cls._instance.parent_classes = ["bone", "brain", "breast", "lung", "skin"]
        return cls._instance

    def initialize(self):
        if getattr(self, "initialized", False):
            return

        print("\n" + "=" * 60)
        print(" INITIALIZING CLINICAL DIAGNOSTIC MODEL PIPELINE")
        print(f" Engine Hardware Target : {DEVICE if TORCH_AVAILABLE else 'CPU (ONNX)'}")
        print("=" * 60)

        # Optimize TensorFlow threads if present
        if TF_AVAILABLE:
            try:
                tf.config.threading.set_inter_op_parallelism_threads(1)
                tf.config.threading.set_intra_op_parallelism_threads(1)
            except Exception:
                pass

        self._load_parent_router()
        self.child_models: Dict[str, Any] = {}

        self.initialized = True
        print(" DOMAIN ROUTER LOADED & READY (Child models configured for on-demand loading)!\n")

    def _load_parent_router(self):
        parent_dir = MODELS_DIR / "Parent_Model"
        class_names_path = parent_dir / "class_names.json"
        with open(class_names_path, "r") as f:
            self.parent_classes = json.load(f)

        # 1. Prefer ONNX model (ultra-low memory)
        onnx_weight = parent_dir / "router_model_final.onnx"
        if ONNX_AVAILABLE and onnx_weight.exists():
            print(f"Loading Domain Router via ONNX Runtime: {onnx_weight.name}")
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 1
            opts.inter_op_num_threads = 1
            self.parent_onnx_session = ort.InferenceSession(str(onnx_weight), sess_options=opts, providers=["CPUExecutionProvider"])
            self.parent_onnx_input_name = self.parent_onnx_session.get_inputs()[0].name
            self.parent_is_onnx = True
            print(f" -> Router classes: {self.parent_classes} (ONNX)")
            return

        # 2. Fallback to Keras model
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

        if not TF_AVAILABLE:
            raise RuntimeError("TensorFlow is required to load .keras weights, but not installed.")

        print(f"Loading Domain Router via TensorFlow: {chosen_weight.name}")
        self.parent_model = tf.keras.models.load_model(chosen_weight)
        self.parent_is_onnx = False
        print(f" -> Router classes: {self.parent_classes} (Keras)")

    def get_or_load_child_model(self, domain: str) -> Optional[Tuple[str, Any, List[str]]]:
        """Load domain-specific child network on demand into RAM. Returns (format, model_or_session, classes)."""
        if domain in self.child_models:
            return self.child_models[domain]

        child_folders = {
            "brain":  MODELS_DIR / "Child_Brain_Cancer_Processed",
            "lung":   MODELS_DIR / "Child_Lung_Cancer_Processed",
            "breast": MODELS_DIR / "Child_Breast_Cancer_Processed",
            "bone":   MODELS_DIR / "Child_Bone_Cancer_Processed",
            "skin":   MODELS_DIR / "Child_Skin_Cancer_Processed",
        }

        folder = child_folders.get(domain)
        if not folder:
            return None

        classes_path = folder / "class_names.json"
        onnx_weight = folder / "best_child_model.onnx"
        pt_weight = folder / "best_child_model.pt"

        # If neither exists, trigger on-demand download
        if not onnx_weight.exists() and not pt_weight.exists():
            from download_models import download_child_model
            print(f"Weights missing for {domain}. Fetching on-demand...")
            download_child_model(domain)

        if not classes_path.exists():
            return None

        with open(classes_path, "r") as f:
            classes = json.load(f)

        # 1. Prefer ONNX model (ultra-fast, ~1MB weights, ~30MB RAM)
        if ONNX_AVAILABLE and onnx_weight.exists():
            print(f"Loading Child Network via ONNX Runtime: {domain.upper()}...")
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 1
            sess = ort.InferenceSession(str(onnx_weight), sess_options=opts, providers=["CPUExecutionProvider"])
            in_name = sess.get_inputs()[0].name
            self.child_models[domain] = ("onnx", (sess, in_name), classes)
            print(f"Loaded Child Network: {domain.upper()} ({len(classes)} classes) [ONNX]")
            return self.child_models[domain]

        # 2. Fallback to PyTorch .pt model
        if pt_weight.exists() and TORCH_AVAILABLE:
            print(f"Loading Child Network via PyTorch: {domain.upper()}...")
            model = models.densenet121(weights=None)
            in_features = model.classifier.in_features
            model.classifier = nn.Sequential(
                nn.Dropout(0.3),
                nn.Linear(in_features, len(classes))
            )
            model.load_state_dict(torch.load(pt_weight, map_location=DEVICE, weights_only=True))
            model = model.to(DEVICE)
            model.eval()
            self.child_models[domain] = ("torch", model, classes)
            print(f"Loaded Child Network: {domain.upper()} ({len(classes)} classes) [PyTorch]")
            return self.child_models[domain]

        print(f"Warning: Model weights missing for {domain} at {folder}")
        return None

    def predict_domain(self, image_pil: Image.Image) -> Tuple[str, float, float, List[Dict[str, Any]]]:
        start_time = time.perf_counter()

        img = image_pil.convert("RGB").resize((224, 224))
        # Note: Model was trained on raw [0, 255] float arrays
        img_arr = np.array(img, dtype=np.float32)
        img_tensor = np.expand_dims(img_arr, axis=0)

        if getattr(self, "parent_is_onnx", False):
            raw_preds = self.parent_onnx_session.run(None, {self.parent_onnx_input_name: img_tensor})[0][0]
        else:
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
            # Never fabricate a finding when the domain's weights are unavailable
            raise RuntimeError(f"Pathology model for domain '{domain}' could not be loaded")

        model_type, model_obj, class_names = child_info

        if model_type == "onnx":
            sess, in_name = model_obj
            tensor_np = preprocess_child_numpy(image_pil)
            logits = sess.run(None, {in_name: tensor_np})[0][0]
            # Numerically stable softmax
            exp = np.exp(logits - np.max(logits))
            probs = exp / exp.sum()
        else:
            # PyTorch fallback
            img = image_pil.convert("RGB")
            child_transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            tensor = child_transform(img).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                outputs = model_obj(tensor)
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
