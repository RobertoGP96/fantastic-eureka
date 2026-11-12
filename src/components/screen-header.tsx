import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

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
    <div className="grad-header relative overflow-hidden rounded-b-3xl px-5 pt-5 pb-6 text-white md:mt-6 md:rounded-3xl md:px-7 md:py-7">
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
