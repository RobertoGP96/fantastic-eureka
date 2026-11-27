import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Cabecera de sección: título como encabezado REAL (los tests E2E localizan
// secciones por él), descripción atenuada opcional y una acción a la derecha.
// El encabezado contiene SOLO el título: la descripción y la acción van fuera
// para no alterar su nombre accesible.
interface SectionHeaderProps {
  title: string;
  description?: ReactNode;
  /** Enlace estándar ({href,label}) o cualquier nodo (subtotal, contador…). */
  action?: { href: string; label: string } | ReactNode;
  as?: "h2" | "h3";
  /** sm: título de bloque dentro de una tarjeta. */
  size?: "md" | "sm";
  className?: string;
}

function isLinkAction(
  action: SectionHeaderProps["action"]
): action is { href: string; label: string } {
  return (
    typeof action === "object" &&
    action !== null &&
    "href" in action &&
    "label" in action
  );
}

export function SectionHeader({
  title,
  description,
  action,
  as: Heading = "h2",
  size = "md",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <Heading
          className={cn(
            "font-semibold text-heading",
            size === "md" ? "text-base" : "text-sm"
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        )}
      </div>
      {isLinkAction(action) ? (
        <Link
          href={action.href}
          className="flex-none text-xs font-semibold text-brand-ink hover:text-brand-mid"
        >
          {action.label}
        </Link>
      ) : (
        action
      )}
    </div>
  );
}
