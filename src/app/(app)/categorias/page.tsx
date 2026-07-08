import Link from "next/link";
import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { CategoryManager, type CategoryItem } from "./category-manager";

export const dynamic = "force-dynamic";

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireSessionUser();
  const { tipo } = await searchParams;
  const kind = tipo === "ingresos" ? "INCOME" : "EXPENSE";

  const categories = await prisma.category.findMany({
    where: { userId: user.id, kind },
    include: { _count: { select: { transactions: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const items: CategoryItem[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind,
    active: category.active,
    usageCount: category._count.transactions,
  }));

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Categorías" backHref="/mas" />

      <div className="anim-fade-up flex flex-col gap-4 px-5 pt-5 md:max-w-xl md:px-0">
        <div className="flex gap-2">
          <Link
            href="/categorias"
            className={`rounded-lg px-[11px] py-1.5 text-[11.5px] font-semibold transition-colors ${
              kind === "EXPENSE"
                ? "bg-brand text-white"
                : "bg-chip text-brand hover:bg-brand-soft/30"
            }`}
          >
            Gastos
          </Link>
          <Link
            href="/categorias?tipo=ingresos"
            className={`rounded-lg px-[11px] py-1.5 text-[11.5px] font-semibold transition-colors ${
              kind === "INCOME"
                ? "bg-brand text-white"
                : "bg-chip text-brand hover:bg-brand-soft/30"
            }`}
          >
            Ingresos
          </Link>
        </div>

        <CategoryManager kind={kind} categories={items} />
      </div>
    </main>
  );
}
