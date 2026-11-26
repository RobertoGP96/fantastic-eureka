import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reusa la página en el cache del router del cliente durante 30 s al
    // navegar (ir/volver) en vez de re-renderizar en el servidor cada vez.
    // Seguro aquí: TODAS las server actions llaman revalidatePath, así que
    // cualquier mutación invalida este cache al instante.
    staleTimes: { dynamic: 30 },
  },
  // Enlaces viejos (marcadores, PWA) que siguen funcionando:
  //  · los planes de cuotas dejaron de colgar de /deudas y viven en
  //    /mensualidades;
  //  · los formularios ya no tienen página propia: se abren en un drawer de
  //    su lista (`#panel=…`, ver src/hooks/use-panel.ts). El fragmento solo
  //    sobrevive a una navegación dura, así que NINGÚN enlace interno debe
  //    apuntar a estas rutas: usan `panelHref()` o `PanelButton`.
  async redirects() {
    return [
      {
        source: "/deudas/nueva",
        destination: "/deudas#panel=nueva-deuda",
        permanent: false,
      },
      {
        source: "/mensualidades/nueva",
        destination: "/mensualidades#panel=nueva-mensualidad",
        permanent: false,
      },
      {
        source: "/deudas/plan/nuevo",
        destination: "/mensualidades#panel=nueva-mensualidad",
        permanent: false,
      },
      {
        source: "/deudas/plan/:id",
        destination: "/mensualidades/:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
