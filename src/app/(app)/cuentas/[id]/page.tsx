import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Plus } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TxList } from "@/components/tx-list";
import { GroupSelect } from "@/components/group-select";
import { AccountIconEditor } from "@/components/account-icon-editor";
import { AccountEditor } from "@/components/account-editor";
import { AccountSharePanel } from "@/components/account-share-panel";
import { requireSessionUser } from "@/lib/auth";
import { activeShareForAccount } from "@/lib/shares";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { activityDeltas } from "@/lib/account-activity";
import { fmtMinorParts } from "@/lib/format";
import { toTxRow } from "@/lib/tx-rows";
import { AccountActivityChart } from "@/components/account-activity-chart";
import {
  ACCOUNT_TYPE_LABELS,
  isCashLikeType,
  type AccountType,
} from "@/lib/domain";
import { DenominationAvailability } from "@/components/denomination-availability";

export const dynamic = "force-dynamic";

// Icono de las acciones de cabecera: se oculta cuando la columna es estrecha
// para que en un móvil quede sitio para el nombre de la cuenta.
const ACTION_ICON = "hidden size-3.5 @xl/main:block";

export default async function CuentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();

  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
    include: { currency: true },
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

  const balance = fmtMinorParts(balanceMinor, account.currency);
  const typeLabel =
    ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type;

  return (
    <Page>
      <ScreenHeader
        title={account.name}
        subtitle={`${typeLabel} · ${account.currency.code}`}
        backHref="/cuentas"
        actions={
          // Archivada: /registrar y /conteo solo admiten cuentas activas; el
          // enlace acababa preseleccionando en silencio otra cuenta.
          !account.archived && (
            <>
              {isCashLikeType(account.type) && (
                <Link
                  href={`/conteo/${account.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Banknote className={ACTION_ICON} />
                  Arqueo
                </Link>
              )}
              <Link
                href={`/registrar?cuenta=${account.id}`}
                className={buttonVariants({ size: "sm" })}
              >
                <Plus className={ACTION_ICON} />
                Registrar
              </Link>
            </>
          )
        }
      >
        {account.archived && <Badge>Archivada</Badge>}
      </ScreenHeader>

      <PageBody>
        {/* Las columnas y las tarjetas son <div>: el único <section> que
            envuelve «Movimientos recientes» es el suyo (lo exigen los tests). */}
        <div className="grid gap-5 @4xl/main:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 @4xl/main:col-span-8">
            {/* «Saldo actual» aparece UNA sola vez y lo pinta StatCard: el
                helper E2E saldoActual() sube al padre del rótulo y espera
                encontrar ahí el monto. */}
            <StatCard
              size="lg"
              label="Saldo actual"
              value={balance.amount}
              unit={balance.code}
              tone={balanceMinor < 0 ? "danger" : "default"}
            />

            {activity.length > 0 && (
              <AccountActivityChart
                deltas={activity}
                currency={{
                  code: account.currency.code,
                  decimalPlaces: account.currency.decimalPlaces,
                }}
              />
            )}

            <section>
              <SectionHeader title="Movimientos recientes" />
              {rows.length === 0 ? (
                <Card className="py-6 text-center text-sm text-muted">
                  Sin movimientos todavía.
                </Card>
              ) : (
                <TxList rows={rows} />
              )}
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-5 @4xl/main:col-span-4">
            {account.type === "CASH_BOX" && (
              <DenominationAvailability
                userId={user.id}
                accountId={account.id}
                currency={account.currency}
              />
            )}

            <Card padding="none">
              <h2 className="px-4 pt-4 pb-1 text-sm font-semibold text-heading">
                Ajustes de la cuenta
              </h2>
              <div className="divide-y divide-line-2">
                <div className="px-4 py-2">
                  <AccountIconEditor
                    accountId={account.id}
                    icon={account.icon}
                    type={account.type}
                  />
                </div>
                {groups.length > 0 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex-none text-sm font-medium text-ink-soft">
                      Grupo
                    </span>
                    <GroupSelect
                      accountId={account.id}
                      groups={groups}
                      currentGroupId={account.groupId}
                    />
                  </div>
                )}
              </div>
            </Card>

            <AccountEditor
              accountId={account.id}
              name={account.name}
              archived={account.archived}
              hasUsage={ledger.length + countCount > 0}
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
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
