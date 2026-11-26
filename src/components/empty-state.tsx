import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Clase del botón de llamada a la acción (para un `cta` propio). */
export const EMPTY_STATE_CTA =
  "mt-1.5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  /**
   * Acción propia en lugar del enlace `ctaLabel`/`ctaHref` (p. ej. un
   * `PanelButton` que abre un drawer). Usa `EMPTY_STATE_CTA` como clase.
   */
  cta?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  iconColor = "text-brand-ink",
  title,
  description,
  ctaLabel,
  ctaHref,
  cta,
}: EmptyStateProps) {
  return (
    <div className="anim-fade-up flex flex-1 flex-col items-center justify-center gap-3.5 p-10">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-chip ${iconColor}`}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div className="text-base font-semibold text-heading">{title}</div>
      <div className="text-center text-sm text-muted">{description}</div>
      {cta ??
        (ctaLabel && ctaHref && (
          <Link href={ctaHref} className={EMPTY_STATE_CTA}>
            {ctaLabel}
          </Link>
        ))}
    </div>
  );
}
