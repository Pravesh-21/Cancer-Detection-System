"use client";

import { X, ShieldCheck, Download, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import type { AuditLogEntry } from "@/lib/types";
import { STRINGS } from "@/config/strings";
import type { TenantBranding } from "@/config/tenant";

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  tenant: TenantBranding;
}

export default function AuditLogsModal({
  isOpen,
  onClose,
  logs,
  tenant,
}: AuditLogsModalProps) {
  if (!isOpen) return null;

  const handleExportCsv = () => {
    const headers = ["Event ID", "Timestamp", "Actor / System", "Action Event", "Details", "Status"];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp,
      log.actor,
      log.action,
      `"${log.details.replace(/"/g, '""')}"`,
      log.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clinical_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-clinical-50 text-clinical-700 border border-clinical-200 shadow-2xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 id="audit-modal-title" className="text-[15px] font-bold text-slate-900">
                {STRINGS.modals.auditLogs.title}
              </h3>
              <p className="text-[11px] text-slate-500">
                {STRINGS.modals.auditLogs.subtitle} • {tenant.facilityCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compliance Metadata Strip */}
        <div className="px-6 py-2.5 bg-emerald-50/70 border-b border-emerald-200 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-2 text-emerald-950 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            {tenant.anonymizationProtocol}
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{STRINGS.modals.auditLogs.exportCsv}</span>
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">{STRINGS.modals.auditLogs.tableId}</th>
                  <th className="py-2.5 px-3">{STRINGS.modals.auditLogs.tableTimestamp}</th>
                  <th className="py-2.5 px-3">{STRINGS.modals.auditLogs.tableActor}</th>
                  <th className="py-2.5 px-3">{STRINGS.modals.auditLogs.tableAction}</th>
                  <th className="py-2.5 px-3">{STRINGS.modals.auditLogs.tableDetails}</th>
                  <th className="py-2.5 px-3 text-right">{STRINGS.modals.auditLogs.tableStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No audit events recorded in this clinical session yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500 font-medium">
                        {log.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {log.actor}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {log.status === "SUCCESS" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Total Session Events: <strong className="text-slate-800">{logs.length}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
