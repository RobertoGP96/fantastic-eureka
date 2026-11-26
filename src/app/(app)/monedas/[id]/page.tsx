import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { DenominationForm } from "@/components/denomination-form";
import { PanelDrawer } from "@/components/form-drawer";
import { PageBody, SplitLayout } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { HEADER_ACTION, ScreenHeader } from "@/components/screen-header";
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

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title={`${currency.code} · ${currency.name}`}
        backHref="/monedas"
        actions={
          // Una moneda digital no lleva billetes ni monedas.
          !isDigital && (
            <PanelButton
              panel={NEW_DENOMINATION_PANEL}
              className={HEADER_ACTION}
            >
              <Plus className="size-3.5" />
              Nueva
            </PanelButton>
          )
        }
      >
        <p className="mt-1 text-sm text-white/80">
          {currency.decimalPlaces} decimales
          {currency.isBase ? " · Moneda base" : ""}
          {isDigital
            ? " · Digital (sin efectivo)"
            : currency.denominations.length === 0
              ? " · Sin denominaciones"
              : ""}
        </p>
      </ScreenHeader>

      <PageBody>
        <SplitLayout
          asideFirst
          aside={
            <CurrencyKindEditor currencyId={currency.id} kind={currency.kind} />
          }
          main={
            isDigital ? (
              <p className="rounded-2xl border border-line bg-card px-4 py-5 text-center text-sm text-muted">
                Esta moneda es digital: no existe en efectivo, así que no lleva
                billetes ni monedas. Conviértela a efectivo si necesitas
                denominaciones.
              </p>
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
    </main>
  );
}
