import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { PlanForm } from "./plan-form";

export const dynamic = "force-dynamic";

export default async function NuevoPlanPage() {
  const user = await requireSessionUser();
  const [contacts, currencies, accounts] = await Promise.all([
    prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.currency.findMany({
      where: { userId: user.id, active: true },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
      select: { id: true, code: true },
    }),
    prisma.account.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, currencyId: true },
    }),
  ]);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Nueva mensualidad" backHref="/deudas" />
      <div className="anim-fade-up px-5 pt-5 md:max-w-md md:px-0">
        <PlanForm
          contacts={contacts}
          currencies={currencies}
          accounts={accounts}
        />
      </div>
    </main>
  );
}
