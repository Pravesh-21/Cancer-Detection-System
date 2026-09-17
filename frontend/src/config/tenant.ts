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
  hospitalName: "Metropolitan Radiologic Health Network",
  departmentName: "Department of Clinical Informatics & Diagnostic Imaging",
  facilityCode: "MRHN-CENTRAL-01",
  dicomAeTitle: "MRHN_PACS_ROUTER",
  referringFacility: "Clinical Radiology & Diagnostic Pathology Core",
  regulatoryDisclaimer: "Decision-Support Instrument Only — Investigational Software. Requires Attending Pathologist / Radiologist Sign-off.",
  modelVersion: "v2.4.1-rc3",
  lastValidatedDate: "2026-08-15",
  supportContact: "pacs-informatics@radiologycore.org",
  anonymizationProtocol: "HIPAA Safe Harbor De-identification (45 CFR § 164.514(b)(2))",
};
