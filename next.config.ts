import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reusa la página en el cache del router del cliente durante 30 s al
    // navegar (ir/volver) en vez de re-renderizar en el servidor cada vez.
    // Seguro aquí: TODAS las server actions llaman revalidatePath, así que
    // cualquier mutación invalida este cache al instante.
    staleTimes: { dynamic: 30 },
  },
  // Los planes de cuotas dejaron de colgar de /deudas y viven en
  // /mensualidades; los enlaces viejos (marcadores, PWA) siguen funcionando.
  async redirects() {
    return [
      {
        source: "/deudas/plan/nuevo",
        destination: "/mensualidades/nueva",
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
