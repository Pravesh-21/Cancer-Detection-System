<div align="center">

<h1>🔬 Diagnostic Radiography Suite</h1>
<h3>Multi-Domain AI-Powered Cancer Detection Platform</h3>

<p>
  A production-grade clinical decision-support system that leverages a <strong>dual-stage hierarchical deep learning pipeline</strong> to detect and classify cancer across five anatomical domains — Brain, Lung, Breast, Bone, and Skin — from medical imaging scans.
</p>

<p>
  <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white"/>
  <img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
</p>

<p>
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/Status-Research%20%2F%20Investigational-orange.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/Domains-5%20Anatomical-blue.svg?style=flat-square"/>
</p>

> ⚠️ **Medical Disclaimer** — This software is a **Decision-Support Instrument Only**. It is investigational software and **requires sign-off by a licensed Attending Pathologist or Radiologist** before any clinical use. It is **not** approved as a standalone diagnostic device.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Supported Domains & Classes](#-supported-domains--classes)
- [Risk Stratification](#-risk-stratification)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [API Reference](#-api-reference)
- [Dataset](#-dataset)
- [Research References](#-research-references)
- [Contributing](#-contributing)

---

## 🔭 Overview

The **Diagnostic Radiography Suite** is a full-stack clinical AI application that automates the triage and classification of radiologic images across five cancer domains. The system implements a two-stage inference pipeline:

1. **Stage 1 — Domain Router**: A TensorFlow/Keras-based parent classifier routes the incoming scan to the correct anatomical domain (brain, lung, breast, bone, or skin).
2. **Stage 2 — Pathology Classifier**: A domain-specific DenseNet-121 child model (PyTorch) performs fine-grained pathology classification and risk stratification.

Results are surfaced through a **Next.js clinical dashboard** with real-time inference, DICOM metadata simulation, 21 CFR Part 11-compliant audit logging, and one-click PDF report generation.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧠 **Dual-Stage Pipeline** | Parent router + 4 specialized child networks for accurate domain-specific diagnosis |
| ⚡ **Real-Time Inference** | End-to-end pipeline completes in under 2 seconds on GPU |
| 🏥 **DICOM Metadata** | Simulated DICOM headers (Study UID, Accession No., Modality) per study |
| 📋 **Audit Trail** | 21 CFR Part 11-aligned audit logging with CSV export |
| 📄 **PDF Reports** | One-click clinical session report generation |
| 🎨 **Heatmap Overlay** | Visual confidence heatmap over the uploaded scan |
| ♿ **Colorblind-Safe UI** | WCAG 2.1 AA-compliant severity tokens and color palettes |
| 🔧 **Config-Driven** | Zero hardcoded UI strings — all content driven from `config/` |
| 🌐 **Multi-Tenant Ready** | Hospital name, facility code, and regulatory disclaimers all configurable |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Clinical Imaging Input                      │
│                   (JPEG / PNG / DICOM scan)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 1 — Domain Router (TensorFlow/Keras)         │
│                     DenseNet121 / Custom CNN                    │
│                                                                 │
│       Brain │ Lung │ Breast │ Bone │ Skin                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │  Predicted Domain + Confidence
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│           STAGE 2 — Child Classifiers (PyTorch)                 │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Brain   │ │   Lung   │ │  Breast  │ │   Bone   │          │
│  │DenseNet  │ │DenseNet  │ │DenseNet  │ │DenseNet  │          │
│  │  -121    │ │  -121    │ │  -121    │ │  -121    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└──────────────────────┬──────────────────────────────────────────┘
                       │  Class + Risk Level + Probabilities
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              FastAPI Backend  (port 8001)                       │
│      Audit Logging │ DICOM Metadata │ Tenant Config            │
└──────────────────────┬──────────────────────────────────────────┘
                       │  JSON Response
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│            Next.js Clinical Dashboard  (port 3000)              │
│   Upload → Preliminary Metadata → Findings → Heatmap → Report  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Supported Domains & Classes

### 🧠 Brain
| Class | Display Name | Risk |
|---|---|---|
| `glioma` | Glioma | 🔴 High |
| `meningioma` | Meningioma | 🟡 Moderate |
| `pituitary` | Pituitary Adenoma | 🟡 Moderate |
| `notumor` | No Tumor Detected | 🟢 Normal |

### 🫁 Lung
| Class | Display Name | Risk |
|---|---|---|
| `lung_aca` | Adenocarcinoma | 🔴 High |
| `lung_scc` | Squamous Cell Carcinoma | 🔴 High |
| `lung_n` | Normal Lung Tissue | 🟢 Normal |

### 🎀 Breast
| Class | Display Name | Risk |
|---|---|---|
| `malignant` | Malignant Neoplasm | 🔴 High |
| `benign` | Benign Lesion | 🟢 Normal |

### 🦴 Bone
| Class | Display Name | Risk |
|---|---|---|
| `cancer` | Osseous Malignancy | 🔴 High |
| `normal` | Normal Bone | 🟢 Normal |

### 🩺 Skin
| Class | Display Name | Risk |
|---|---|---|
| `mel` | Melanoma | 🔴 High |
| `bcc` | Basal Cell Carcinoma | 🔴 High |
| `akiec` | Actinic Keratosis | 🟡 Moderate |
| `nv` | Benign Nevus | 🟢 Normal |

---

## ⚖️ Risk Stratification

Risk levels are determined by class membership, not by confidence score alone:

| Risk Level | Colour Token | Assigned Classes |
|---|---|---|
| 🔴 **High** | `--sev-high` | `glioma`, `malignant`, `cancer`, `lung_aca`, `lung_scc`, `mel`, `bcc` |
| 🟡 **Moderate** | `--sev-mod` | `meningioma`, `pituitary`, `akiec` |
| 🟢 **Normal** | `--sev-ok` | `normal`, `notumor`, `lung_n`, `benign`, `nv` |

> All colour tokens are colorblind-safe and WCAG 2.1 AA contrast compliant.

---

## 📁 Project Structure

```
IDEA LAB/
├── backend/                     # FastAPI inference server
│   ├── main.py                  # API routes, audit logging, DICOM metadata
│   ├── model_loader.py          # ModelEngine (singleton): loads TF + PyTorch models
│   └── schemas.py               # Pydantic response models
│
├── frontend/                    # Next.js 14 clinical dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Main clinical workflow page
│   │   │   └── globals.css      # Design system + colorblind-safe tokens
│   │   ├── components/          # Reusable UI components
│   │   ├── config/
│   │   │   ├── tenant.ts        # Hospital / facility configuration
│   │   │   ├── strings.ts       # All UI copy (zero hardcoding)
│   │   │   ├── workflow.ts      # Clinical workflow stage definitions
│   │   │   ├── themeTokens.ts   # Design system tokens
│   │   │   └── imaging.ts       # Imaging modality metadata
│   │   └── lib/
│   │       └── api.ts           # Typed API client (Fetch wrappers)
│   ├── .env.local               # Backend URL config (not committed)
│   └── next.config.ts
│
├── models/                      # Not committed — see Dataset section
│   ├── Parent_Model/            # TF/Keras domain router weights
│   ├── Child_Brain_Cancer_Processed/
│   ├── Child_Lung_Cancer_Processed/
│   ├── Child_Breast_Cancer_Processed/
│   └── Child_Bone_Cancer_Processed/
│
├── datasets/                    # Not committed — see Dataset section
├── scripts/                     # Training + evaluation scripts
│   ├── train_child.py           # Child model training (DenseNet-121, PyTorch)
│   ├── parent_train.py          # Parent router training (TensorFlow/Keras)
│   ├── test_child.py            # Child model evaluation
│   ├── parent_test.py           # Parent model evaluation
│   ├── image_router.py          # Inference routing utility
│   └── folder_details.py        # Dataset inspection utility
│
├── venv/                        # Not committed
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

| Tool | Version |
|---|---|
| Python | >= 3.10 |
| Node.js | >= 18.x |
| CUDA | >= 11.8 (optional, for GPU inference) |
| Git | latest |

---

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/cancer-detection-system.git
cd cancer-detection-system
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn python-multipart pillow torch torchvision tensorflow numpy pydantic
```

> For GPU inference on Windows, install PyTorch with CUDA support from [pytorch.org](https://pytorch.org/get-started/locally/)

### 3. Model Weights

Download model weights from the **[Dataset & Models Drive Folder](https://drive.google.com/drive/u/0/folders/1v57oTWtqc6UK3facNfU-rO64IRO9_o9A)** and place them as follows:

```
models/
├── Parent_Model/
│   ├── router_model_final.keras   # or best_finetuned.keras
│   └── class_names.json
├── Child_Brain_Cancer_Processed/
│   ├── best_child_model.pt
│   └── class_names.json
├── Child_Lung_Cancer_Processed/
│   ├── best_child_model.pt
│   └── class_names.json
├── Child_Breast_Cancer_Processed/
│   ├── best_child_model.pt
│   └── class_names.json
└── Child_Bone_Cancer_Processed/
    ├── best_child_model.pt
    └── class_names.json
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

---

## 🚀 Running the Application

### Start the Backend

```bash
# From project root, with venv activated
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

The API will be available at `http://localhost:8001`
Swagger docs: `http://localhost:8001/docs`

### Start the Frontend

```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:3000`

---

## 📡 API Reference

### `GET /health`
Returns system status and loaded model domains.

```json
{
  "status": "operational",
  "models_initialized": true,
  "available_domains": ["brain", "lung", "breast", "bone"],
  "timestamp": "2026-09-17T10:30:00Z"
}
```

---

### `POST /api/diagnose`
Main inference endpoint. Accepts a multipart form with an image file.

**Request:**
```
Content-Type: multipart/form-data
file: <image file>
domain_override: (optional) brain | lung | breast | bone | skin
```

**Response:**
```json
{
  "sessionResult": {
    "sessionId": "CLIN-260917-A3F2B1",
    "imageFile": "scan.jpg",
    "domainClassification": {
      "predictedDomain": "brain",
      "confidence": 0.9823,
      "latencyMs": 34.2,
      "probabilities": [...]
    },
    "diagnosticFinding": {
      "domain": "brain",
      "predictedClass": "glioma",
      "displayName": "Glioma",
      "riskLevel": "high",
      "confidence": 0.9741,
      "classProbabilities": [...],
      "latencyMs": 88.1,
      "totalPipelineMs": 122.3
    }
  },
  "dicomMetadata": {
    "studyUID": "1.2.840.113619.2.55.3...",
    "modality": "MR",
    "bodyPartExamined": "BRAIN / CRANIAL"
  }
}
```

---

### `GET /api/config`
Returns dynamic tenant configuration (hospital name, regulatory disclaimers, available domains).

### `GET /api/audit-logs`
Returns the full chronological audit trail for the current session.

### `POST /api/audit-logs`
Records a custom clinical workflow audit event.

---

## 📦 Dataset

The training datasets and pretrained model weights are hosted on Google Drive (not included in this repository due to size).

### 📥 [Access Dataset & Model Weights on Google Drive](https://drive.google.com/drive/u/0/folders/1v57oTWtqc6UK3facNfU-rO64IRO9_o9A)

The dataset aggregates multiple publicly available medical imaging benchmarks:

| Domain | Source Dataset | Modality | Classes |
|---|---|---|---|
| Brain | Brain Tumor MRI Dataset (Sartaj et al.) | MRI | Glioma, Meningioma, Pituitary, No Tumor |
| Lung | LC25000 Lung and Colon Dataset | CT Histology | Adenocarcinoma, Squamous Cell, Normal |
| Breast | CBIS-DDSM / BreaKHis-derived | Mammography | Malignant, Benign |
| Bone | Bone Cancer Radiograph Dataset | X-Ray | Cancer, Normal |
| Skin | HAM10000 (Human Against Machine) | Dermoscopy | Melanoma, Nevus, BCC, Actinic Keratosis |

---

## 📚 Research References

The architecture, training strategy, and domain-specific class definitions are informed by the following foundational papers:

### Model Architecture

1. **DenseNet** — *Densely Connected Convolutional Networks*
   Huang, G., Liu, Z., van der Maaten, L., & Weinberger, K. Q. (2017)
   https://arxiv.org/abs/1608.06993

2. **Transfer Learning for Medical Imaging** — *A Survey on Deep Learning in Medical Image Analysis*
   Litjens, G. et al. (2017) — Medical Image Analysis
   https://arxiv.org/abs/1702.05747

### Brain Tumor Detection

3. **Brain Tumor MRI Classification** — *Brain Tumor Classification Using Deep Learning*
   Cheng, J. et al. (2015)
   https://arxiv.org/abs/1505.07870

4. **Deep Learning for Brain Tumor Segmentation and Classification**
   Bakas, S. et al. — BraTS Challenge
   https://arxiv.org/abs/1811.02629

### Lung Cancer Detection

5. **LC25000 Dataset** — *Lung and Colon Cancer Histopathological Image Dataset*
   Borkowski, A. A. et al. (2019)
   https://arxiv.org/abs/1912.12142

6. **Deep Learning for Lung Nodule Detection and Classification**
   Ardila, D. et al. (2019) — Nature Medicine
   https://www.nature.com/articles/s41591-019-0447-x

### Breast Cancer Detection

7. **BreaKHis Dataset** — *A Dataset for Breast Cancer Histopathological Image Classification*
   Spanhol, F. A. et al. (2016) — IEEE Transactions on Biomedical Engineering
   https://ieeexplore.ieee.org/document/7312934

8. **Deep Learning for Mammography Classification**
   McKinney, S. M. et al. (2020) — Nature
   https://www.nature.com/articles/s41586-019-1799-6

### Skin Lesion Analysis

9. **HAM10000 Dataset** — *The HAM10000 Dataset: A Large Collection of Multi-Source Dermatoscopic Images*
   Tschandl, P. et al. (2018) — Scientific Data
   https://www.nature.com/articles/sdata2018161

10. **Skin Lesion Analysis Toward Melanoma Detection** — ISIC 2018 Challenge
    Codella, N. et al. (2019)
    https://arxiv.org/abs/1902.03368

### Clinical AI & Explainability

11. **Grad-CAM** — *Gradient-weighted Class Activation Mapping*
    Selvaraju, R. R. et al. (2017) — ICCV
    https://arxiv.org/abs/1610.02391

12. **CheXNet** — *Radiologist-Level Pneumonia Detection from Chest X-Rays*
    Rajpurkar, P. et al. (2017) — Stanford ML Group
    https://arxiv.org/abs/1711.05225

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please ensure any new ML models are accompanied by evaluation metrics and a corresponding `class_names.json`.

---

## ⚠️ Regulatory Notice

This system is **investigational software** intended exclusively for research purposes. It is **not** FDA-cleared, CE-marked, or approved for standalone clinical diagnosis.

- All inferences **must** be reviewed and signed off by a qualified Attending Pathologist or Radiologist.
- Patient data anonymization follows **HIPAA Safe Harbor De-identification** (45 CFR § 164.514(b)(2)).
- Audit trails conform to **21 CFR Part 11** electronic records requirements.

---

<div align="center">
  <sub>Built with love for advancing AI-driven oncological diagnostics.</sub>
</div>