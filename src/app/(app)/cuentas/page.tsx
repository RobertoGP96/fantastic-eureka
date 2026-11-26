import Link from "next/link";
import { Archive, FolderOpen, Plus, Wallet } from "lucide-react";
import { AccountForm } from "@/components/account-form";
import { EMPTY_STATE_CTA, EmptyState } from "@/components/empty-state";
import { PanelDrawer } from "@/components/form-drawer";
import { GroupManager } from "@/components/group-manager";
import { CardGrid, PageBody } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { HEADER_ACTION, ScreenHeader } from "@/components/screen-header";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  latestRatesByCurrency,
  listAccountsWithBalances,
  type AccountWithBalance,
} from "@/lib/balances";
import { totalsByCurrency } from "@/lib/balances-core";
import { fmtMinor } from "@/lib/format";
import { convertMinor } from "@/lib/money";
import { AccountCard } from "./account-card";

export const dynamic = "force-dynamic";

/** Drawers de la página (`/cuentas#panel=…`). */
const NEW_ACCOUNT_PANEL = "nueva-cuenta";
const GROUPS_PANEL = "grupos";

const TOOLBAR_BUTTON =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-card px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

interface AccountSection {
  key: string;
  name: string | null;
  accounts: AccountWithBalance[];
  subtotalMinor: number | null;
}

export default async function CuentasPage() {
  const user = await requireSessionUser();
  const [accounts, groups, currencies, rates, archivedCount] =
    await Promise.all([
      listAccountsWithBalances(user.id),
      prisma.accountGroup.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { accounts: true } },
        },
      }),
      // Monedas activas: alimentan el formulario de alta (drawer).
      prisma.currency.findMany({
        where: { active: true, userId: user.id },
        orderBy: [{ isBase: "desc" }, { code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          kind: true,
          isBase: true,
          decimalPlaces: true,
        },
      }),
      latestRatesByCurrency(user.id),
      prisma.account.count({ where: { userId: user.id, archived: true } }),
    ]);
  // La base puede estar oculta (inactiva): se busca aparte si no vino.
  const base =
    currencies.find((currency) => currency.isBase) ??
    (await prisma.currency.findFirst({
      where: { isBase: true, userId: user.id },
    }));

  const sections: AccountSection[] =
    groups.length > 0
      ? [
          ...groups.map((group) => ({
            key: group.id,
            name: group.name,
            accounts: accounts.filter((a) => a.group?.id === group.id),
            subtotalMinor: null,
          })),
          {
            key: "none",
            name: "Sin grupo",
            accounts: accounts.filter((a) => !a.group),
            subtotalMinor: null,
          },
        ]
      : [{ key: "all", name: null, accounts, subtotalMinor: null }];

  const visible = sections.filter((section) => section.accounts.length > 0);

  // Subtotal por grupo consolidado a la base; se omite si falta alguna tasa.
  if (base) {
    for (const section of visible) {
      let subtotal = 0;
      let complete = true;
      for (const account of section.accounts) {
        if (account.currency.id === base.id) {
          subtotal += account.balanceMinor;
        } else {
          const rate = rates.get(account.currency.id);
          if (rate) {
            subtotal += convertMinor(
              account.balanceMinor,
              account.currency,
              base,
              rate.rateScaled
            );
          } else if (account.balanceMinor !== 0) {
            complete = false;
            break;
          }
        }
      }
      section.subtotalMinor = complete ? subtotal : null;
    }
  }

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title="Cuentas"
        actions={
          <PanelButton panel={NEW_ACCOUNT_PANEL} className={HEADER_ACTION}>
            <Plus className="size-3.5" />
            Nueva cuenta
          </PanelButton>
        }
      />

      <PageBody>
        <div className="flex flex-wrap justify-end gap-2">
          {archivedCount > 0 && (
            <Link href="/cuentas/archivadas" className={TOOLBAR_BUTTON}>
              <Archive className="size-3.5" />
              Archivadas ({archivedCount})
            </Link>
          )}
          <PanelButton panel={GROUPS_PANEL} className={TOOLBAR_BUTTON}>
            <FolderOpen className="size-3.5" />
            Grupos
          </PanelButton>
        </div>

        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Sin cuentas todavía"
            description="Crea tu primera cuenta o caja para empezar a registrar movimientos."
            cta={
              <PanelButton
                panel={NEW_ACCOUNT_PANEL}
                className={EMPTY_STATE_CTA}
              >
                Crear cuenta
              </PanelButton>
            }
          />
        ) : (
          visible.map((section) => {
            // Totales por cada divisa usada en el grupo (sin conversión):
            // visibles aunque falten tasas para el consolidado en base. Si el
            // grupo entero está en la base, el consolidado ya es exacto y los
            // chips serían redundantes.
            const currencyTotals = totalsByCurrency(section.accounts);
            const onlyBase =
              currencyTotals.length === 1 &&
              currencyTotals[0].currency.id === base?.id;
            return (
              <section key={section.key}>
                {section.name && (
                  <div className="mb-2 flex flex-col gap-1">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-sm font-bold text-heading">
                        {section.name}
                      </h2>
                      {base && section.subtotalMinor !== null && (
                        <span
                          className="money text-xs font-semibold text-muted"
                          title={`Consolidado en ${base.code}`}
                        >
                          {onlyBase ? "" : "≈ "}
                          {fmtMinor(section.subtotalMinor, base)}
                        </span>
                      )}
                    </div>
                    {!onlyBase && currencyTotals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {currencyTotals.map((total) => (
                          <span
                            key={total.currency.id}
                            className={`money rounded-full bg-chip px-2.5 py-0.5 text-[11px] font-semibold ${
                              total.totalMinor < 0
                                ? "text-danger"
                                : "text-brand-ink"
                            }`}
                          >
                            {fmtMinor(total.totalMinor, total.currency)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <CardGrid>
                  {section.accounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </CardGrid>
              </section>
            );
          })
        )}
      </PageBody>

      <PanelDrawer panel={NEW_ACCOUNT_PANEL} title="Nueva cuenta">
        <AccountForm
          currencies={currencies.map(({ id, code, name, kind }) => ({
            id,
            code,
            name,
            kind,
          }))}
          groups={groups.map(({ id, name }) => ({ id, name }))}
        />
      </PanelDrawer>
      <PanelDrawer
        panel={GROUPS_PANEL}
        title="Grupos de cuentas"
        description="Organiza tus cuentas. Al eliminar un grupo, sus cuentas pasan a «Sin grupo»."
      >
        <GroupManager
          groups={groups.map((group) => ({
            id: group.id,
            name: group.name,
            accountCount: group._count.accounts,
          }))}
        />
      </PanelDrawer>
    </main>
  );
}
