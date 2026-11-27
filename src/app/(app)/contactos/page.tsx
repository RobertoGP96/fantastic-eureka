import { Plus, UsersRound } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { EmptyState } from "@/components/empty-state";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { ScreenHeader } from "@/components/screen-header";
import { DebtsTabs } from "@/components/section-tabs";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { contactBalances } from "@/lib/contacts-core";
import { fmtMinor } from "@/lib/format";
import { ContactsBrowser, type ContactRow } from "./contacts-browser";

export const dynamic = "force-dynamic";

/** Nombre del drawer de alta (`/contactos#panel=nuevo-contacto`). */
const NEW_CONTACT_PANEL = "nuevo-contacto";

const BY_NAME = new Intl.Collator("es", { sensitivity: "base" });

export default async function ContactosPage() {
  const user = await requireSessionUser();

  const [contacts, currencies] = await Promise.all([
    prisma.contact.findMany({
      where: { userId: user.id },
      include: {
        debts: {
          select: {
            direction: true,
            status: true,
            currencyId: true,
            totalMinor: true,
            payments: { select: { amountMinor: true } },
          },
        },
        _count: { select: { plans: { where: { active: true } } } },
      },
    }),
    prisma.currency.findMany({
      where: { userId: user.id },
      select: { id: true, code: true, decimalPlaces: true },
    }),
  ]);
  const currencyById = new Map(currencies.map((c) => [c.id, c]));

  const rows: ContactRow[] = contacts
    .map((contact) => {
      const balances = contactBalances(
        contact.debts.map((debt) => ({
          direction: debt.direction,
          status: debt.status,
          currencyId: debt.currencyId,
          totalMinor: debt.totalMinor,
          paidMinor: debt.payments.reduce((sum, p) => sum + p.amountMinor, 0),
        }))
      );
      const format = (currencyId: string, amount: number) => {
        const currency = currencyById.get(currencyId);
        return currency ? fmtMinor(amount, currency) : null;
      };
      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        receivable: balances
          .filter((b) => b.receivableMinor > 0)
          .map((b) => format(b.currencyId, b.receivableMinor))
          .filter((text): text is string => text !== null),
        payable: balances
          .filter((b) => b.payableMinor > 0)
          .map((b) => format(b.currencyId, b.payableMinor))
          .filter((text): text is string => text !== null),
        openDebts: contact.debts.filter((debt) => debt.status === "OPEN")
          .length,
        activePlans: contact._count.plans,
      };
    })
    // Primero los que tienen algo pendiente; dentro, alfabético.
    .sort((a, b) => {
      const pending = (row: ContactRow) =>
        row.receivable.length + row.payable.length > 0 ? 0 : 1;
      return pending(a) - pending(b) || BY_NAME.compare(a.name, b.name);
    });

  const withBalance = rows.filter(
    (row) => row.receivable.length + row.payable.length > 0
  ).length;

  return (
    <Page>
      <ScreenHeader
        title="Contactos"
        subtitle={`${rows.length} contacto${rows.length === 1 ? "" : "s"}${
          withBalance > 0 ? ` · ${withBalance} con saldo pendiente` : ""
        }`}
        actions={
          <PanelButton
            panel={NEW_CONTACT_PANEL}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-3.5" />
            Nuevo contacto
          </PanelButton>
        }
      />

      <PageBody>
        <DebtsTabs current="/contactos" />

        {rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Sin contactos"
            description="Las personas a las que les debes o que te deben. Se crean solas al anotar una deuda, o puedes añadirlas aquí."
            cta={
              <PanelButton
                panel={NEW_CONTACT_PANEL}
                className={buttonVariants()}
              >
                Nuevo contacto
              </PanelButton>
            }
          />
        ) : (
          <ContactsBrowser contacts={rows} />
        )}
      </PageBody>

      <PanelDrawer panel={NEW_CONTACT_PANEL} title="Nuevo contacto">
        <ContactForm />
      </PanelDrawer>
    </Page>
  );
}
