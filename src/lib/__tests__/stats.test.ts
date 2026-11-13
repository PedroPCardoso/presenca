import { describe, expect, it } from "vitest";
import { memberFrequency, summarize, type MeetingRecord } from "../stats";

const m = (id: number, date: string, memberIds: number[], visitors: string[] = []): MeetingRecord => ({
  id, date, memberIds, visitors, total: memberIds.length + visitors.length,
});

const meetings = [
  m(1, "2026-10-01", [1, 2], ["Cris"]),
  m(2, "2026-10-08", [1, 2]),
  m(3, "2026-10-15", [1], ["cris", "Neta"]),
  m(4, "2026-10-22", [1, 3]),
];
const old = new Date("2026-09-01T12:00:00Z");

describe("summarize", () => {
  it("conta encontros, média e visitantes distintos (sem diferenciar maiúsculas)", () => {
    const s = summarize(meetings);
    expect(s.count).toBe(4);
    expect(s.avgPresent).toBe((3 + 2 + 3 + 2) / 4);
    expect(s.distinctVisitors).toBe(2);
    expect(s.last?.id).toBe(4);
  });

  it("lida com lista vazia", () => {
    expect(summarize([])).toEqual({ count: 0, last: null, avgPresent: 0, distinctVisitors: 0 });
  });
});

describe("memberFrequency", () => {
  const [a, b, c] = memberFrequency(
    [
      { id: 1, name: "Ana", kind: "adulto", createdAt: old },
      { id: 2, name: "Bia", kind: "adulto", createdAt: old },
      { id: 3, name: "Caio", kind: "adulto", createdAt: new Date("2026-10-20T12:00:00Z") },
    ],
    meetings,
  );

  it("calcula taxa e última presença", () => {
    expect(a.rate).toBe(1);
    expect(a.lastSeen).toBe("2026-10-22");
    expect(b.attended).toBe(2);
    expect(b.possible).toBe(4);
  });

  it("conta faltas seguidas a partir do último encontro", () => {
    expect(b.absenceStreak).toBe(2);
    expect(a.absenceStreak).toBe(0);
  });

  it("não conta falta antes de a pessoa entrar no GC", () => {
    expect(c.history).toEqual([null, null, null, true]);
    expect(c.rate).toBe(1);
  });
});
