import { describe, expect, it } from "vitest";
import { buildWhatsAppText } from "../whatsapp";

describe("buildWhatsAppText", () => {
  const present = [
    { name: "Tamara", kind: "adulto" as const, isVisitor: false },
    { name: "Cátia", kind: "adulto" as const, isVisitor: false },
    { name: "Alice", kind: "crianca" as const, isVisitor: false },
    { name: "Neta", kind: "adulto" as const, isVisitor: true },
    { name: "Lia", kind: "crianca" as const, isVisitor: true },
  ];

  it("separa adultos, crianças e visitantes em ordem alfabética", () => {
    const text = buildWhatsAppText({ groupName: "GC Berimbau", date: "2026-11-12", present });
    expect(text).toBe(
      [
        "*GC Berimbau · Presença - 12/11/2026*",
        "",
        "*Adultos (2)*\n1. Cátia\n2. Tamara",
        "",
        "*Crianças (1)*\n1. Alice",
        "",
        "*Visitantes (2)*\n1. Lia (criança)\n2. Neta",
        "",
        "*Total: 5*",
      ].join("\n"),
    );
  });

  it("omite visitantes quando não há e inclui ausentes quando pedido", () => {
    const text = buildWhatsAppText({
      date: "2026-11-12",
      present: [present[0]],
      absent: [
        { name: "Rute", kind: "crianca", isVisitor: false },
        { name: "Beto", kind: "adulto", isVisitor: false },
      ],
      includeAbsent: true,
    });
    expect(text).not.toContain("Visitantes");
    expect(text).toContain("*Crianças (0)*\n—");
    expect(text.endsWith("_Ausentes (2)_\n1. Beto\n2. Rute")).toBe(true);
  });
});
