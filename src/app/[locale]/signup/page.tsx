import { isBetaPhaseActive } from "@/lib/beta/program";
import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage() {
  return <SignupForm betaPhaseActive={await isBetaPhaseActive()} />;
}
