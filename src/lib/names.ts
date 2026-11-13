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
