import { describe, expect, it } from "vitest";
import { addDays, formatBR, isISODate, publicDateRange, todayISO } from "../dates";

describe("dates", () => {
  it("valida datas ISO reais", () => {
    expect(isISODate("2026-11-12")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("12/11/2026")).toBe(false);
    expect(isISODate(undefined)).toBe(false);
  });

  it("usa o fuso de Brasília para 'hoje'", () => {
    // 01:00 UTC do dia 13 ainda é dia 12 em Brasília
    expect(todayISO(new Date("2026-11-13T01:00:00Z"))).toBe("2026-11-12");
  });

  it("formata e soma dias", () => {
    expect(formatBR("2026-11-12")).toBe("12/11/2026");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("link público aceita hoje e os 7 dias anteriores", () => {
    expect(publicDateRange(new Date("2026-11-13T15:00:00Z"))).toEqual({ min: "2026-11-06", max: "2026-11-13" });
  });
});
