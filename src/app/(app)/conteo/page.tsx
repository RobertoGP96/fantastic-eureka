import Link from "next/link";
import { Banknote, ChevronRight } from "lucide-react";
import { getAccountIcon } from "@/lib/account-icons";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listAccountsWithBalances } from "@/lib/balances";
import { fmtMinor, fmtSignedMinor } from "@/lib/format";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ConteoPage() {
  const user = await requireSessionUser();
  const [accounts, counts] = await Promise.all([
    listAccountsWithBalances(user.id),
    prisma.cashCount.findMany({
      where: { userId: user.id },
      include: { account: { include: { currency: true } } },
      orderBy: { countedAt: "desc" },
      take: 10,
    }),
  ]);
  const cashAccounts = accounts.filter((account) => account.type === "CASH");

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Conteo de efectivo" backHref="/mas" />

      <div className="anim-fade-up flex flex-1 flex-col gap-6 px-5 pt-5 md:max-w-2xl md:px-0">
        {cashAccounts.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Sin cajas de efectivo"
            description="Crea una cuenta de tipo Efectivo para poder hacer arqueos."
            ctaLabel="Crear cuenta"
            ctaHref="/cuentas/nueva"
          />
        ) : (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Elige la caja a contar
            </h2>
            <div className="flex flex-col gap-2.5">
              {cashAccounts.map((account) => {
                const Icon = getAccountIcon(account.icon, account.type);
                return (
                <Link
                  key={account.id}
                  href={`/conteo/${account.id}`}
                  className="flex items-center gap-3.5 rounded-[18px] border border-line bg-white p-4 transition-colors hover:border-brand-soft"
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-chip text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-navy">
                      {account.name}
                    </div>
                    <div className="text-[11.5px] text-muted">
                      Saldo teórico:{" "}
                      {fmtMinor(account.balanceMinor, account.currency)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-2" />
                </Link>
                );
              })}
            </div>
          </section>
        )}

        {counts.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Arqueos recientes
            </h2>
            <div className="flex flex-col gap-2">
              {counts.map((count) => (
                <div
                  key={count.id}
                  className="flex items-center gap-3 rounded-[16px] border border-line bg-white px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-navy">
                      {count.account.name} ·{" "}
                      {fmtMinor(count.totalMinor, count.account.currency)}
                    </div>
                    <div className="text-[11.5px] text-muted">
                      {DATE_FMT.format(count.countedAt)}
                    </div>
                  </div>
                  {count.differenceMinor === 0 ? (
                    <Badge variant="ok">Cuadra</Badge>
                  ) : (
                    <Badge
                      variant={count.differenceMinor > 0 ? "warn" : "danger"}
                    >
                      {fmtSignedMinor(
                        count.differenceMinor,
                        count.account.currency
                      )}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
