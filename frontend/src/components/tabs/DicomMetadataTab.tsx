"use client";

import { useState } from "react";
import { Database, ShieldCheck, Copy, Check, Clock, UserCheck, Cpu } from "lucide-react";
import type { DicomMetadata } from "@/lib/types";
import type { TenantBranding } from "@/config/tenant";
import { STRINGS } from "@/config/strings";

interface DicomMetadataTabProps {
  metadata: DicomMetadata | null;
  tenant: TenantBranding;
}

export default function DicomMetadataTab({ metadata, tenant }: DicomMetadataTabProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!metadata) {
    return (
      <div className="py-12 text-center text-[#7A91A6]">
        <Database className="w-8 h-8 mx-auto mb-2 text-[#7A91A6] opacity-60" />
        <p className="text-[14px] font-bold text-[#0B2239]">{STRINGS.tabs.emptyMetadataTitle}</p>
        <p className="text-[12px] text-[#7A91A6] mt-1 max-w-sm mx-auto">
          {STRINGS.tabs.emptyMetadataPrompt}
        </p>
      </div>
    );
  }

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const patientTags = [
    { label: "Patient MRN", value: metadata.patientMRN, key: "mrn" },
    { label: "Patient Name", value: metadata.patientName, key: "name" },
    { label: "Patient Sex / Gender", value: metadata.patientSex, key: "sex" },
    { label: "Date of Birth", value: metadata.patientDOB, key: "dob" },
    { label: "Accession Number", value: metadata.accessionNumber, key: "acc" },
    { label: "Referring Physician", value: metadata.referringPhysician, key: "phys" },
    { label: "Clinical Facility", value: metadata.institution || tenant.hospitalName, key: "inst" },
  ];

  const acquisitionTags = [
    { label: "Modality Code", value: metadata.modality, key: "mod" },
    { label: "Body Part Examined", value: metadata.bodyPartExamined, key: "body" },
    { label: "Study Date", value: metadata.studyDate, key: "date" },
    { label: "Imaging Scanner / Device", value: metadata.imagingDevice, key: "dev" },
    { label: "Study Instance UID", value: metadata.studyUID, key: "suid" },
    { label: "Series Instance UID", value: metadata.seriesUID, key: "seuid" },
    ...(metadata.sliceThickness ? [{ label: "Slice Thickness", value: metadata.sliceThickness, key: "slice" }] : []),
    ...(metadata.kvp ? [{ label: "Peak Tube Potential (kVp)", value: metadata.kvp, key: "kvp" }] : []),
    ...(metadata.repetitionTime ? [{ label: "Repetition Time (TR)", value: metadata.repetitionTime, key: "tr" }] : []),
    ...(metadata.echoTime ? [{ label: "Echo Time (TE)", value: metadata.echoTime, key: "te" }] : []),
    ...(metadata.magneticFieldStrength ? [{ label: "Field Strength", value: metadata.magneticFieldStrength, key: "field" }] : []),
  ];

  return (
    <div className="space-y-4 animate-fade-rise" role="tabpanel" aria-label={STRINGS.tabs.metadataTabTitle}>
      {/* ── Security & De-identification Banner: Dark & Light Contrast ── */}
      <div className="flex items-center justify-between p-3.5 rounded-[10px] bg-gradient-to-r from-[#F0FAF9] to-white border border-[#BCE8E3] shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#0B2239] to-[#07131F] border border-[#16385C] flex items-center justify-center text-[#0E9F8E] shadow-xs flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-[12px] font-bold text-[#0B2239]">
            {tenant.anonymizationProtocol}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#0E9F8E] uppercase bg-[#0B2239] px-2.5 py-1 rounded-[6px] border border-[#16385C] shadow-2xs">
          DE-IDENTIFIED STUDY
        </span>
      </div>

      {/* Preliminary Ingestion Notice */}
      {metadata.isPreliminary && (
        <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#F0F7FD] border border-[#BAE6FD] text-[#0F74C9] text-[12px] font-medium">
          <Clock className="w-4 h-4 text-[#0F74C9] flex-shrink-0" />
          <span>{STRINGS.tabs.preliminaryNotice}</span>
        </div>
      )}

      {/* ── Patient Demographics Table ── */}
      <div className="clinical-card p-5 space-y-3 border-l-4 border-l-[#0F74C9]">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#0F74C9]" />
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#0B2239]">
            {STRINGS.tabs.demographicsSection}
          </span>
        </div>
        <div className="divide-y divide-[#DCE8F0] text-[12px]">
          {patientTags.map((row) => (
            <div key={row.key} className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-[#3C566E] font-medium">{row.label}</span>
              <div className="flex items-center gap-2 font-mono text-[#0B2239] font-medium">
                <span className="truncate max-w-[320px]">{row.value}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(row.key, row.value)}
                  className="p-1 text-[#7A91A6] hover:text-[#0B2239] rounded-[6px] hover:bg-[#F3F8FB] transition-colors cursor-pointer"
                  title="Copy tag value"
                  aria-label={`Copy ${row.label}`}
                >
                  {copiedKey === row.key ? <Check className="w-3.5 h-3.5 text-[#0E9F8E]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Acquisition & Protocol Parameters ── */}
      <div className="clinical-card p-5 space-y-3 border-l-4 border-l-[#0E9F8E]">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#0E9F8E]" />
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#0B2239]">
            {STRINGS.tabs.acquisitionSection}
          </span>
        </div>
        <div className="divide-y divide-[#DCE8F0] text-[12px]">
          {acquisitionTags.map((row) => (
            <div key={row.key} className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-[#3C566E] font-medium">{row.label}</span>
              <div className="flex items-center gap-2 font-mono text-[#0B2239] font-medium">
                <span className="truncate max-w-[320px]">{row.value}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(row.key, row.value)}
                  className="p-1 text-[#7A91A6] hover:text-[#0B2239] rounded-[6px] hover:bg-[#F3F8FB] transition-colors cursor-pointer"
                  title="Copy tag value"
                  aria-label={`Copy ${row.label}`}
                >
                  {copiedKey === row.key ? <Check className="w-3.5 h-3.5 text-[#0E9F8E]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
