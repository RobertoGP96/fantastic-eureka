"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Etiquetas de segmentos estáticos conocidos (ruta completa → label).
const STATIC_LABELS: Record<string, string> = {
  "/cuentas": "Cuentas",
  "/cuentas/nueva": "Nueva cuenta",
  "/cuentas/grupos": "Grupos",
  "/movimientos": "Movimientos",
  "/deudas": "Deudas",
  "/deudas/nueva": "Nueva deuda",
  "/mensualidades": "Mensualidades",
  "/mensualidades/nueva": "Nueva mensualidad",
  "/conteo": "Conteo de efectivo",
  "/calculadora": "Calculadora de efectivo",
  "/tasas": "Tasas de cambio",
  "/categorias": "Categorías",
  "/monedas": "Monedas",
  "/registrar": "Registrar",
  "/perfil": "Mi perfil",
  "/mas": "Más",
  "/editar": "Editar",
};

interface Crumb {
  href: string;
  label: string;
  // Sin página propia: se muestra pero no enlaza.
  linkable: boolean;
}

// Rutas intermedias que no tienen página propia.
const NON_LINKABLE = new Set<string>();

function buildCrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ href: "/", label: "Inicio", linkable: true }];
  if (pathname === "/") return crumbs;

  const segments = pathname.split("/").filter(Boolean);
  let path = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    path += `/${segment}`;
    const staticLabel = STATIC_LABELS[path] ?? STATIC_LABELS[`/${segment}`];
    let label = staticLabel;
    if (!label) {
      // Segmento dinámico: /tasas/[from]/[to] muestra el par; el resto, «Detalle».
      if (segments[0] === "tasas" && i === 2) {
        crumbs.pop(); // quita el crumb del [from]
        label = `${decodeURIComponent(segments[1]).toUpperCase()} → ${decodeURIComponent(segment).toUpperCase()}`;
      } else if (segments[0] === "tasas" && i === 1) {
        label = decodeURIComponent(segment).toUpperCase();
      } else if (segments[0] === "conteo" && i === 1) {
        label = "Arqueo";
      } else if (segments[0] === "mensualidades" && i === 1) {
        label = "Mensualidad";
      } else {
        label = "Detalle";
      }
    }
    crumbs.push({ href: path, label, linkable: !NON_LINKABLE.has(path) });
  }
  return crumbs;
}

// Breadcrumb del header de escritorio: se deriva de la ruta actual.
// Los ids dinámicos se muestran con etiquetas genéricas (Detalle, Arqueo…).
export function AppBreadcrumb() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  const last = crumbs.length - 1;

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap gap-1.5 text-[13px] sm:gap-1.5">
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem className="whitespace-nowrap">
              {i === last ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : crumb.linkable ? (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <span>{crumb.label}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
