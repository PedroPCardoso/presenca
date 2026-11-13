import { describe, expect, it } from "vitest";
import { parseNameList } from "../names";

describe("parseNameList", () => {
  it("lê um nome por linha, sem repetir (ignora acento/maiúscula)", () => {
    expect(parseNameList("Ana\n  bruno  \n\nCarla\nana")).toEqual(["Ana", "bruno", "Carla"]);
  });

  it("aceita a lista copiada do WhatsApp", () => {
    const zap = [
      "*Presença - 12/11/2026*",
      "",
      "*Adultos (2)*",
      " 1.⁠ ⁠Beatriz",
      "10.⁠ ⁠Iolanda",
      "",
      "_Ausentes (1)_",
      "- Levi",
      "• Rute",
      "*Total: 3*",
    ].join("\n");
    expect(parseNameList(zap)).toEqual(["Beatriz", "Iolanda", "Levi", "Rute"]);
  });

  it("aceita vírgula e ponto e vírgula", () => {
    expect(parseNameList("Ana, Bia; Caio")).toEqual(["Ana", "Bia", "Caio"]);
  });
});
