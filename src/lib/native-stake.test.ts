import { describe, expect, it } from "vitest";
import { convertTicketToBankroll } from "./native-stake";

describe("ticket conversion into a bankroll's native currency", () => {
  it("keeps a BA native unit stake independent of the viewer's reference", () => {
    const converted = convertTicketToBankroll({
      amount: 125.5,
      cashOutAmount: null,
      sourceCurrency: "EUR",
      bankrollCurrency: "UNIT",
      referenceCurrency: "EUR",
      referenceCapital: 5000,
    });
    expect(converted).toEqual({ stake: 2.51, cashOutAmount: null, fxRate: 1 });
  });

  it("converts a foreign-currency ticket only with an explicit exchange rate", () => {
    const input = {
      amount: 100,
      cashOutAmount: 125,
      sourceCurrency: "USD" as const,
      bankrollCurrency: "UNIT" as const,
      referenceCurrency: "EUR" as const,
      referenceCapital: 5000,
    };
    expect(() => convertTicketToBankroll(input)).toThrow("FX_RATE_REQUIRED");
    expect(convertTicketToBankroll({ ...input, fxRate: 0.9 })).toEqual({
      stake: 1.8,
      cashOutAmount: 2.25,
      fxRate: 0.9,
    });
  });

  it("does not fabricate units when the reference is missing", () => {
    expect(() => convertTicketToBankroll({
      amount: 125.5,
      cashOutAmount: null,
      sourceCurrency: "EUR",
      bankrollCurrency: "UNIT",
      referenceCurrency: "EUR",
      referenceCapital: null,
    })).toThrow("UNIT_REFERENCE_REQUIRED");
  });
});
