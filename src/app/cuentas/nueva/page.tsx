import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { AccountForm } from "./account-form";

export const dynamic = "force-dynamic";

export default async function NuevaCuentaPage() {
  const currencies = await prisma.currency.findMany({
    where: { active: true },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
    select: { id: true, code: true, name: true },
  });

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Nueva cuenta" backHref="/cuentas" />
      <div className="anim-fade-up px-5 pt-5 md:max-w-md md:px-0">
        <AccountForm currencies={currencies} />
      </div>
    </main>
  );
}
