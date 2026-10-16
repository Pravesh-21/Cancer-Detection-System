"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User, Phone, Mail, Droplets, Weight, Calendar,
  Hash, ChevronRight, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PatientLookupResult } from "@/lib/types";

// ── Validation Schema ──────────────────────────────────────────────────────────
const patientSchema = z.object({
  fullName:    z.string().min(2, "Full name must be at least 2 characters"),
  age:         z.coerce.number().int().min(1, "Age must be at least 1").max(130, "Age must be at most 130"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  sex:         z.enum(["male", "female", "other"], { message: "Sex is required" }),
  bloodGroup:  z.enum(["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"], { message: "Blood group is required" }),
  weight:      z.coerce.number().min(1, "Weight must be greater than 0").max(500),
  mrn:         z.string().min(3, "MRN must be at least 3 characters"),
  phone:       z.string().min(7, "Phone number is too short"),
  email:       z.string().email("Enter a valid email address"),
});

export type PatientFormData = z.infer<typeof patientSchema>;

interface PatientIntakeFormProps {
  defaultValues?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => void;
  /** Optional returning-patient lookup, triggered when the MRN field loses focus */
  onLookupMrn?: (mrn: string) => Promise<PatientLookupResult | null>;
}

// ── Field wrapper ──────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function Field({ label, error, required, icon: Icon, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#3C566E] uppercase tracking-wider">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#7A91A6]" />}
        {label}
        {required && <span className="text-[#C8353B] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-[#C8353B] font-medium mt-0.5">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// Shared input class
const inputCls = (hasError: boolean) => cn(
  "w-full h-10 px-3 rounded-[10px] border text-[13px] font-medium text-[#0B2239] bg-white transition-all duration-150",
  "placeholder:text-[#A4B7C6] focus:outline-none focus:ring-2 focus:ring-[#0F74C9]/20 focus:border-[#0F74C9]",
  hasError
    ? "border-[#C8353B] bg-[#FFF5F5]"
    : "border-[#DCE8F0] hover:border-[#BAD4E8]"
);

const selectCls = (hasError: boolean) => cn(
  inputCls(hasError),
  "cursor-pointer appearance-none"
);

// ── Component ──────────────────────────────────────────────────────────────────
function ageFromDob(dob: string): number | undefined {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

export default function PatientIntakeForm({ defaultValues, onSubmit, onLookupMrn }: PatientIntakeFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isValid },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues,
    mode: "onChange",
  });

  const [match, setMatch] = useState<PatientLookupResult | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "searching" | "none">("idle");
  const [lastLookup, setLastLookup] = useState<string>("");

  const handleMrnBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const mrn = e.target.value.trim();
    if (!onLookupMrn || mrn.length < 3 || mrn === lastLookup) return;
    setLastLookup(mrn);
    setLookupState("searching");
    const found = await onLookupMrn(mrn);
    setMatch(found);
    setLookupState(found ? "idle" : "none");
  };

  const applySavedDetails = () => {
    if (!match) return;
    const p = match.profile;
    reset(
      {
        ...getValues(),
        fullName: p.fullName,
        mrn: p.mrn,
        dateOfBirth: p.dateOfBirth,
        age: ageFromDob(p.dateOfBirth) ?? getValues("age"),
        sex: p.sex,
        bloodGroup: p.bloodGroup as PatientFormData["bloodGroup"],
        weight: p.weight ?? getValues("weight"),
        phone: p.phone,
        email: p.email,
      },
      { keepDefaultValues: true }
    );
  };

  return (
    <div className="bg-white border border-[#DCE8F0] rounded-[16px] shadow-[0_1px_3px_rgba(11,34,57,0.04),0_4px_12px_rgba(11,34,57,0.03)] overflow-hidden animate-fade-rise">
      {/* Accent top line */}
      <div className="h-[3px] bg-gradient-to-r from-[#0F74C9] to-[#0E9F8E]" />

      {/* Card Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F0F6FA]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#0B2239] to-[#07131F] border border-[#16385C] flex items-center justify-center shadow-sm">
            <User className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-[#0B2239] leading-tight">Patient Intake</h2>
            <p className="text-[11px] text-[#7A91A6] font-medium">Step 1 — Enter patient demographics</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[6px] bg-[#EBF4FC] text-[#0F74C9] border border-[#BAE6FD]">
          Required
        </span>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-5">
        {/* Row 1: Full Name + MRN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" required icon={User} error={errors.fullName?.message}>
            <input
              {...register("fullName")}
              type="text"
              placeholder="e.g. Priya Sharma"
              className={inputCls(!!errors.fullName)}
              autoComplete="name"
            />
          </Field>
          <Field label="Medical Record No." required icon={Hash} error={errors.mrn?.message}>
            <input
              {...register("mrn", { onBlur: handleMrnBlur })}
              type="text"
              placeholder="e.g. MRN-00892341"
              className={inputCls(!!errors.mrn)}
            />
          </Field>
        </div>

        {/* Returning-patient lookup result */}
        {lookupState === "searching" && (
          <p className="text-[12px] text-[#7A91A6] font-medium">Checking patient registry…</p>
        )}
        {lookupState === "none" && (
          <p className="text-[12px] text-[#7A91A6] font-medium">No prior record for this MRN — a new patient record will be created.</p>
        )}
        {match && (
          <div className="rounded-[12px] border border-[#FBE3B5] bg-[#FEF9EE] px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[13px] font-bold text-[#0B2239]">
                Returning patient · {match.patientCode} · {match.visitCount} previous visit{match.visitCount === 1 ? "" : "s"}
                {match.lastVisitAt && (
                  <span className="font-medium text-[#3C566E]"> · last seen {new Date(match.lastVisitAt).toLocaleDateString()}</span>
                )}
              </p>
              <button
                type="button"
                onClick={applySavedDetails}
                className="text-[12px] font-bold px-3 py-1.5 rounded-[8px] bg-[#0F74C9] text-white cursor-pointer hover:bg-[#0B5FA5]"
              >
                Load saved details
              </button>
            </div>
            {match.previousVisits.length > 0 && (
              <ul className="text-[12px] text-[#3C566E] space-y-0.5">
                {match.previousVisits.slice(0, 3).map((v) => (
                  <li key={v.visitCode} className="font-mono">
                    {v.date ? new Date(v.date).toLocaleDateString() : "—"} · {v.domain?.toUpperCase() ?? "—"} · {v.finding ?? "not analyzed"}
                    {v.status === "signed_off" ? " · signed off" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Row 2: Age + DOB + Sex */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Age (years)" required icon={Calendar} error={errors.age?.message}>
            <input
              {...register("age")}
              type="number"
              min={1}
              max={130}
              placeholder="e.g. 42"
              className={inputCls(!!errors.age)}
            />
          </Field>
          <Field label="Date of Birth" required icon={Calendar} error={errors.dateOfBirth?.message}>
            <input
              {...register("dateOfBirth")}
              type="date"
              className={inputCls(!!errors.dateOfBirth)}
            />
          </Field>
          <Field label="Biological Sex" required error={errors.sex?.message}>
            <select {...register("sex")} className={selectCls(!!errors.sex)}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </Field>
        </div>

        {/* Row 3: Blood Group + Weight */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Blood Group" required icon={Droplets} error={errors.bloodGroup?.message}>
            <select {...register("bloodGroup")} className={selectCls(!!errors.bloodGroup)}>
              <option value="">Select…</option>
              {["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Weight (kg)" required icon={Weight} error={errors.weight?.message}>
            <input
              {...register("weight")}
              type="number"
              step="0.1"
              min={1}
              placeholder="e.g. 68.5"
              className={inputCls(!!errors.weight)}
            />
          </Field>
        </div>

        {/* Row 4: Phone + Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phone Number" required icon={Phone} error={errors.phone?.message}>
            <input
              {...register("phone")}
              type="tel"
              placeholder="e.g. +91 98765 43210"
              className={inputCls(!!errors.phone)}
              autoComplete="tel"
            />
          </Field>
          <Field label="Email Address" required icon={Mail} error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              placeholder="e.g. patient@email.com"
              className={inputCls(!!errors.email)}
              autoComplete="email"
            />
          </Field>
        </div>

        {/* Submit CTA */}
        <div className="pt-2 flex items-center justify-between gap-4">
          <p className="text-[11px] text-[#7A91A6]">
            All fields marked <span className="text-[#C8353B] font-bold">*</span> are required before proceeding to scan.
          </p>
          <button
            type="submit"
            id="patient-intake-next"
            disabled={!isValid}
            className={cn(
              "btn-clinical flex items-center gap-2 px-6 py-2.5 rounded-[10px] font-bold text-[13px] transition-all duration-200",
              isValid
                ? "bg-gradient-to-r from-[#0F74C9] to-[#0284C7] text-white shadow-[0_3px_12px_rgba(15,116,201,0.3)] hover:from-[#0A5BA8] hover:to-[#0269A4] cursor-pointer"
                : "bg-[#E6EFF5] text-[#7A91A6] border border-[#DCE8F0] cursor-not-allowed opacity-60"
            )}
          >
            Proceed to Scan
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
