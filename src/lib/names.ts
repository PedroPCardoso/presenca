const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export const compareNames = (a: string, b: string) => collator.compare(a, b);

export function sortByName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => compareNames(a.name, b.name));
}

/** Remove espaços extras: "  ana   maria " → "ana maria" */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Compara nomes ignorando maiúsculas e acentos. */
export function sameName(a: string, b: string): boolean {
  return collator.compare(cleanName(a), cleanName(b)) === 0;
}

/**
 * Lê uma lista de nomes colada (um por linha, vírgula ou ponto e vírgula).
 * Aceita listas do WhatsApp: remove numeração ("1. Ana"), marcadores ("- Ana"),
 * caracteres invisíveis e ignora títulos em negrito/itálico ("*Adultos (20)*").
 */
export function parseNameList(text: string): string[] {
  const names: string[] = [];
  for (const raw of text.split(/\r?\n|,|;/)) {
    const line = raw.replace(/[​-‍⁠﻿]/g, "").trim();
    if (!line || /^[*_~]/.test(line)) continue;
    const name = cleanName(line.replace(/^(\d+\s*[.)-]?|[-•*])\s*/, ""));
    if (name && name.length <= 60 && !names.some((n) => sameName(n, name))) names.push(name);
  }
  return names;
}
