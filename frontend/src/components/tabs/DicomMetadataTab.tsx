"use client";

import { useState } from "react";
import { Database, ShieldCheck, Copy, Check, Clock } from "lucide-react";
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
      <div className="py-12 text-center text-slate-400">
        <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-[13px] font-bold text-slate-600">{STRINGS.tabs.emptyMetadataTitle}</p>
        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
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
    <div className="space-y-4 animate-fade-in" role="tabpanel" aria-label={STRINGS.tabs.metadataTabTitle}>
      {/* ── Security & De-identification Banner ── */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/80 border border-emerald-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-emerald-950">
            {tenant.anonymizationProtocol}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
          AE: {tenant.dicomAeTitle}
        </span>
      </div>

      {/* Preliminary Ingestion Notice */}
      {metadata.isPreliminary && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>{STRINGS.tabs.preliminaryNotice}</span>
        </div>
      )}

      {/* ── Patient Demographics Table ── */}
      <div className="clinical-card p-4 space-y-2">
        <span className="section-header">{STRINGS.tabs.demographicsSection}</span>
        <div className="divide-y divide-slate-100 text-[11px]">
          {patientTags.map((row) => (
            <div key={row.key} className="py-2 flex items-center justify-between gap-4">
              <span className="text-slate-500 font-medium">{row.label}</span>
              <div className="flex items-center gap-1.5 font-mono text-slate-900 font-semibold">
                <span className="truncate max-w-[320px]">{row.value}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(row.key, row.value)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                  title="Copy tag value"
                  aria-label={`Copy ${row.label}`}
                >
                  {copiedKey === row.key ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Acquisition & Protocol Parameters ── */}
      <div className="clinical-card p-4 space-y-2">
        <span className="section-header">{STRINGS.tabs.acquisitionSection}</span>
        <div className="divide-y divide-slate-100 text-[11px]">
          {acquisitionTags.map((row) => (
            <div key={row.key} className="py-2 flex items-center justify-between gap-4">
              <span className="text-slate-500 font-medium">{row.label}</span>
              <div className="flex items-center gap-1.5 font-mono text-slate-900 font-semibold">
                <span className="truncate max-w-[320px]">{row.value}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(row.key, row.value)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                  title="Copy tag value"
                  aria-label={`Copy ${row.label}`}
                >
                  {copiedKey === row.key ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
