import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Plus } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { TxList } from "@/components/tx-list";
import { GroupSelect } from "@/components/group-select";
import { AccountIconEditor } from "@/components/account-icon-editor";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { fmtMinor } from "@/lib/format";
import { toTxRow } from "@/lib/tx-rows";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";

export const dynamic = "force-dynamic";

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

  const [balanceMinor, transactions, groups] = await Promise.all([
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
        category: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 30,
    }),
    prisma.accountGroup.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = transactions.map((tx) =>
    toTxRow(tx, account.id, account.currency)
  );

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={account.name} backHref="/cuentas">
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
            {account.archived ? " · Archivada" : ""}
          </Badge>
        </div>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-5 px-5 pt-5 md:max-w-2xl md:px-0">
        <div className="flex gap-2.5">
          <Link
            href={`/registrar?cuenta=${account.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-[13px] bg-brand py-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-mid"
          >
            <Plus className="h-4 w-4" />
            Registrar
          </Link>
          {account.type === "CASH" && (
            <Link
              href={`/conteo/${account.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-[13px] border border-line bg-white py-3 text-[13px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
            >
              <Banknote className="h-4 w-4" />
              Arqueo
            </Link>
          )}
        </div>

        <div className="rounded-[16px] border border-line bg-white px-4 py-3">
          <AccountIconEditor
            accountId={account.id}
            icon={account.icon}
            type={account.type}
          />
        </div>

        {groups.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-[16px] border border-line bg-white px-4 py-2.5">
            <span className="text-[12.5px] font-semibold text-ink-soft">
              Grupo
            </span>
            <GroupSelect
              accountId={account.id}
              groups={groups}
              currentGroupId={account.groupId}
            />
          </div>
        )}

        <section>
          <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
            Movimientos recientes
          </h2>
          {rows.length === 0 ? (
            <div className="rounded-[16px] border border-line bg-white px-4 py-6 text-center text-[12.5px] text-muted">
              Sin movimientos todavía.
            </div>
          ) : (
            <TxList rows={rows} />
          )}
        </section>
      </div>
    </main>
  );
}
