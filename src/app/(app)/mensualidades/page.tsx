import { CalendarClock, Plus } from "lucide-react";
import { EMPTY_STATE_CTA, EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/filter-chips";
import { PanelDrawer } from "@/components/form-drawer";
import { CardGrid, PageBody } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { EndedPlanRow, PlanCard } from "@/components/plan-card";
import { PlanForm } from "@/components/plan-form";
import {
  HEADER_ACTION,
  HeaderPill,
  HeaderStats,
  ScreenHeader,
} from "@/components/screen-header";
import { Section } from "@/components/section";
import { DebtsTabs } from "@/components/section-tabs";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { PLAN_CARD_INCLUDE, toPlanCard } from "@/lib/debt-cards";
import { type PlanKind } from "@/lib/domain";
import { loadDebtFormOptions } from "@/lib/form-options";
import { fmtMinor } from "@/lib/format";
import {
  comparePlansByUrgency,
  monthlyCommitmentByCurrency,
} from "@/lib/plans-core";

export const dynamic = "force-dynamic";

/** Nombre del drawer de alta (`/mensualidades#panel=nueva-mensualidad`). */
const NEW_PLAN_PANEL = "nueva-mensualidad";

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
    // Sus cuentas sirven también para saldar cuotas desde las tarjetas.
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
  // Sobre TODOS los activos: no depende del chip de filtro.
  const currencyById = new Map(all.map((plan) => [plan.currencyId, plan.currency]));
  const totalsText = (kind: PlanKind) =>
    monthlyCommitmentByCurrency(allActive.filter((plan) => plan.kind === kind))
      .map((total) => {
        const currency = currencyById.get(total.currencyId);
        return currency ? fmtMinor(total.amountMinor, currency) : null;
      })
      .filter(Boolean)
      .join(" · ");
  const payText = totalsText("PAY");
  const collectText = totalsText("COLLECT");
  const overdueCount = allActive.filter((plan) => plan.overdue).length;

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title="Mensualidades"
        actions={
          <PanelButton panel={NEW_PLAN_PANEL} className={HEADER_ACTION}>
            <Plus className="size-3.5" />
            Nueva
          </PanelButton>
        }
      >
        <HeaderStats
          items={[
            ...(payText ? [{ label: "Pago al mes", value: payText }] : []),
            ...(collectText
              ? [{ label: "Cobro al mes", value: collectText }]
              : []),
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <HeaderPill>
            {allActive.length} activa{allActive.length === 1 ? "" : "s"}
          </HeaderPill>
          {overdueCount > 0 && (
            <HeaderPill tone="danger">
              {overdueCount} con cuota vencida
            </HeaderPill>
          )}
        </div>
      </ScreenHeader>

      <PageBody>
        <DebtsTabs current="/mensualidades" />

        <FilterChips
          items={[
            {
              href: "/mensualidades",
              label: "Todas",
              active: kindFilter === null,
            },
            {
              href: "/mensualidades?tipo=pagar",
              label: "Que pago",
              active: kindFilter === "PAY",
            },
            {
              href: "/mensualidades?tipo=cobrar",
              label: "Que cobro",
              active: kindFilter === "COLLECT",
            },
          ]}
        />

        {all.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Sin mensualidades"
            description="Renta, suscripciones, cuotas fijas… crea una y te avisamos de cada vencimiento."
            cta={
              <PanelButton panel={NEW_PLAN_PANEL} className={EMPTY_STATE_CTA}>
                Nueva mensualidad
              </PanelButton>
            }
          />
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
            No hay mensualidades {kindFilter === "PAY" ? "que pagues" : "que cobres"}.
          </p>
        ) : active.length > 0 ? (
          <CardGrid>
            {active.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                accounts={formOptions.accounts}
              />
            ))}
          </CardGrid>
        ) : null}

        {ended.length > 0 && (
          <Section title="Finalizadas">
            <CardGrid className="gap-2 @2xl:gap-2.5">
              {ended.map((plan) => (
                <EndedPlanRow key={plan.id} plan={plan} />
              ))}
            </CardGrid>
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
    </main>
  );
}
