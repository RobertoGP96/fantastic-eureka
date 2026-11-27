import { Skeleton } from "@/components/ui/skeleton";

// Fallback instantáneo para TODA navegación dentro de (app): sin él, con
// páginas force-dynamic el usuario no ve nada hasta que terminan las
// consultas a la BD. Imita la silueta genérica: cabecera plana, fila de KPIs
// y tarjetas.
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col pb-8">
      <div className="px-5 pt-4 md:px-0 md:pt-8">
        <div className="flex min-h-11 flex-col justify-center gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-5 md:px-0 md:pt-6">
        <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-28 w-full" />
        </div>
        <div className="rounded-2xl border border-line bg-card">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-line-2 px-4 py-3.5 last:border-b-0"
            >
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
