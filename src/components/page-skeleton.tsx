import { Skeleton } from "@/components/ui/skeleton";

// Siluetas de carga por tipo de vista. Cada sección tiene su `loading.tsx`
// con la que más se parece a su página: al navegar, el salto del skeleton
// al contenido real apenas mueve nada. Las clases de los contenedores son
// las de `PageBody`, `CardGrid` y `SplitLayout` (src/components/page-body).

const BODY =
  "@container flex flex-1 flex-col gap-5 px-5 pt-5 md:px-0 md:pt-6";
const GRID =
  "grid grid-cols-1 gap-2.5 @2xl:grid-cols-2 @2xl:gap-3 @5xl:grid-cols-3";
const SPLIT =
  "grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:items-start @4xl:gap-6";

function HeaderSkeleton({
  back = false,
  stats = false,
}: {
  back?: boolean;
  stats?: boolean;
}) {
  return (
    <div className="grad-header relative overflow-clip rounded-b-3xl px-5 pt-5 pb-6 md:mt-6 md:rounded-3xl md:px-7 md:py-7">
      <div className="flex items-center gap-3">
        {back && <Skeleton className="size-10 rounded-xl bg-white/15" />}
        <Skeleton className="h-7 w-40 bg-white/20" />
      </div>
      {stats && (
        <>
          <Skeleton className="mt-4 h-3 w-20 bg-white/15" />
          <Skeleton className="mt-2 h-7 w-36 bg-white/20" />
        </>
      )}
      <Skeleton className="mt-4 h-4 w-28 bg-white/15" />
    </div>
  );
}

function Cards({ count, tall = false }: { count: number; tall?: boolean }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className={`rounded-2xl bg-chip ${tall ? "h-28" : "h-[74px]"}`}
        />
      ))}
    </div>
  );
}

/** Lista en rejilla (deudas, mensualidades, contactos, cuentas, catálogo). */
export function ListSkeleton({
  tabs = false,
  chips = false,
  stats = false,
  back = false,
  tall = false,
}: {
  /** Pestañas de sección (Deudas | Mensualidades | Contactos). */
  tabs?: boolean;
  chips?: boolean;
  stats?: boolean;
  back?: boolean;
  /** Tarjetas altas (con barra de progreso o badges). */
  tall?: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col pb-8">
      <HeaderSkeleton back={back} stats={stats} />
      <div className={BODY}>
        {tabs && (
          <Skeleton className="h-11 w-full rounded-xl bg-chip md:w-96" />
        )}
        {chips && (
          <div className="flex gap-1.5">
            <Skeleton className="h-9 w-16 rounded-lg bg-chip" />
            <Skeleton className="h-9 w-24 rounded-lg bg-chip" />
            <Skeleton className="h-9 w-24 rounded-lg bg-chip" />
          </div>
        )}
        <Cards count={6} tall={tall} />
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
      <HeaderSkeleton back stats />
      <div className={BODY}>
        <div className={SPLIT}>
          <div className="flex min-w-0 flex-col gap-3">
            <Skeleton className="h-5 w-40 bg-chip" />
            <Skeleton className="h-24 rounded-2xl bg-chip" />
            <Skeleton className="h-14 rounded-2xl bg-chip" />
            <Skeleton className="h-14 rounded-2xl bg-chip" />
          </div>
          <div
            className={`flex min-w-0 flex-col gap-3 ${
              asideFirst ? "order-first @4xl:order-none" : ""
            }`}
          >
            <Skeleton className="h-[52px] rounded-xl bg-chip" />
            <Skeleton className="h-16 rounded-2xl bg-chip" />
          </div>
        </div>
      </div>
    </main>
  );
}
