import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenHeaderProps {
  title: string;
  /** Una línea atenuada bajo el título; admite enlaces. */
  subtitle?: ReactNode;
  /**
   * Destino de la flecha «Volver». Solo se pinta en móvil: en escritorio la
   * jerarquía la da el breadcrumb de la barra superior.
   */
  backHref?: string;
  /** Nodo antes del título (logotipo de Inicio en móvil). */
  leading?: ReactNode;
  /** Acciones a la derecha del título (botones, menús). */
  actions?: ReactNode;
  /** Contenido bajo el título, sobre el lienzo claro (insignias, avisos). */
  children?: ReactNode;
  className?: string;
}

// Cabecera plana de pantalla. Va directamente sobre el lienzo: el título es
// el <h1> de la página y las cifras clave ya no viven aquí, sino en tarjetas
// KPI (StatCard) dentro del cuerpo.
export function ScreenHeader({
  title,
  subtitle,
  backHref,
  leading,
  actions,
  children,
  className,
}: ScreenHeaderProps) {
  return (
    <header className={cn("px-5 pt-4 md:px-0 md:pt-8", className)}>
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Volver"
            className="-ml-2.5 flex size-11 flex-none items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-subtle hover:text-heading md:hidden"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
        {leading}
        {/* basis-44: si título y acciones no caben, las acciones bajan a su
            propia línea en vez de estrujar el título a dos o tres renglones. */}
        <div className="min-w-0 flex-1 basis-44">
          <h1 className="line-clamp-2 text-xl font-semibold tracking-tight break-words text-heading md:text-[22px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-none items-center gap-2">{actions}</div>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </header>
  );
}
