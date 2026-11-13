/** Classes compartilhadas dos componentes (alvo de toque ≥ 44px). */

const base =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60";

export const btn = {
  primary: `${base} bg-primary text-on-primary hover:bg-primary-hover`,
  secondary: `${base} border border-border-strong bg-surface text-fg hover:bg-bg`,
  ghost: `${base} text-muted hover:bg-bg hover:text-fg`,
  danger: `${base} border border-danger/30 bg-surface text-danger hover:bg-danger-soft`,
  whatsapp: `${base} bg-whatsapp text-on-whatsapp hover:brightness-95`,
};

export const card = "rounded-2xl border border-border bg-surface";

export const input =
  "min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-base text-fg placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export const label = "mb-1.5 block text-sm font-medium text-fg";
