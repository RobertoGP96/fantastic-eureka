import { redirect } from "next/navigation";
import { Clock, Eye, UserRound } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { TxList } from "@/components/tx-list";
import { AccountActivityChart } from "@/components/account-activity-chart";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { activityDeltas } from "@/lib/account-activity";
import { fmtMinor } from "@/lib/format";
import { toTxRow } from "@/lib/tx-rows";
import { resolveShareToken } from "@/lib/shares";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";

export const dynamic = "force-dynamic";

const EXPIRES_FMT = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
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

  return (
    <main className="flex flex-1 flex-col pb-4">
      <ScreenHeader
        title={account.name}
        actions={
          <span className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[10.5px] font-semibold">
            <Eye className="h-3.5 w-3.5" />
            Solo lectura
          </span>
        }
      >
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[11.5px] font-medium tracking-wide text-white/60 uppercase">
              Saldo actual
            </div>
            <div
              className={`mt-0.5 text-[26px] font-bold tracking-[-0.5px] ${
                balanceMinor < 0 ? "text-red-300" : ""
              }`}
            >
              {fmtMinor(balanceMinor, account.currency)}
            </div>
          </div>
          <Badge variant="neutral" className="mb-1.5 bg-white/15 text-white">
            {ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type}
          </Badge>
        </div>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-5 px-5 pt-5 md:px-0">
        <div className="flex flex-wrap gap-2 text-[11.5px] text-muted">
          <span className="flex items-center gap-1.5 rounded-[12px] border border-line bg-white px-3 py-1.5">
            <UserRound className="h-3.5 w-3.5 text-brand" />
            Compartida por{" "}
            <span className="font-semibold text-navy">{share.user.name}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-[12px] border border-line bg-white px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-gold" />
            Válido hasta{" "}
            <span className="font-semibold text-navy">
              {EXPIRES_FMT.format(share.expiresAt)}
            </span>
          </span>
        </div>

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
          <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
            Movimientos
            {transactions.length >= MAX_ROWS && (
              <span className="ml-2 text-[11.5px] font-medium text-muted">
                últimos {MAX_ROWS}
              </span>
            )}
          </h2>
          {rows.length === 0 ? (
            <div className="rounded-[16px] border border-line bg-white px-4 py-6 text-center text-[12.5px] text-muted">
              Sin movimientos todavía.
            </div>
          ) : (
            <TxList rows={rows} readOnly />
          )}
        </section>
      </div>
    </main>
  );
}
