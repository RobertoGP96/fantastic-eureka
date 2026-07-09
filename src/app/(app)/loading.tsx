import { Skeleton } from "@/components/ui/skeleton";

// Fallback instantáneo para TODA navegación dentro de (app): sin él, con
// páginas force-dynamic el usuario no ve nada hasta que terminan las
// consultas a la BD. Imita la silueta genérica (header degradado + tarjetas).
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col pb-8">
      <div className="grad-header relative overflow-hidden rounded-b-[26px] px-5 pt-[22px] pb-6 md:mt-6 md:rounded-[26px] md:px-7 md:py-7">
        <Skeleton className="h-7 w-40 bg-white/20" />
        <Skeleton className="mt-4 h-4 w-56 bg-white/15" />
      </div>

      <div className="flex flex-col gap-4 px-5 pt-5 md:px-0">
        <div className="grid grid-cols-4 gap-3">
          <Skeleton className="h-16 rounded-2xl bg-chip" />
          <Skeleton className="h-16 rounded-2xl bg-chip" />
          <Skeleton className="h-16 rounded-2xl bg-chip" />
          <Skeleton className="h-16 rounded-2xl bg-chip" />
        </div>
        <Skeleton className="h-28 rounded-2xl bg-chip" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 rounded-2xl bg-chip" />
          <Skeleton className="h-14 rounded-2xl bg-chip" />
          <Skeleton className="h-14 rounded-2xl bg-chip" />
        </div>
      </div>
    </main>
  );
}
