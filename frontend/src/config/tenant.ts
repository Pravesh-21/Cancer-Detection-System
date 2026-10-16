export interface TenantBranding {
  hospitalName: string;
  departmentName: string;
  facilityCode: string;
  dicomAeTitle: string;
  referringFacility: string;
  regulatoryDisclaimer: string;
  modelVersion: string;
  lastValidatedDate: string;
  supportContact: string;
  anonymizationProtocol: string;
}

export const DEFAULT_TENANT: TenantBranding = {
  hospitalName: "CancerLens",
  departmentName: "AI-Assisted Oncology Diagnostic Workstation",
  facilityCode: "CL-ONCO-01",
  dicomAeTitle: "CANCERLENS_PACS",
  referringFacility: "Precision Oncology & Radiologic Core",
  regulatoryDisclaimer: "Decision-Support Instrument Only — Investigational Software. Requires Attending Pathologist / Radiologist Sign-off.",
  modelVersion: "v2.4.1",
  lastValidatedDate: "2026-08-15",
  supportContact: "clinical@cancerlens.ai",
  anonymizationProtocol: "HIPAA Safe Harbor De-identification (45 CFR § 164.514(b)(2))",
};
