import sys, json, time
from pathlib import Path
import numpy as np
from PIL import Image

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).parent))

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"

print("=" * 60)
print("  CANCERLENS INFERENCE ENGINE -- E2E SANITY CHECK")
print("=" * 60)

# ── 1. TensorFlow parent router ───────────────────────────────────────────────
print("\n[1] Parent Domain Router (TensorFlow/Keras)")
try:
    import tensorflow as tf
    print(f"    TF version: {tf.__version__}")

    model_path = MODELS_DIR / "Parent_Model" / "router_model_final.keras"
    parent = tf.keras.models.load_model(str(model_path))
    print(f"    [OK] Loaded: {model_path.name}")
    print(f"    Input shape : {parent.input_shape}")
    print(f"    Output shape: {parent.output_shape}")

    classes = json.loads((MODELS_DIR / "Parent_Model" / "class_names.json").read_text())
    print(f"    Classes: {classes}")

    # Test with real images if available, else synthetic
    test_dir = PROJECT_ROOT / "datasets" / "Router_Processed" / "test"
    if test_dir.exists():
        print("\n    Testing against real dataset images:")
        for c in classes:
            imgs = list((test_dir / c).glob("*.*"))
            if imgs:
                img = Image.open(imgs[0]).convert("RGB").resize((224, 224))
                arr = np.array(img, dtype=np.float32)
                inp = np.expand_dims(arr, 0)
                preds = parent.predict(inp, verbose=0)[0]
                top = sorted(zip(classes, preds), key=lambda x: -x[1])
                top_class, top_conf = top[0]
                status = "[OK]" if top_class == c else "[MISMATCH]"
                print(f"    {status} Actual: {c:6s} -> Top Predicted: {top_class:6s} ({top_conf*100:.1f}%)")
    else:
        test_cases = [
            ("Solid grey (neutral)",   Image.new("RGB", (224, 224), (128, 128, 128))),
            ("Bright scan (white)",    Image.new("RGB", (224, 224), (220, 220, 220))),
            ("Dark scan (near black)", Image.new("RGB", (224, 224), (20, 20, 20))),
        ]
        for name, img in test_cases:
            arr = np.array(img, dtype=np.float32)
            inp = np.expand_dims(arr, 0)
            preds = parent.predict(inp, verbose=0)[0]
            top = sorted(zip(classes, preds), key=lambda x: -x[1])
            result_str = ", ".join(f"{c}={p:.3f}" for c, p in top)
            print(f"    [{name}] -> {result_str}")

except Exception as e:
    import traceback
    print(f"    [FAIL] ERROR: {e}")
    traceback.print_exc()

# ── 2. PyTorch child models ───────────────────────────────────────────────────
print("\n[2] Child Domain Classifiers (PyTorch / DenseNet-121)")
try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms

    print(f"    PyTorch version: {torch.__version__}")
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"    Hardware: {DEVICE}")

    child_domains = {
        "brain":  ("Child_Brain_Cancer_Processed",  ["glioma", "meningioma", "notumor", "pituitary"]),
        "lung":   ("Child_Lung_Cancer_Processed",   ["lung_aca", "lung_n", "lung_scc"]),
        "breast": ("Child_Breast_Cancer_Processed", ["benign", "malignant"]),
        "bone":   ("Child_Bone_Cancer_Processed",   ["cancer", "normal"]),
    }

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    dummy_img = Image.new("RGB", (256, 256), color=(100, 120, 80))
    tensor = transform(dummy_img).unsqueeze(0).to(DEVICE)

    for domain, (folder, classes_expected) in child_domains.items():
        weight_path = MODELS_DIR / folder / "best_child_model.pt"
        classes_path = MODELS_DIR / folder / "class_names.json"

        if not weight_path.exists():
            print(f"    [{domain.upper()}] [FAIL] MISSING: {weight_path}")
            continue

        try:
            classes = json.loads(classes_path.read_text())
            net = models.densenet121(weights=None)
            in_f = net.classifier.in_features
            net.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(in_f, len(classes)))
            net.load_state_dict(torch.load(str(weight_path), map_location=DEVICE, weights_only=True))
            net.to(DEVICE).eval()

            with torch.no_grad():
                out = net(tensor)
                probs = torch.softmax(out, dim=1)[0].cpu().numpy()

            top = sorted(zip(classes, probs), key=lambda x: -x[1])
            top_str = ", ".join(f"{c}={p:.3f}" for c, p in top)
            weight_mb = weight_path.stat().st_size / 1024 / 1024
            print(f"    [{domain.upper()}] [OK] {weight_mb:.1f}MB -- {top_str}")

        except Exception as e:
            print(f"    [{domain.upper()}] [FAIL] LOAD ERROR: {e}")

except Exception as e:
    import traceback
    print(f"    [FAIL] PyTorch ERROR: {e}")
    traceback.print_exc()

# ── 3. Full pipeline (model_loader.ModelEngine) ───────────────────────────────
print("\n[3] Full Pipeline (ModelEngine)")
try:
    from model_loader import ModelEngine
    from download_models import ensure_class_names

    ensure_class_names()
    engine = ModelEngine()
    engine.initialize()

    # Test with real brain scan if available
    brain_sample = None
    b_dir = PROJECT_ROOT / "datasets" / "Brain_Cancer_Processed" / "test"
    if b_dir.exists():
        for sub in b_dir.iterdir():
            if sub.is_dir():
                f = list(sub.glob("*.*"))
                if f:
                    brain_sample = Image.open(f[0])
                    break
    if not brain_sample:
        brain_sample = Image.new("RGB", (256, 256), color=(80, 100, 60))

    t0 = time.perf_counter()
    domain, d_conf, d_ms, d_probs = engine.predict_domain(brain_sample)
    child_result = engine.predict_child(domain, brain_sample)
    total_ms = (time.perf_counter() - t0) * 1000

    top_class, display_name, risk_level, child_conf, c_ms, c_probs = child_result

    print(f"    Domain Router -> {domain.upper()} ({d_conf*100:.1f}%) [{d_ms:.0f}ms]")
    print(f"    Child Finding -> {display_name} (risk={risk_level}, conf={child_conf*100:.1f}%) [{c_ms:.0f}ms]")
    print(f"    Total pipeline: {total_ms:.0f}ms")

except Exception as e:
    import traceback
    print(f"    [FAIL] Pipeline ERROR: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("  TEST COMPLETE")
print("=" * 60)
