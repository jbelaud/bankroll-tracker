/** French calendar deadline, extended over weekends and metropolitan holidays. */
function easter(year: number): [number, number] {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return [Math.floor(n / 31), n % 31 + 1];
}
function isHoliday(date: Date) {
  const year = date.getUTCFullYear(); const md = `${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  if (["1-1", "5-1", "5-8", "7-14", "8-15", "11-1", "11-11", "12-25"].includes(md)) return true;
  const [month, day] = easter(year); const sunday = Date.UTC(year, month - 1, day);
  return [1, 39, 50].some((offset) => date.getTime() === sunday + offset * 86_400_000);
}
function parisMidnight(date: Date) {
  const target = date.getTime(); let result = target;
  // Resolve the timezone offset for that date, including a daylight-saving change.
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(result));
    const get = (name: string) => Number(parts.find((p) => p.type === name)?.value);
    const displayed = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    result -= displayed - target;
  }
  return result;
}
export function withdrawalDeadline(start: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(start);
  const get = (name: string) => Number(parts.find((part) => part.type === name)?.value);
  const lastDay = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + 14));
  while ([0, 6].includes(lastDay.getUTCDay()) || isHoliday(lastDay)) lastDay.setUTCDate(lastDay.getUTCDate() + 1);
  const nextDay = new Date(lastDay.getTime() + 86_400_000);
  return new Date(parisMidnight(nextDay)); // Exclusive midnight after the final eligible day.
}
