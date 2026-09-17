import type { Domain } from "./types";

export const DOMAIN_LABELS: Record<Domain, string> = {
  brain: "Brain / Neuro-Cranial",
  lung: "Lung / Thoracic CT",
  breast: "Breast / Mammography",
  bone: "Bone / Skeletal Radiograph",
  skin: "Skin / Dermoscopic",
};

export const MODALITY_MAP: Record<Domain, "MR" | "CT" | "MG" | "DX" | "US"> = {
  brain: "MR",
  lung: "CT",
  breast: "MG",
  bone: "DX",
  skin: "US",
};

export const BODY_PART_MAP: Record<Domain, string> = {
  brain: "BRAIN / CRANIAL",
  lung: "CHEST / THORAX",
  breast: "BREAST BILATERAL",
  bone: "SKELETAL STRUCTURE",
  skin: "DERMAL LESION",
};
