import { ScreenHeader } from "@/components/screen-header";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AccountForm } from "./account-form";

export const dynamic = "force-dynamic";

export default async function NuevaCuentaPage() {
  const user = await requireSessionUser();
  const [currencies, groups] = await Promise.all([
    prisma.currency.findMany({
      where: { active: true, userId: user.id },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
      select: { id: true, code: true, name: true },
    }),
    prisma.accountGroup.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Nueva cuenta" backHref="/cuentas" />
      <div className="anim-fade-up px-5 pt-5 md:max-w-md md:px-0">
        <AccountForm currencies={currencies} groups={groups} />
      </div>
    </main>
  );
}
