import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SegmentedLinks } from "@/components/ui/segmented";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { CategoryManager, type CategoryItem } from "./category-manager";

export const dynamic = "force-dynamic";

const KIND_TABS = [
  { value: "EXPENSE", label: "Gastos", href: "/categorias" },
  { value: "INCOME", label: "Ingresos", href: "/categorias?tipo=ingresos" },
] as const;

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
    <Page width="narrow">
      <ScreenHeader
        title="Categorías"
        subtitle="Categorías de gastos e ingresos"
        backHref="/mas"
      />

      <PageBody>
        {/* self-start: la pista se ajusta a sus dos opciones en vez de
            estirarse a todo el ancho de la columna. */}
        <SegmentedLinks
          ariaLabel="Tipo de categoría"
          className="self-start"
          options={KIND_TABS}
          current={kind}
        />

        <CategoryManager kind={kind} categories={items} />
      </PageBody>
    </Page>
  );
}
