import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { SplitLayout } from "@/components/content-grid";
import { DenominationForm } from "@/components/denomination-form";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { ScreenHeader } from "@/components/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import {
  DenominationManager,
  type DenominationItem,
} from "./denomination-manager";
import { CurrencyKindEditor } from "./currency-kind-editor";
import { NEW_DENOMINATION_PANEL } from "../panels";

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
        actions={
          // Una moneda digital no lleva billetes ni monedas.
          !isDigital && (
            <PanelButton
              panel={NEW_DENOMINATION_PANEL}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-3.5" />
              Nueva
            </PanelButton>
          )
        }
      />

      <PageBody>
        {/* asideFirst: en estrecho la clasificación (compacta) va arriba;
            con sitio pasa a la columna lateral. */}
        <SplitLayout
          asideFirst
          aside={
            <CurrencyKindEditor currencyId={currency.id} kind={currency.kind} />
          }
          main={
            isDigital ? (
              <Card dashed className="py-6 text-center text-sm text-muted">
                Esta moneda es digital: no existe en efectivo, así que no lleva
                billetes ni monedas. Conviértela a efectivo si necesitas
                denominaciones.
              </Card>
            ) : (
              <DenominationManager
                currency={displayCurrency}
                denominations={items}
              />
            )
          }
        />
      </PageBody>

      {!isDigital && (
        <PanelDrawer
          panel={NEW_DENOMINATION_PANEL}
          title="Nueva denominación"
          description={`Billete o moneda de ${currency.code}`}
        >
          <DenominationForm currency={displayCurrency} />
        </PanelDrawer>
      )}
    </Page>
  );
}
