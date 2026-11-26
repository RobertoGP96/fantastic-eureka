import { notFound } from "next/navigation";
import { CalendarClock, HandCoins, NotebookPen, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { ClosedDebtRow, DebtCard } from "@/components/debt-card";
import { DebtForm } from "@/components/debt-form";
import { PanelDrawer } from "@/components/form-drawer";
import { CardGrid, PageBody, SplitLayout } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { EndedPlanRow, PlanCard } from "@/components/plan-card";
import { PlanForm } from "@/components/plan-form";
import { HeaderStats, ScreenHeader } from "@/components/screen-header";
import { Card, Section } from "@/components/section";
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
import { fmtMinor } from "@/lib/format";
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

const PRIMARY_ACTION =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";
const SECONDARY_ACTION =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-input bg-card px-4 text-sm font-semibold whitespace-nowrap text-ink-soft transition-colors hover:border-brand-ink hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";

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

  const currencyById = new Map(debts.map((d) => [d.currencyId, d.currency]));
  const balances = contactBalances(debts);
  const stat = (label: string, pick: (b: (typeof balances)[number]) => number) => {
    const value = balances
      .filter((balance) => pick(balance) > 0)
      .map((balance) =>
        fmtMinor(pick(balance), currencyById.get(balance.currencyId)!)
      )
      .join(" · ");
    return value ? [{ label, value }] : [];
  };

  const self = { id: contact.id, name: contact.name };
  const others = formOptions.contacts.filter((c) => c.id !== contact.id);
  const isEmpty = debts.length === 0 && plans.length === 0;

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={contact.name} backHref="/contactos">
        <HeaderStats
          items={[
            ...stat("Te debe", (b) => b.receivableMinor),
            ...stat("Le debes", (b) => b.payableMinor),
          ]}
        />
        {balances.length === 0 && (
          <div className="mt-3 text-sm text-white/80">Sin saldo pendiente</div>
        )}
      </ScreenHeader>

      <PageBody>
        <SplitLayout
          asideFirst
          aside={
            <>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <PanelButton panel={NEW_DEBT_PANEL} className={PRIMARY_ACTION}>
                    <HandCoins className="size-4" />
                    Nueva deuda
                  </PanelButton>
                  <PanelButton
                    panel={NEW_PLAN_PANEL}
                    className={SECONDARY_ACTION}
                  >
                    <CalendarClock className="size-4" />
                    Mensualidad
                  </PanelButton>
                </div>
              </div>

              <Card className="flex flex-col gap-3">
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-3 text-sm font-semibold text-brand-ink hover:underline"
                  >
                    <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-chip">
                      <Phone className="size-4" />
                    </span>
                    <span className="min-w-0 truncate">{contact.phone}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-muted">
                    <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-app">
                      <Phone className="size-4" />
                    </span>
                    Sin teléfono
                  </div>
                )}
                {contact.note && (
                  <div className="flex items-start gap-3 text-sm text-ink-soft">
                    <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-app text-muted">
                      <NotebookPen className="size-4" />
                    </span>
                    <p className="min-w-0 pt-1.5 break-words whitespace-pre-line">
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
            </>
          }
          main={
            <>
              {isEmpty && (
                <p className="rounded-2xl border border-line bg-card px-4 py-8 text-center text-sm text-muted">
                  Todavía no hay deudas ni mensualidades con {contact.name}.
                </p>
              )}

              {openDebts.length > 0 && (
                <Section title="Deudas abiertas">
                  <CardGrid className="@5xl:grid-cols-2">
                    {openDebts.map((debt) => (
                      <DebtCard key={debt.id} debt={debt} hideContact />
                    ))}
                  </CardGrid>
                </Section>
              )}

              {activePlans.length > 0 && (
                <Section title="Mensualidades">
                  <CardGrid className="@5xl:grid-cols-2">
                    {activePlans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        accounts={formOptions.accounts}
                        hideContact
                      />
                    ))}
                  </CardGrid>
                </Section>
              )}

              {closedDebts.length + endedPlans.length > 0 && (
                <Section title="Historial">
                  <CardGrid className="gap-2 @2xl:gap-2.5 @5xl:grid-cols-2">
                    {closedDebts.map((debt) => (
                      <ClosedDebtRow key={debt.id} debt={debt} hideContact />
                    ))}
                    {endedPlans.map((plan) => (
                      <EndedPlanRow key={plan.id} plan={plan} hideContact />
                    ))}
                  </CardGrid>
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
    </main>
  );
}
