import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  /**
   * Acción a medida (p. ej. un `PanelButton` que abre el drawer de alta).
   * Tiene prioridad sobre `ctaLabel`/`ctaHref`.
   */
  cta?: ReactNode;
}

// Vacío de página o de sección. El título es un <p>, NO un encabezado: los
// tests buscan encabezados por subcadena («Cuentas») y «Sin cuentas todavía»
// colisionaría.
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
    <div className="anim-fade-up flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-card px-6 py-10 text-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-chip ${iconColor}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-heading">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {cta ? (
        <div className="mt-1">{cta}</div>
      ) : (
        ctaLabel &&
        ctaHref && (
          <Link
            href={ctaHref}
            className={buttonVariants({ className: "mt-1" })}
          >
            {ctaLabel}
          </Link>
        )
      )}
    </div>
  );
}
