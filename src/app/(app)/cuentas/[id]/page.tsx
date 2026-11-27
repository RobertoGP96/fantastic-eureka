import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Plus } from "lucide-react";
import { AccountActivityChart } from "@/components/account-activity-chart";
import { AccountEditForm } from "@/components/account-edit-form";
import { AccountManage } from "@/components/account-manage";
import { AccountSharePanel } from "@/components/account-share-panel";
import { SplitLayout } from "@/components/content-grid";
import { DenominationAvailability } from "@/components/denomination-availability";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { StatCard } from "@/components/stat-card";
import { TxList } from "@/components/tx-list";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth";
import { activeShareForAccount } from "@/lib/shares";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { activityDeltas } from "@/lib/account-activity";
import { getAccountIcon } from "@/lib/account-icons";
import { fmtMinorParts } from "@/lib/format";
import { toTxRow } from "@/lib/tx-rows";
import {
  ACCOUNT_TYPE_LABELS,
  isCashLikeType,
  type AccountType,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

/** Drawer de edición (`/cuentas/[id]#panel=editar-cuenta`). */
const EDIT_ACCOUNT_PANEL = "editar-cuenta";

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
      // Opciones del drawer «Editar cuenta».
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
  const Icon = getAccountIcon(account.icon, account.type);

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
        {/* Las columnas de SplitLayout y las tarjetas son <div>: el único
            <section> que envuelve «Movimientos recientes» es el suyo (lo
            exigen los tests). */}
        <SplitLayout
          main={
            <>
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

              <Section title="Movimientos recientes">
                {rows.length === 0 ? (
                  <Card className="py-6 text-center text-sm text-muted">
                    Sin movimientos todavía.
                  </Card>
                ) : (
                  <TxList rows={rows} />
                )}
              </Section>
            </>
          }
          aside={
            <>
              {account.type === "CASH_BOX" && (
                <DenominationAvailability
                  userId={user.id}
                  accountId={account.id}
                  currency={account.currency}
                />
              )}

              {/* Nombre, icono y grupo se cambian en el drawer «Editar
                  cuenta»; aquí solo se resume lo que hay. */}
              <AccountManage
                accountId={account.id}
                name={account.name}
                archived={account.archived}
                hasUsage={ledger.length + countCount > 0}
                editPanel={EDIT_ACCOUNT_PANEL}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-heading">
                      {account.currency.code} · {account.currency.name}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {account.group?.name ?? "Sin grupo"}
                    </div>
                  </div>
                </div>
              </AccountManage>

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

      {/* El drawer va por portal: no cuenta para el layout de <Page>. */}
      <PanelDrawer panel={EDIT_ACCOUNT_PANEL} title="Editar cuenta">
        <AccountEditForm
          accountId={account.id}
          name={account.name}
          icon={account.icon}
          groupId={account.groupId}
          groups={groups}
        />
      </PanelDrawer>
    </Page>
  );
}
