export type AuthErrorContext = "signIn" | "signUp";
export type AuthErrorKey =
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "accountExists"
  | "weakPassword"
  | "invalidEmail"
  | "tooManyRequests"
  | "signupEmailRateLimited"
  | "oauthFailed"
  | "callbackFailed"
  | "unavailable";

/** Maps provider errors to safe, actionable UI messages without leaking internals. */
export function authErrorKey(error: unknown, context: AuthErrorContext): AuthErrorKey {
  const value = error as { code?: unknown; message?: unknown } | null;
  const code = typeof value?.code === "string" ? value.code.toLowerCase() : "";
  const message = typeof value?.message === "string" ? value.message.toLowerCase() : "";
  const haystack = `${code} ${message}`;

  if (context === "signIn" && (haystack.includes("invalid_credentials") || haystack.includes("invalid login credentials"))) {
    return "invalidCredentials";
  }
  if (haystack.includes("email_not_confirmed") || haystack.includes("email not confirmed")) return "emailNotConfirmed";
  if (context === "signUp" && (haystack.includes("user_already_exists") || haystack.includes("user already registered") || haystack.includes("email_exists"))) {
    return "accountExists";
  }
  if (haystack.includes("weak_password") || haystack.includes("password should be")) return "weakPassword";
  if (haystack.includes("email_address_invalid") || haystack.includes("invalid email")) return "invalidEmail";
  if (context === "signUp" && haystack.includes("email_send_rate_limit")) return "signupEmailRateLimited";
  if (haystack.includes("rate_limit") || haystack.includes("too many requests")) return "tooManyRequests";
  if (haystack.includes("network") || haystack.includes("fetch failed") || haystack.includes("timeout")) return "unavailable";
  return "unavailable";
}

export function authQueryErrorKey(value: string | null): AuthErrorKey | null {
  return value === "oauth_failed" || value === "callback_failed" ? value === "oauth_failed" ? "oauthFailed" : "callbackFailed" : null;
}
