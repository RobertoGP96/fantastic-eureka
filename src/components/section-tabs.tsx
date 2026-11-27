import { SegmentedLinks } from "@/components/ui/segmented";

const DEBT_TABS = [
  { value: "/deudas", label: "Deudas", href: "/deudas" },
  { value: "/mensualidades", label: "Mensualidades", href: "/mensualidades" },
  { value: "/contactos", label: "Contactos", href: "/contactos" },
] as const;

/**
 * Pestañas compartidas por Deudas, Mensualidades y Contactos (las tres
 * vistas de «Compromisos»). En móvil se reparten el ancho; en escritorio se
 * ajustan a su contenido.
 */
export function DebtsTabs({
  current,
}: {
  current: (typeof DEBT_TABS)[number]["value"];
}) {
  return (
    <SegmentedLinks
      ariaLabel="Deudas, mensualidades y contactos"
      options={DEBT_TABS}
      current={current}
      layout="fill"
      className="md:inline-flex md:w-auto md:self-start"
    />
  );
}
