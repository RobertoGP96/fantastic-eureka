import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reusa la página en el cache del router del cliente durante 30 s al
    // navegar (ir/volver) en vez de re-renderizar en el servidor cada vez.
    // Seguro aquí: TODAS las server actions llaman revalidatePath, así que
    // cualquier mutación invalida este cache al instante.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
