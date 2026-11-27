import { CalendarClock, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import {
  EndedPlanRow,
  PlanCard,
  planCanSettle,
} from "@/components/plan-card";
import { PlanForm } from "@/components/plan-form";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { DebtsTabs } from "@/components/section-tabs";
import { StatGrid } from "@/components/stat-card";
import {
  TotalsStatCard,
  loneStatClass,
  type CurrencyTotal,
} from "@/components/totals-stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedLinks } from "@/components/ui/segmented";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { PLAN_CARD_INCLUDE, toPlanCard } from "@/lib/debt-cards";
import { type PlanKind } from "@/lib/domain";
import { loadDebtFormOptions } from "@/lib/form-options";
import {
  comparePlansByUrgency,
  monthlyCommitmentByCurrency,
} from "@/lib/plans-core";

export const dynamic = "force-dynamic";

/** Nombre del drawer de alta (`/mensualidades#panel=nueva-mensualidad`). */
const NEW_PLAN_PANEL = "nueva-mensualidad";

const FILTERS = [
  { value: "todas", label: "Todas", href: "/mensualidades" },
  { value: "pagar", label: "Que pago", href: "/mensualidades?tipo=pagar" },
  { value: "cobrar", label: "Que cobro", href: "/mensualidades?tipo=cobrar" },
] as const;

// Lista como UNA tarjeta con filas divididas (las filas no traen marco).
const LIST = "divide-y divide-line-2 overflow-hidden";

export default async function MensualidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireSessionUser();
  const { tipo } = await searchParams;
  const kindFilter: PlanKind | null =
    tipo === "pagar" ? "PAY" : tipo === "cobrar" ? "COLLECT" : null;

  const [plans, formOptions] = await Promise.all([
    prisma.paymentPlan.findMany({
      where: { userId: user.id },
      include: PLAN_CARD_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    // Sus cuentas sirven también para saldar cuotas desde las filas.
    loadDebtFormOptions(user.id),
  ]);

  const all = plans.map(toPlanCard);
  const allActive = all.filter((plan) => plan.active);
  const visible = kindFilter
    ? all.filter((plan) => plan.kind === kindFilter)
    : all;
  const active = visible
    .filter((plan) => plan.active)
    .sort(comparePlansByUrgency);
  const ended = visible.filter((plan) => !plan.active);

  // Compromiso mensual: el equivalente a un mes de cada plan activo,
  // separado por dirección porque uno sale de las cuentas y el otro entra.
  // Sobre TODOS los activos: no depende del filtro elegido.
  const currencyById = new Map(
    all.map((plan) => [plan.currencyId, plan.currency])
  );
  const totalsFor = (kind: PlanKind): CurrencyTotal[] =>
    monthlyCommitmentByCurrency(
      allActive.filter((plan) => plan.kind === kind)
    ).flatMap((total) => {
      const currency = currencyById.get(total.currencyId);
      return currency ? [{ amountMinor: total.amountMinor, currency }] : [];
    });
  const payTotals = totalsFor("PAY");
  const collectTotals = totalsFor("COLLECT");
  const loneStat = loneStatClass(payTotals, collectTotals);
  const overdueCount = allActive.filter((plan) => plan.overdue).length;
  // En escritorio el formulario de saldar va a la derecha de su fila. Si
  // alguna lo lleva, TODAS reservan esa columna: así los montos quedan
  // alineados entre filas con y sin formulario.
  const settleColumn = active.some(planCanSettle);

  return (
    <Page>
      <ScreenHeader
        title="Mensualidades"
        subtitle={`${allActive.length} activa${allActive.length === 1 ? "" : "s"}`}
        actions={
          <PanelButton
            panel={NEW_PLAN_PANEL}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-3.5" />
            Nueva mensualidad
          </PanelButton>
        }
      >
        {overdueCount > 0 && (
          <Badge variant="danger">{overdueCount} con cuota vencida</Badge>
        )}
      </ScreenHeader>

      <PageBody>
        <DebtsTabs current="/mensualidades" />

        {(payTotals.length > 0 || collectTotals.length > 0) && (
          <StatGrid cols={2}>
            <TotalsStatCard
              label="Pago al mes"
              totals={payTotals}
              className={loneStat}
            />
            <TotalsStatCard
              label="Cobro al mes"
              totals={collectTotals}
              className={loneStat}
            />
          </StatGrid>
        )}

        {all.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Sin mensualidades"
            description="Renta, suscripciones, cuotas fijas… crea una y te avisamos de cada vencimiento."
            cta={
              <PanelButton
                panel={NEW_PLAN_PANEL}
                className={buttonVariants()}
              >
                Nueva mensualidad
              </PanelButton>
            }
          />
        ) : (
          <>
            <SegmentedLinks
              ariaLabel="Filtrar mensualidades"
              options={FILTERS}
              current={
                kindFilter === "PAY"
                  ? "pagar"
                  : kindFilter === "COLLECT"
                    ? "cobrar"
                    : "todas"
              }
              className="self-start"
            />

            {visible.length === 0 ? (
              <Card className="py-6 text-center text-sm text-muted">
                No hay mensualidades{" "}
                {kindFilter === "PAY" ? "que pagues" : "que cobres"}.
              </Card>
            ) : (
              active.length > 0 && (
                <Card padding="none" className={LIST}>
                  {active.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      accounts={formOptions.accounts}
                      settleColumn={settleColumn}
                    />
                  ))}
                </Card>
              )
            )}
          </>
        )}

        {ended.length > 0 && (
          <Section title="Finalizadas">
            <Card padding="none" className={LIST}>
              {ended.map((plan) => (
                <EndedPlanRow key={plan.id} plan={plan} />
              ))}
            </Card>
          </Section>
        )}
      </PageBody>

      <PanelDrawer
        panel={NEW_PLAN_PANEL}
        title="Nueva mensualidad"
        description="Un cobro o pago que se repite: renta, suscripción, cuota fija…"
      >
        <PlanForm {...formOptions} />
      </PanelDrawer>
    </Page>
  );
}
