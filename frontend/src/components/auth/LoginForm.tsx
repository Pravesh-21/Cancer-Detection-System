"use client";

import { useState } from "react";
import { AuthField, AuthError, AuthSubmit, authInputCls } from "@/components/auth/AuthShell";
import { loginHospitalUser } from "@/lib/api";
import { safeNextPath } from "@/lib/authCookie";

export default function LoginForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginHospitalUser(email, password);
      // Full navigation so the workspace loads fresh with the new session cookie
      window.location.replace(safeNextPath(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {expired && !error && (
        <div className="p-3 rounded-[10px] bg-[#EBF4FC] border border-[#BAE6FD] text-[13px] text-[#0B4F8A] font-medium">
          Your session has ended. Please sign in again.
        </div>
      )}
      <AuthError message={error} />
      <AuthField label="Work e-mail">
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="doctor@hospital.org"
          className={authInputCls()}
        />
      </AuthField>
      <AuthField label="Password">
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={authInputCls()}
        />
      </AuthField>
      <AuthSubmit busy={busy}>Sign in</AuthSubmit>
    </form>
  );
}
