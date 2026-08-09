import { Archive } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { requireSessionUser } from "@/lib/auth";
import { listAccountsWithBalances } from "@/lib/balances";
import { AccountCard } from "../account-card";

export const dynamic = "force-dynamic";

export default async function CuentasArchivadasPage() {
  const user = await requireSessionUser();
  const accounts = (
    await listAccountsWithBalances(user.id, { includeArchived: true })
  ).filter((account) => account.archived);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Cuentas archivadas" backHref="/cuentas" />

      <div className="anim-fade-up flex flex-1 flex-col gap-5 px-5 pt-5 md:px-0">
        {accounts.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="Sin cuentas archivadas"
            description="Cuando archives una cuenta desde su detalle, aparecerá aquí con su historial intacto."
          />
        ) : (
          <>
            <p className="text-[12px] text-muted">
              Las cuentas archivadas conservan su historial y no aparecen al
              registrar movimientos. Entra al detalle para activarlas de nuevo.
            </p>
            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
