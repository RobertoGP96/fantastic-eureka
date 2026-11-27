import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TxList } from "@/components/tx-list";
import { AccountActivityChart } from "@/components/account-activity-chart";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { activityDeltas } from "@/lib/account-activity";
import { fmtMinorParts } from "@/lib/format";
import { toTxRow } from "@/lib/tx-rows";
import { resolveShareToken } from "@/lib/shares";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";

export const dynamic = "force-dynamic";

// «Válido hasta» en dos piezas: el día va como cifra de la tarjeta y la hora
// como su unidad atenuada (así cabe en media pantalla de móvil).
const EXPIRES_DAY_FMT = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
});
const EXPIRES_TIME_FMT = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

// Tope de movimientos listados en la vista compartida (el gráfico sí usa el
// libro mayor completo, como en el detalle privado).
const MAX_ROWS = 100;

/**
 * Vista pública de solo lectura de una cuenta: saldo actual, actividad y
 * movimientos. No hay sesión: el acceso lo da únicamente el código de la
 * URL, validado en resolveShareToken (existe, no caducó, no fue revocado).
 * Un código inválido manda a la portada de /compartir con aviso.
 */
export default async function CuentaCompartidaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await resolveShareToken(decodeURIComponent(token));
  if (!share) redirect("/compartir?invalido=1");

  const { account } = share;
  const touchesAccount = {
    userId: share.userId,
    OR: [{ accountId: account.id }, { counterAccountId: account.id }],
  };

  const [balanceMinor, transactions, ledger] = await Promise.all([
    accountBalanceMinor(account.id),
    prisma.transaction.findMany({
      where: touchesAccount,
      include: {
        account: { select: { name: true } },
        counterAccount: { select: { name: true } },
        currency: { select: { code: true, decimalPlaces: true } },
        counterCurrency: { select: { code: true, decimalPlaces: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: MAX_ROWS,
    }),
    prisma.transaction.findMany({
      where: touchesAccount,
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
  ]);

  const activity = activityDeltas(account.id, ledger);
  const rows = transactions.map((tx) =>
    toTxRow(tx, account.id, account.currency)
  );

  const balance = fmtMinorParts(balanceMinor, account.currency);
  const typeLabel =
    ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type;

  return (
    <Page>
      <ScreenHeader
        title={account.name}
        subtitle={`${typeLabel} · Compartida por ${share.user.name}`}
        actions={
          <Badge>
            <Eye className="size-3" />
            Solo lectura
          </Badge>
        }
      />

      <PageBody>
        <StatGrid cols={2}>
          <StatCard
            size="lg"
            label="Saldo actual"
            value={balance.amount}
            unit={balance.code}
            tone={balanceMinor < 0 ? "danger" : "default"}
          />
          <StatCard
            label="Válido hasta"
            value={EXPIRES_DAY_FMT.format(share.expiresAt)}
            unit={EXPIRES_TIME_FMT.format(share.expiresAt)}
          />
        </StatGrid>

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
          <SectionHeader
            title="Movimientos"
            action={
              transactions.length >= MAX_ROWS ? (
                <span className="text-xs text-muted">últimos {MAX_ROWS}</span>
              ) : undefined
            }
          />
          {rows.length === 0 ? (
            <Card className="py-6 text-center text-sm text-muted">
              Sin movimientos todavía.
            </Card>
          ) : (
            <TxList rows={rows} readOnly />
          )}
        </section>
      </PageBody>
    </Page>
  );
}
