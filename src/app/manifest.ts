import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

// Manifest PWA: permite instalar la app en la pantalla de inicio
// (iOS/Android) y abrirla a pantalla completa sin el chrome del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Cuentas, efectivo, tasas y deudas en un solo lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#c3d6d3",
    theme_color: "#c3d6d3",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
