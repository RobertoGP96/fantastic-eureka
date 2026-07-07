import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { PlanForm } from "./plan-form";

export const dynamic = "force-dynamic";

export default async function NuevoPlanPage() {
  const [contacts, currencies] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.currency.findMany({
      where: { active: true },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
      select: { id: true, code: true },
    }),
  ]);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Nueva mensualidad" backHref="/deudas" />
      <div className="anim-fade-up px-5 pt-5 md:max-w-md md:px-0">
        <PlanForm contacts={contacts} currencies={currencies} />
      </div>
    </main>
  );
}
