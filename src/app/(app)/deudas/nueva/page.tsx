import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { DebtForm } from "./debt-form";

export const dynamic = "force-dynamic";

export default async function NuevaDeudaPage() {
  const [contacts, currencies, accounts] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.currency.findMany({
      where: { active: true },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
      select: { id: true, code: true },
    }),
    prisma.account.findMany({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, currencyId: true },
    }),
  ]);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Nueva deuda" backHref="/deudas" />
      <div className="anim-fade-up px-5 pt-5 md:max-w-md md:px-0">
        <DebtForm
          contacts={contacts}
          currencies={currencies}
          accounts={accounts}
        />
      </div>
    </main>
  );
}
