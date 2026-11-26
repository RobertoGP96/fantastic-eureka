import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/** Clase de un botón de acción dentro de la cabecera (p. ej. «+ Nueva»). */
export const HEADER_ACTION =
  "inline-flex min-h-9 items-center gap-1 rounded-lg bg-white/15 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none";

/** Cifras destacadas bajo el título («Me deben 2 000 CUP»). */
export function HeaderStats({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="text-[11px] tracking-wide text-white/80 uppercase">
            {item.label}
          </div>
          <div className="money text-[22px] font-bold tracking-[-0.4px]">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Etiqueta pequeña de la cabecera («3 abiertas»). */
export function HeaderPill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger";
  children: ReactNode;
}) {
  return (
    <span
      className={
        tone === "danger"
          ? "rounded-md bg-danger-bg px-2 py-[3px] text-xs font-semibold text-danger"
          : "rounded-md bg-white/15 px-2 py-[3px] text-xs font-semibold text-white"
      }
    >
      {children}
    </span>
  );
}

interface ScreenHeaderProps {
  title: string;
  backHref?: string;
  /** Acciones alineadas a la derecha del título (ej. avatar de usuario). */
  actions?: ReactNode;
  children?: ReactNode;
}

export function ScreenHeader({
  title,
  backHref,
  actions,
  children,
}: ScreenHeaderProps) {
  return (
    // overflow-clip (no hidden): una caja `hidden` se puede desplazar por
    // programa (foco, scrollIntoView) y los acentos decorativos sobresalen.
    <div className="grad-header relative overflow-clip rounded-b-3xl px-5 pt-5 pb-6 text-white md:mt-6 md:rounded-3xl md:px-7 md:py-7">
      {/* Acentos decorativos de la identidad Caja */}
      <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-brand-light/25 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-gold/15 blur-2xl" />

      <div className="relative flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Volver"
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="text-xl font-bold tracking-[-0.4px] md:text-[22px]">
          {title}
        </div>
        {actions && (
          <div className="ml-auto flex items-center">{actions}</div>
        )}
      </div>
      {children && <div className="relative">{children}</div>}
    </div>
  );
}
