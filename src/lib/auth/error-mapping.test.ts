import { describe, expect, it } from "vitest";
import { authErrorKey, authQueryErrorKey } from "./error-mapping";

describe("authentication error mapping", () => {
  it("does not distinguish a missing account from a wrong password", () => {
    expect(authErrorKey({ code: "invalid_credentials", message: "Invalid login credentials" }, "signIn")).toBe("invalidCredentials");
  });

  it("returns actionable errors for sign-up and provider rate limits", () => {
    expect(authErrorKey({ code: "user_already_exists" }, "signUp")).toBe("accountExists");
    expect(authErrorKey({ code: "over_email_send_rate_limit" }, "signUp")).toBe("tooManyRequests");
  });

  it("accepts only known query error codes", () => {
    expect(authQueryErrorKey("callback_failed")).toBe("callbackFailed");
    expect(authQueryErrorKey("provider-detail-that-must-not-leak")).toBeNull();
  });
});
