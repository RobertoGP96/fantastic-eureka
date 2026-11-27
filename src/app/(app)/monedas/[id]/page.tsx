import { notFound } from "next/navigation";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DenominationForm,
  DenominationGrid,
  type DenominationItem,
} from "./denomination-manager";
import { CurrencyKindEditor } from "./currency-kind-editor";

export const dynamic = "force-dynamic";

export default async function MonedaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const currency = await prisma.currency.findFirst({
    where: { id, userId: user.id },
    include: {
      denominations: {
        orderBy: [{ kind: "asc" }, { valueMinor: "desc" }],
        include: { _count: { select: { countLines: true, txLines: true } } },
      },
    },
  });
  if (!currency) notFound();

  const items: DenominationItem[] = currency.denominations.map((d) => ({
    id: d.id,
    valueMinor: d.valueMinor,
    kind: d.kind,
    active: d.active,
    usageCount: d._count.countLines + d._count.txLines,
  }));

  const isDigital = currency.kind === "DIGITAL";
  const displayCurrency = {
    id: currency.id,
    code: currency.code,
    decimalPlaces: currency.decimalPlaces,
  };

  const subtitle = [
    `${currency.decimalPlaces} decimales`,
    currency.isBase ? "Moneda base" : null,
    isDigital
      ? "Digital (sin efectivo)"
      : currency.denominations.length === 0
        ? "Sin denominaciones"
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Page>
      <ScreenHeader
        title={`${currency.code} · ${currency.name}`}
        subtitle={subtitle}
        backHref="/monedas"
      />
      <PageBody>
        <div className="grid gap-5 @4xl/main:grid-cols-12">
          {/* Columna lateral: primera en el DOM (arriba en móvil) y a la
              derecha en escritorio. En anchos intermedios sus dos tarjetas
              se ponen lado a lado. */}
          <div
            className={cn(
              "grid min-w-0 content-start gap-5 @4xl/main:order-2 @4xl/main:col-span-4",
              !isDigital && "@2xl/main:grid-cols-2 @4xl/main:grid-cols-1"
            )}
          >
            <CurrencyKindEditor currencyId={currency.id} kind={currency.kind} />
            {!isDigital && <DenominationForm currency={displayCurrency} />}
          </div>

          <div className="min-w-0 @4xl/main:col-span-8">
            {isDigital ? (
              <Card dashed className="py-6 text-center text-sm text-muted">
                Esta moneda es digital: no existe en efectivo, así que no lleva
                billetes ni monedas. Conviértela a efectivo si necesitas
                denominaciones.
              </Card>
            ) : (
              <DenominationGrid
                currency={displayCurrency}
                denominations={items}
              />
            )}
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
