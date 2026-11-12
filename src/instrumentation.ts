// Fija la zona horaria del servidor a la de la app ANTES de atender ninguna
// petición. Vercel corre en UTC y casi todo el cálculo de fechas del servidor
// (límites de mes en métricas/filtros, «Vence hoy», formateo con
// Intl.DateTimeFormat) usa la zona del proceso: sin esto, lo registrado por
// la noche aparecía con fecha del día siguiente y caía en el mes equivocado.
//
// `TZ` es variable reservada en Vercel (no se puede definir en el panel),
// pero Node sí respeta asignarla en runtime. El middleware (edge) no hace
// cálculos de fecha, así que solo aplica al runtime de Node.
//
// Es una zona por INSTANCIA, no por usuario: los usuarios de Caja están en
// Cuba. Si algún día los hay en otras zonas habrá que pasar a una zona por
// usuario (cookie con la del navegador). Sin imports a propósito: este
// archivo se compila aparte y solo se evalúa al arrancar el servidor.
const DEFAULT_TIME_ZONE = "America/Havana";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
  }
}
