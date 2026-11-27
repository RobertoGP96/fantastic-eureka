import { Skeleton } from "@/components/ui/skeleton";

// Siluetas de carga por tipo de vista. Cada sección tiene su `loading.tsx`
// con la que más se parece a su página: al navegar, el salto del skeleton
// al contenido real apenas mueve nada. Las clases de los contenedores son
// las de `Page`, `PageBody`, `CardGrid` y `SplitLayout`.

const BODY = "flex flex-1 flex-col gap-5 px-5 pt-5 md:px-0 md:pt-6";
const TILE = "rounded-2xl border border-line bg-card p-4";

function HeaderSkeleton() {
  return (
    <div className="px-5 pt-4 md:px-0 md:pt-8">
      <div className="flex min-h-11 flex-col justify-center gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 @2xl/main:grid-cols-2">
      {[0, 1].map((index) => (
        <div key={index} className={`flex flex-col gap-3 ${TILE}`}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}

function RowsSkeleton({ count }: { count: number }) {
  return (
    <div className="rounded-2xl border border-line bg-card">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-line-2 px-4 py-3.5 last:border-b-0"
        >
          <Skeleton className="size-9 flex-none rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20 flex-none" />
        </div>
      ))}
    </div>
  );
}

function TilesSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 @2xl/main:grid-cols-2 @4xl/main:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`flex flex-col gap-3 ${TILE}`}>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Lista (deudas, mensualidades, contactos, movimientos, catálogo…). */
export function ListSkeleton({
  tabs = false,
  filters = false,
  stats = false,
  tiles = false,
}: {
  /** Pestañas de sección (Deudas | Mensualidades | Contactos). */
  tabs?: boolean;
  /** Filtro segmentado sobre la lista. */
  filters?: boolean;
  /** Fila de tarjetas KPI. */
  stats?: boolean;
  /** Teselas en rejilla en vez de filas en una tarjeta. */
  tiles?: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col pb-8">
      <HeaderSkeleton />
      <div className={BODY}>
        {tabs && <Skeleton className="h-11 w-full rounded-lg md:w-80" />}
        {stats && <StatsSkeleton />}
        {filters && <Skeleton className="h-11 w-64 max-w-full rounded-lg" />}
        {tiles ? <TilesSkeleton count={6} /> : <RowsSkeleton count={5} />}
      </div>
    </main>
  );
}

/** Detalle en dos columnas (principal + lateral). */
export function DetailSkeleton({
  asideFirst = false,
}: {
  /** El lateral va antes del contenido cuando se apilan (móvil). */
  asideFirst?: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col pb-8">
      <HeaderSkeleton />
      <div className={BODY}>
        <div className="grid grid-cols-1 gap-5 @4xl/main:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 @4xl/main:col-span-8">
            <div className={TILE}>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-4 h-28 w-full" />
            </div>
            <RowsSkeleton count={3} />
          </div>
          <div
            className={`flex min-w-0 flex-col gap-5 @4xl/main:col-span-4 ${
              asideFirst ? "order-first @4xl/main:order-none" : ""
            }`}
          >
            <div className={`flex flex-col gap-3 ${TILE}`}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className={TILE}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-4 h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
