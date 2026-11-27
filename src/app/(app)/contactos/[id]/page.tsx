import { notFound } from "next/navigation";
import { CalendarClock, NotebookPen, Phone, Plus } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { SplitLayout } from "@/components/content-grid";
import { ClosedDebtRow, DebtCard } from "@/components/debt-card";
import { DebtForm } from "@/components/debt-form";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { EndedPlanRow, PlanCard } from "@/components/plan-card";
import { PlanForm } from "@/components/plan-form";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { StatGrid } from "@/components/stat-card";
import {
  TotalsStatCard,
  loneStatClass,
  type CurrencyTotal,
} from "@/components/totals-stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { contactBalances } from "@/lib/contacts-core";
import {
  DEBT_CARD_INCLUDE,
  PLAN_CARD_INCLUDE,
  toDebtCard,
  toPlanCard,
} from "@/lib/debt-cards";
import { loadDebtFormOptions } from "@/lib/form-options";
import { comparePlansByUrgency } from "@/lib/plans-core";
import { ContactActionsMenu } from "./contact-actions-menu";
import { MergeContactForm } from "./merge-contact-form";
import {
  EDIT_CONTACT_PANEL,
  MERGE_CONTACT_PANEL,
  NEW_DEBT_PANEL,
  NEW_PLAN_PANEL,
} from "./panels";

export const dynamic = "force-dynamic";

// Lista como UNA tarjeta con filas divididas (las filas no traen marco).
const LIST = "divide-y divide-line-2 overflow-hidden";
// Tesela de icono de la tarjeta de datos.
const INFO_ICON = "flex size-9 flex-none items-center justify-center rounded-xl";

/** «2 deudas abiertas», «1 mensualidad»… */
const countLabel = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export default async function ContactoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, userId: user.id },
  });
  if (!contact) notFound();

  const [debtRows, planRows, formOptions] = await Promise.all([
    prisma.debt.findMany({
      where: { userId: user.id, contactId: contact.id },
      include: DEBT_CARD_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    // Sus mensualidades propias y las de sus deudas.
    prisma.paymentPlan.findMany({
      where: {
        userId: user.id,
        OR: [{ contactId: contact.id }, { debt: { contactId: contact.id } }],
      },
      include: PLAN_CARD_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    loadDebtFormOptions(user.id),
  ]);

  const debts = debtRows.map(toDebtCard);
  const plans = planRows.map(toPlanCard);
  const openDebts = debts.filter((debt) => debt.status === "OPEN");
  const closedDebts = debts.filter((debt) => debt.status !== "OPEN");
  const activePlans = plans
    .filter((plan) => plan.active)
    .sort(comparePlansByUrgency);
  const endedPlans = plans.filter((plan) => !plan.active);
  // Las que quedarían «Sin contacto» al eliminarlo (las de deudas no cuentan:
  // con deudas no se puede eliminar).
  const loosePlanCount = planRows.filter((plan) => !plan.debtId).length;

  // Saldo pendiente por moneda, separado en «me debe» y «le debo».
  const currencyById = new Map(debts.map((d) => [d.currencyId, d.currency]));
  const balances = contactBalances(debts);
  const totalsFor = (
    pick: (balance: (typeof balances)[number]) => number
  ): CurrencyTotal[] =>
    balances.flatMap((balance) => {
      const currency = currencyById.get(balance.currencyId);
      const amountMinor = pick(balance);
      return currency && amountMinor > 0 ? [{ amountMinor, currency }] : [];
    });
  const receivableTotals = totalsFor((b) => b.receivableMinor);
  const payableTotals = totalsFor((b) => b.payableMinor);
  const loneStat = loneStatClass(receivableTotals, payableTotals);

  const self = { id: contact.id, name: contact.name };
  const others = formOptions.contacts.filter((c) => c.id !== contact.id);
  const isEmpty = debts.length === 0 && plans.length === 0;

  const summary = [
    openDebts.length > 0 &&
      countLabel(openDebts.length, "deuda abierta", "deudas abiertas"),
    activePlans.length > 0 &&
      countLabel(activePlans.length, "mensualidad", "mensualidades"),
  ].filter(Boolean);

  return (
    <Page>
      <ScreenHeader
        title={contact.name}
        subtitle={
          summary.length > 0 ? summary.join(" · ") : "Sin saldo pendiente"
        }
        backHref="/contactos"
        actions={
          <>
            <PanelButton
              panel={NEW_PLAN_PANEL}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <CalendarClock className="size-3.5" />
              Mensualidad
            </PanelButton>
            <PanelButton
              panel={NEW_DEBT_PANEL}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-3.5" />
              Nueva deuda
            </PanelButton>
          </>
        }
      />

      <PageBody>
        {(receivableTotals.length > 0 || payableTotals.length > 0) && (
          <StatGrid cols={2}>
            <TotalsStatCard
              label="Te debe"
              totals={receivableTotals}
              className={loneStat}
            />
            <TotalsStatCard
              label="Le debes"
              totals={payableTotals}
              className={loneStat}
            />
          </StatGrid>
        )}

        <SplitLayout
          asideFirst
          aside={
            <Card className="flex flex-col gap-3">
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-3 text-sm font-medium text-brand-ink hover:text-brand-mid"
                >
                  <span className={`${INFO_ICON} bg-chip`}>
                    <Phone className="size-4" />
                  </span>
                  <span className="min-w-0 truncate">{contact.phone}</span>
                </a>
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted">
                  <span className={`${INFO_ICON} bg-subtle`}>
                    <Phone className="size-4" />
                  </span>
                  Sin teléfono
                </div>
              )}
              {contact.note && (
                <div className="flex items-start gap-3 text-sm text-ink-soft">
                  <span className={`${INFO_ICON} bg-subtle`}>
                    <NotebookPen className="size-4" />
                  </span>
                  <p className="min-w-0 pt-2 break-words whitespace-pre-line">
                    {contact.note}
                  </p>
                </div>
              )}
              <div className="border-t border-line-2 pt-2">
                <ContactActionsMenu
                  contactId={contact.id}
                  contactName={contact.name}
                  debtCount={debts.length}
                  planCount={loosePlanCount}
                  canMerge={others.length > 0}
                />
              </div>
            </Card>
          }
          main={
            <>
              {isEmpty && (
                <Card className="py-8 text-center text-sm text-muted">
                  Todavía no hay deudas ni mensualidades con {contact.name}.
                </Card>
              )}

              {/* Las filas van en la columna principal (más estrecha que la
                  página): `stacked` las deja en dos líneas y el formulario
                  de saldar de cada mensualidad queda debajo de su fila. */}
              {openDebts.length > 0 && (
                <Section title="Deudas abiertas">
                  <Card padding="none" className={LIST}>
                    {openDebts.map((debt) => (
                      <DebtCard key={debt.id} debt={debt} hideContact stacked />
                    ))}
                  </Card>
                </Section>
              )}

              {activePlans.length > 0 && (
                <Section title="Mensualidades">
                  <Card padding="none" className={LIST}>
                    {activePlans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        accounts={formOptions.accounts}
                        hideContact
                      />
                    ))}
                  </Card>
                </Section>
              )}

              {closedDebts.length + endedPlans.length > 0 && (
                <Section title="Historial">
                  <Card padding="none" className={LIST}>
                    {closedDebts.map((debt) => (
                      <ClosedDebtRow key={debt.id} debt={debt} hideContact />
                    ))}
                    {endedPlans.map((plan) => (
                      <EndedPlanRow key={plan.id} plan={plan} hideContact />
                    ))}
                  </Card>
                </Section>
              )}
            </>
          }
        />
      </PageBody>

      <PanelDrawer
        panel={NEW_DEBT_PANEL}
        title="Nueva deuda"
        description={`Con ${contact.name}`}
      >
        <DebtForm {...formOptions} fixedContact={self} />
      </PanelDrawer>
      <PanelDrawer
        panel={NEW_PLAN_PANEL}
        title="Nueva mensualidad"
        description={`Con ${contact.name}`}
      >
        <PlanForm {...formOptions} fixedContact={self} />
      </PanelDrawer>
      <PanelDrawer panel={EDIT_CONTACT_PANEL} title="Editar contacto">
        <ContactForm
          contact={{
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            note: contact.note,
          }}
        />
      </PanelDrawer>
      <PanelDrawer
        panel={MERGE_CONTACT_PANEL}
        title="Fusionar contacto"
        description="Para juntar duplicados en uno solo."
      >
        <MergeContactForm source={self} candidates={others} />
      </PanelDrawer>
    </Page>
  );
}
