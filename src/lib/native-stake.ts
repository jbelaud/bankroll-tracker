import type { AccountingCurrency, Currency } from "@prisma/client";
import { toUnits } from "@/lib/bankroll-units";

export function convertTicketToBankroll(input: {
  amount: number;
  cashOutAmount: number | null;
  sourceCurrency: Currency;
  bankrollCurrency: AccountingCurrency;
  referenceCurrency: Currency;
  referenceCapital: number | null;
  fxRate?: number | null;
}) {
  const targetCurrency = input.bankrollCurrency === "UNIT" ? input.referenceCurrency : input.bankrollCurrency;
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("INVALID_TICKET_AMOUNT");
  const fxRate = input.sourceCurrency === targetCurrency ? 1 : input.fxRate;
  if (fxRate === null || fxRate === undefined || !Number.isFinite(fxRate) || fxRate <= 0) throw new Error("FX_RATE_REQUIRED");
  const convertedAmount = input.amount * fxRate;
  const convertedCashOut = input.cashOutAmount === null ? null : input.cashOutAmount * fxRate;
  if (!Number.isFinite(convertedAmount) || convertedCashOut !== null && !Number.isFinite(convertedCashOut)) throw new Error("AMOUNT_OUT_OF_RANGE");
  if (input.bankrollCurrency !== "UNIT") return { stake: convertedAmount, cashOutAmount: convertedCashOut, fxRate };
  if (input.referenceCapital === null) throw new Error("UNIT_REFERENCE_REQUIRED");
  return {
    stake: toUnits(convertedAmount, input.referenceCapital)!,
    cashOutAmount: convertedCashOut === null ? null : toUnits(convertedCashOut, input.referenceCapital)!,
    fxRate,
  };
}
