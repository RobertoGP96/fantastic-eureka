import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, FolderOpen, Plus } from "lucide-react";
import { AccountActivityChart } from "@/components/account-activity-chart";
import { AccountEditForm } from "@/components/account-edit-form";
import { AccountManage } from "@/components/account-manage";
import { AccountSharePanel } from "@/components/account-share-panel";
import { DenominationAvailability } from "@/components/denomination-availability";
import { PanelDrawer } from "@/components/form-drawer";
import { PageBody, SplitLayout } from "@/components/page-body";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { TxList } from "@/components/tx-list";
import { Badge } from "@/components/ui/badge";
import { requireSessionUser } from "@/lib/auth";
import { activeShareForAccount } from "@/lib/shares";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { activityDeltas } from "@/lib/account-activity";
import { getAccountIcon } from "@/lib/account-icons";
import { fmtMinor } from "@/lib/format";
import { toTxRow } from "@/lib/tx-rows";
import {
  ACCOUNT_TYPE_LABELS,
  isCashLikeType,
  type AccountType,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

/** Drawer de edición (`/cuentas/[id]#panel=editar-cuenta`). */
const EDIT_ACCOUNT_PANEL = "editar-cuenta";

export default async function CuentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();

  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
    include: { currency: true, group: { select: { name: true } } },
  });
  if (!account) notFound();

  const [balanceMinor, transactions, groups, ledger, countCount, share] =
    await Promise.all([
      accountBalanceMinor(account.id),
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          OR: [{ accountId: account.id }, { counterAccountId: account.id }],
        },
        include: {
          account: { select: { name: true } },
          counterAccount: { select: { name: true } },
          currency: { select: { code: true, decimalPlaces: true } },
          counterCurrency: { select: { code: true, decimalPlaces: true } },
          category: { select: { name: true } },
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 30,
      }),
      prisma.accountGroup.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      // Libro mayor completo de la cuenta (campos mínimos) para el gráfico de
      // actividad; su longitud reemplaza al viejo count de movimientos.
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          OR: [{ accountId: account.id }, { counterAccountId: account.id }],
        },
        select: {
          accountId: true,
          counterAccountId: true,
          kind: true,
          amountMinor: true,
          counterAmountMinor: true,
          occurredAt: true,
        },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      }),
      prisma.cashCount.count({ where: { accountId: account.id } }),
      activeShareForAccount(user.id, account.id),
    ]);

  // Deltas {t, deltaMinor} livianos para el gráfico (el período se elige en
  // el cliente sin volver al servidor).
  const activity = activityDeltas(account.id, ledger);

  // Últimos movimientos en orden cronológico (el más reciente al final).
  const rows = transactions
    .map((tx) => toTxRow(tx, account.id, account.currency))
    .reverse();

  const Icon = getAccountIcon(account.icon, account.type);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={account.name} backHref="/cuentas">
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-xs font-medium tracking-wide text-white/80 uppercase">
              Saldo actual
            </div>
            <div
              className={`money mt-0.5 text-[28px] font-bold tracking-[-0.5px] ${
                balanceMinor < 0 ? "text-danger-soft" : ""
              }`}
            >
              {fmtMinor(balanceMinor, account.currency)}
            </div>
          </div>
          <Badge variant="neutral" className="mb-1.5 bg-white/15 text-white">
            {ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type}
            {account.archived ? " · Archivada" : ""}
          </Badge>
        </div>
      </ScreenHeader>

      <PageBody>
        {/* Archivada: /registrar y /conteo solo admiten cuentas activas; el
            enlace acababa preseleccionando en silencio otra cuenta. */}
        {!account.archived && (
          <div className="flex gap-2.5 md:max-w-md">
            <Link
              href={`/registrar?cuenta=${account.id}`}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <Plus className="size-4" />
              Registrar
            </Link>
            {isCashLikeType(account.type) && (
              <Link
                href={`/conteo/${account.id}`}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-input bg-card px-4 text-sm font-semibold text-ink-soft transition-colors hover:border-brand-ink hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <Banknote className="size-4" />
                Arqueo
              </Link>
            )}
          </div>
        )}

        <SplitLayout
          main={
            <>
              {activity.length > 0 && (
                <AccountActivityChart
                  deltas={activity}
                  currency={{
                    code: account.currency.code,
                    decimalPlaces: account.currency.decimalPlaces,
                  }}
                />
              )}

              {account.type === "CASH_BOX" && (
                <DenominationAvailability
                  userId={user.id}
                  accountId={account.id}
                  currency={account.currency}
                />
              )}

              <Section title="Movimientos recientes">
                {rows.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
                    Sin movimientos todavía.
                  </div>
                ) : (
                  <TxList rows={rows} />
                )}
              </Section>
            </>
          }
          aside={
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
                <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-heading">
                    {account.currency.code} · {account.currency.name}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <FolderOpen className="size-3 flex-none" />
                    <span className="truncate">
                      {account.group?.name ?? "Sin grupo"}
                    </span>
                  </div>
                </div>
              </div>

              <AccountManage
                accountId={account.id}
                name={account.name}
                archived={account.archived}
                hasUsage={ledger.length + countCount > 0}
                editPanel={EDIT_ACCOUNT_PANEL}
              />

              <AccountSharePanel
                accountId={account.id}
                accountName={account.name}
                share={
                  share
                    ? {
                        token: share.token,
                        expiresAt: share.expiresAt.toISOString(),
                      }
                    : null
                }
              />
            </>
          }
        />
      </PageBody>

      <PanelDrawer panel={EDIT_ACCOUNT_PANEL} title="Editar cuenta">
        <AccountEditForm
          accountId={account.id}
          name={account.name}
          icon={account.icon}
          groupId={account.groupId}
          groups={groups}
        />
      </PanelDrawer>
    </main>
  );
}
