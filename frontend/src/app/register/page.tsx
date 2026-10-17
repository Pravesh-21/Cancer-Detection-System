"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell, { AuthField, AuthError, AuthSubmit, authInputCls } from "@/components/auth/AuthShell";
import { registerHospital, type HospitalRegistration } from "@/lib/api";

type Form = HospitalRegistration & { confirmPassword: string };
type Errors = Partial<Record<keyof Form, string>>;

const EMPTY: Form = {
  hospitalName: "", city: "", phone: "", licenseNumber: "",
  adminName: "", email: "", password: "", confirmPassword: "", registrationCode: "",
};

function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.hospitalName.trim().length < 2) e.hospitalName = "Enter the hospital's name";
  if (f.city.trim().length < 2) e.city = "Enter the city";
  if (f.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number";
  if (f.adminName.trim().length < 2) e.adminName = "Enter your full name";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "Enter a valid e-mail address";
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password))
    e.password = "At least 8 characters, with a letter and a number";
  if (f.confirmPassword !== f.password) e.confirmPassword = "Passwords do not match";
  return e;
}

export default function RegisterPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setServerError(null);
    try {
      const { confirmPassword: _confirm, ...payload } = form;
      void _confirm;
      await registerHospital({
        ...payload,
        licenseNumber: payload.licenseNumber?.trim() || undefined,
        registrationCode: payload.registrationCode?.trim() || undefined,
      });
      window.location.replace("/");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      wide
      title="Register your hospital"
      subtitle="Create a private workspace and the first administrator account"
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-bold text-[#0F74C9] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <AuthError message={serverError} />

        <fieldset className="space-y-4">
          <legend className="text-[11px] font-bold uppercase tracking-wider text-[#0F74C9] mb-1">Hospital</legend>
          <AuthField label="Hospital name" error={errors.hospitalName}>
            <input value={form.hospitalName} onChange={set("hospitalName")} autoComplete="organization"
              placeholder="e.g. City Care Hospital" className={authInputCls(!!errors.hospitalName)} />
          </AuthField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthField label="City" error={errors.city}>
              <input value={form.city} onChange={set("city")} autoComplete="address-level2"
                placeholder="e.g. Nagpur" className={authInputCls(!!errors.city)} />
            </AuthField>
            <AuthField label="Phone" error={errors.phone}>
              <input value={form.phone} onChange={set("phone")} type="tel" autoComplete="tel"
                placeholder="+91 98765 43210" className={authInputCls(!!errors.phone)} />
            </AuthField>
          </div>
          <AuthField label="Registration / licence no." hint="Optional">
            <input value={form.licenseNumber} onChange={set("licenseNumber")}
              placeholder="e.g. state clinical establishment number" className={authInputCls()} />
          </AuthField>
        </fieldset>

        <fieldset className="space-y-4 pt-1">
          <legend className="text-[11px] font-bold uppercase tracking-wider text-[#0F74C9] mb-1">Administrator account</legend>
          <AuthField label="Your full name" error={errors.adminName} hint="Shown as the signing clinician on reports">
            <input value={form.adminName} onChange={set("adminName")} autoComplete="name"
              placeholder="e.g. Dr. Asha Rao" className={authInputCls(!!errors.adminName)} />
          </AuthField>
          <AuthField label="Work e-mail" error={errors.email}>
            <input value={form.email} onChange={set("email")} type="email" autoComplete="username"
              placeholder="you@hospital.org" className={authInputCls(!!errors.email)} />
          </AuthField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthField label="Password" error={errors.password} hint="8+ characters, a letter and a number">
              <input value={form.password} onChange={set("password")} type="password" autoComplete="new-password"
                className={authInputCls(!!errors.password)} />
            </AuthField>
            <AuthField label="Confirm password" error={errors.confirmPassword}>
              <input value={form.confirmPassword} onChange={set("confirmPassword")} type="password" autoComplete="new-password"
                className={authInputCls(!!errors.confirmPassword)} />
            </AuthField>
          </div>
          <AuthField label="Registration code" hint="Only if your CancerLens administrator gave you one">
            <input value={form.registrationCode} onChange={set("registrationCode")} autoComplete="off"
              className={authInputCls()} />
          </AuthField>
        </fieldset>

        <AuthSubmit busy={busy}>Create hospital workspace</AuthSubmit>
      </form>
    </AuthShell>
  );
}
