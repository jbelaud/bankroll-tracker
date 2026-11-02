"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";

type Enrollment = { id: string; qrCode: string; secret: string };

export function AdminSecurityForm({ locale, initialFactorId }: { locale: string; initialFactorId: string | null }) {
  const en = locale === "en";
  const [factorId, setFactorId] = useState(initialFactorId);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualSetup, setManualSetup] = useState(false);

  async function beginEnrollment() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      // A verified factor must be challenged; never replace it from an AAL1 session.
      if (factors.data.totp.length > 0) {
        setFactorId(factors.data.totp[0].id);
        return;
      }
      // Clean up abandoned, never-verified enrollments created by this screen.
      for (const factor of factors.data.all.filter((item) => item.factor_type === "totp" && item.status === "unverified" && item.friendly_name === "Kalivoa administration")) {
        const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) throw removed.error;
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Kalivoa administration", issuer: "Kalivoa" });
      if (enrollError) throw enrollError;
      setFactorId(data.id);
      setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch {
      setError(en ? "Unable to prepare verification. Please sign in again and retry." : "Impossible de préparer la vérification. Reconnecte-toi puis réessaie.");
    } finally {
      setPending(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || pending || !/^\d{6}$/.test(code)) return;
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyError) throw verifyError;
      // Full navigation discards any prefetched pages rendered at AAL1.
      window.location.assign(new URL(`/${locale}/admin`, window.location.origin).href);
    } catch {
      setCode("");
      setError(en ? "Verification failed. Enter the current code from your authenticator." : "Vérification refusée. Saisis le code actuel de ton application d’authentification.");
      setPending(false);
    }
  }

  const buttonClass = "min-h-11 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50";
  return <main className="mx-auto w-full max-w-lg space-y-6 px-4 py-8">
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{en ? "Secure administrator access" : "Sécuriser l’accès administrateur"}</h1>
      <p className="text-sm text-muted-foreground">{en ? "An authenticator code is required before accessing administration." : "Un code d’authentification est nécessaire avant d’accéder à l’administration."}</p>
    </div>
    {!factorId ? <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <p className="text-sm">{en ? "Use an authenticator app on your phone or a password manager that supports verification codes." : "Utilise une application d’authentification sur ton téléphone ou un gestionnaire de mots de passe compatible avec les codes de vérification."}</p>
      <button type="button" className={buttonClass} onClick={beginEnrollment} disabled={pending}>{pending ? (en ? "Preparing…" : "Préparation…") : (en ? "Set up verification" : "Configurer la vérification")}</button>
    </section> : <form onSubmit={verify} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      {enrollment ? <div className="space-y-3">
        <p className="text-sm">{en ? "Scan this QR code with your authenticator, then enter the six-digit code. Keep its backup in a safe place." : "Scanne ce QR code avec ton application, puis saisis le code à six chiffres. Conserve sa sauvegarde dans un endroit sûr."}</p>
        {/* A local data image keeps the enrollment secret away from image proxies. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qrCode.startsWith("data:image/") ? enrollment.qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qrCode)}`} width={240} height={240} alt={en ? "Authenticator setup QR code" : "QR code de configuration de l’authentification"} className="mx-auto rounded-lg bg-white p-3" />
        <button type="button" className="min-h-11 text-sm underline" onClick={() => setManualSetup(!manualSetup)} aria-expanded={manualSetup}>{en ? "Enter the setup key manually" : "Saisir la clé de configuration manuellement"}</button>
        {manualSetup ? <p className="break-all rounded-lg bg-muted p-3 font-mono text-sm">{enrollment.secret}</p> : null}
      </div> : <p className="text-sm">{en ? "Enter the code from the authenticator already linked to your account." : "Saisis le code de l’application d’authentification déjà associée à ton compte."}</p>}
      <label className="block space-y-2" htmlFor="admin-verification-code">
        <span className="text-sm font-medium">{en ? "Six-digit code" : "Code à six chiffres"}</span>
        <input id="admin-verification-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 tracking-widest" aria-describedby={error ? "admin-verification-error" : undefined} />
      </label>
      <button type="submit" className={buttonClass} disabled={pending || code.length !== 6}>{pending ? (en ? "Verifying…" : "Vérification…") : (en ? "Verify and continue" : "Vérifier et continuer")}</button>
    </form>}
    {error ? <p id="admin-verification-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
    <p className="text-xs text-muted-foreground">{en ? "If you lose your authenticator, contact the project owner to verify your identity and recover access. Signing in again does not remove this protection." : "En cas de perte de ton application, contacte le propriétaire du projet pour vérifier ton identité et récupérer l’accès. Une nouvelle connexion ne retire pas cette protection."}</p>
    <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm underline">{en ? "Back to my account" : "Retour à mon espace"}</Link>
  </main>;
}
