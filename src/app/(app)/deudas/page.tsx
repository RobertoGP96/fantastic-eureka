import { HandCoins, Plus } from "lucide-react";
import { ClosedDebtRow, DebtCard } from "@/components/debt-card";
import { DebtForm } from "@/components/debt-form";
import { EmptyState } from "@/components/empty-state";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { DebtsTabs } from "@/components/section-tabs";
import { StatGrid } from "@/components/stat-card";
import {
  TotalsStatCard,
  loneStatClass,
  type CurrencyTotal,
} from "@/components/totals-stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedLinks } from "@/components/ui/segmented";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { DEBT_CARD_INCLUDE, toDebtCard } from "@/lib/debt-cards";
import { type DebtDirection } from "@/lib/domain";
import { loadDebtFormOptions } from "@/lib/form-options";

export const dynamic = "force-dynamic";

/** Nombre del drawer de alta (`/deudas#panel=nueva-deuda`). */
const NEW_DEBT_PANEL = "nueva-deuda";

const FILTERS = [
  { value: "todas", label: "Todas", href: "/deudas" },
  { value: "cobrar", label: "Por cobrar", href: "/deudas?dir=cobrar" },
  { value: "pagar", label: "Por pagar", href: "/deudas?dir=pagar" },
] as const;

// Lista como UNA tarjeta con filas divididas (las filas no traen marco).
const LIST = "divide-y divide-line-2 overflow-hidden";

export default async function DeudasPage({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string }>;
}) {
  const user = await requireSessionUser();
  const { dir } = await searchParams;
  // Sin filtro por defecto: se ven TODAS las deudas, en ambas direcciones.
  const direction: DebtDirection | null =
    dir === "pagar" ? "PAYABLE" : dir === "cobrar" ? "RECEIVABLE" : null;

  // Sin filtro de estado: las saldadas/canceladas se quedan en el historial.
  // El filtro de dirección se aplica en memoria para que los KPIs («Me
  // deben» / «Debo») no dependan de la opción elegida.
  const [debts, formOptions] = await Promise.all([
    prisma.debt.findMany({
      where: { userId: user.id },
      include: DEBT_CARD_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    loadDebtFormOptions(user.id),
  ]);

  const all = debts.map(toDebtCard);
  const allOpen = all.filter((debt) => debt.status === "OPEN");
  const visible = direction
    ? all.filter((debt) => debt.direction === direction)
    : all;
  const open = visible.filter((debt) => debt.status === "OPEN");
  const closed = visible.filter((debt) => debt.status !== "OPEN");

  // Pendiente por moneda de TODAS las deudas abiertas de una dirección, de
  // mayor a menor.
  const totalsFor = (wanted: DebtDirection): CurrencyTotal[] => {
    const totals = new Map<string, CurrencyTotal>();
    for (const debt of allOpen) {
      if (debt.direction !== wanted) continue;
      const entry = totals.get(debt.currencyId);
      if (entry) entry.amountMinor += debt.remainingMinor;
      else
        totals.set(debt.currencyId, {
          amountMinor: debt.remainingMinor,
          currency: debt.currency,
        });
    }
    return [...totals.values()].sort((a, b) => b.amountMinor - a.amountMinor);
  };
  const receivableTotals = totalsFor("RECEIVABLE");
  const payableTotals = totalsFor("PAYABLE");
  const loneStat = loneStatClass(receivableTotals, payableTotals);

  return (
    <Page>
      <ScreenHeader
        title="Deudas"
        subtitle={`${allOpen.length} abierta${allOpen.length === 1 ? "" : "s"}`}
        actions={
          <PanelButton
            panel={NEW_DEBT_PANEL}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-3.5" />
            Nueva deuda
          </PanelButton>
        }
      />

      <PageBody>
        <DebtsTabs current="/deudas" />

        {(receivableTotals.length > 0 || payableTotals.length > 0) && (
          <StatGrid cols={2}>
            <TotalsStatCard
              label="Me deben"
              totals={receivableTotals}
              className={loneStat}
            />
            <TotalsStatCard
              label="Debo"
              totals={payableTotals}
              className={loneStat}
            />
          </StatGrid>
        )}

        {all.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Sin deudas registradas"
            description="Anota lo que te deben o lo que debes para llevar el control de abonos y vencimientos."
            cta={
              <PanelButton
                panel={NEW_DEBT_PANEL}
                className={buttonVariants()}
              >
                Nueva deuda
              </PanelButton>
            }
          />
        ) : (
          <>
            <SegmentedLinks
              ariaLabel="Filtrar deudas"
              options={FILTERS}
              current={
                direction === "PAYABLE"
                  ? "pagar"
                  : direction === "RECEIVABLE"
                    ? "cobrar"
                    : "todas"
              }
              className="self-start"
            />

            {visible.length === 0 ? (
              <Card className="py-6 text-center text-sm text-muted">
                No hay deudas{" "}
                {direction === "PAYABLE" ? "por pagar" : "por cobrar"}.
              </Card>
            ) : (
              open.length > 0 && (
                <Card padding="none" className={LIST}>
                  {open.map((debt) => (
                    <DebtCard key={debt.id} debt={debt} />
                  ))}
                </Card>
              )
            )}
          </>
        )}

        {closed.length > 0 && (
          <Section title="Historial">
            <Card padding="none" className={LIST}>
              {closed.map((debt) => (
                <ClosedDebtRow key={debt.id} debt={debt} />
              ))}
            </Card>
          </Section>
        )}
      </PageBody>

      <PanelDrawer
        panel={NEW_DEBT_PANEL}
        title="Nueva deuda"
        description="Anota lo que te deben o lo que debes."
      >
        <DebtForm {...formOptions} />
      </PanelDrawer>
    </Page>
  );
}
